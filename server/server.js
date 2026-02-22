process.env.TZ = 'Asia/Tashkent';

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const { getDb, initDb } = require('./database');
const { generateToken, authMiddleware, superAdminMiddleware } = require('./auth');

initDb();

function nowLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logActivity(db, adminName, action, description, roomNumber, amount) {
  try {
    db.prepare(
      'INSERT INTO activity_logs (admin_name, action, description, room_number, amount) VALUES (?, ?, ?, ?, ?)'
    ).run(adminName, action, description, roomNumber || null, amount || null);
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
}

// Validation helpers
function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

function isValidMonth(str) {
  return /^\d{4}-\d{2}$/.test(str);
}

function isDayClosed(db, dateStr) {
  const dateOnly = dateStr.split('T')[0];
  const row = db.prepare('SELECT date FROM daily_reports WHERE date = ?').get(dateOnly);
  return !!row;
}

function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
    .trim()
    .slice(0, maxLen);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting for login
const loginAttempts = new Map();
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return true;
  // Clean old entries
  if (now - record.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.delete(ip);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now - record.firstAttempt > LOGIN_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
}

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : undefined;

app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '2mb' }));

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// ============ AUTH ============
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username va parol kerak' });
  }

  const db = getDb();
  try {
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      recordAttempt(ip);
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
    }

    const token = generateToken(admin);
    res.json({ token, admin: { id: admin.id, name: admin.name, username: admin.username, role: admin.role || 'admin' } });
  } finally {
    db.close();
  }
});

// ============ ADMINS (super_admin only) ============
app.get('/api/admins', authMiddleware, superAdminMiddleware, (req, res) => {
  const db = getDb();
  try {
    const admins = db.prepare('SELECT id, name, username, role, created_at FROM admins ORDER BY id').all();
    res.json(admins);
  } finally {
    db.close();
  }
});

app.post('/api/admins', authMiddleware, superAdminMiddleware, (req, res) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Ism, username va parol kerak' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Parol kamida 4 belgi bo\'lishi kerak' });
  }
  const adminRole = role === 'super_admin' ? 'super_admin' : 'admin';
  const hash = bcrypt.hashSync(password, 12);
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO admins (name, username, password, role) VALUES (?, ?, ?, ?)').run(sanitizeString(name, 100), sanitizeString(username, 50), hash, adminRole);
    const admin = db.prepare('SELECT id, name, username, role, created_at FROM admins WHERE id = ?').get(result.lastInsertRowid);
    logActivity(db, req.admin.name, 'admin_create', `Yangi admin yaratildi: ${username}`, null, null);
    res.json(admin);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu username allaqachon mavjud' });
    }
    return res.status(500).json({ error: 'Xatolik yuz berdi' });
  } finally {
    db.close();
  }
});

app.delete('/api/admins/:id', authMiddleware, superAdminMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Noto\'g\'ri ID' });
  }
  if (req.admin.id === id) {
    return res.status(400).json({ error: "O'zingizni o'chira olmaysiz" });
  }
  const db = getDb();
  try {
    const admin = db.prepare('SELECT id, name FROM admins WHERE id = ?').get(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin topilmadi' });
    }
    // Close any open shifts for this admin
    db.prepare('UPDATE shifts SET end_time = ?, closed = 1, notes = ? WHERE admin_name = ? AND closed = 0').run(
      nowLocal(), 'Admin o\'chirilgani sababli avtomatik yopildi', admin.name
    );
    db.prepare('DELETE FROM admins WHERE id = ?').run(id);
    logActivity(db, req.admin.name, 'admin_delete', `Admin o'chirildi: ${admin.name}`, null, null);
    res.json({ success: true });
  } finally {
    db.close();
  }
});

// ============ PASSWORD CHANGE ============
app.put('/api/admins/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Eski va yangi parol kerak' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'Yangi parol kamida 4 belgi bo\'lishi kerak' });
  }
  const db = getDb();
  try {
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Admin topilmadi' });
    if (!bcrypt.compareSync(oldPassword, admin.password)) {
      return res.status(400).json({ error: 'Eski parol noto\'g\'ri' });
    }
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hash, req.admin.id);
    logActivity(db, req.admin.name, 'password_change', 'Parol o\'zgartirildi', null, null);
    res.json({ success: true });
  } finally {
    db.close();
  }
});

// ============ ROOMS ============
app.get('/api/rooms', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const rooms = db.prepare('SELECT * FROM rooms ORDER BY number').all();
    res.json(rooms);
  } finally {
    db.close();
  }
});

app.put('/api/rooms/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = getDb();

  try {
    // Check room exists
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Xona topilmadi' });
    }

    // Validate status transitions
    const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance', 'booked'];
    if (updates.status && !validStatuses.includes(updates.status)) {
      return res.status(400).json({ error: 'Noto\'g\'ri xona holati' });
    }

    // Validate price
    if (updates.price_per_night !== undefined && (typeof updates.price_per_night !== 'number' || updates.price_per_night < 0)) {
      return res.status(400).json({ error: 'Narx 0 dan kam bo\'lmasligi kerak' });
    }

    const fields = [];
    const values = [];
    const allowed = ['status', 'guest_name', 'guest_passport', 'guest_phone', 'check_in', 'check_out', 'price_per_night', 'notes', 'booking_id'];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    logActivity(db, req.admin.name, 'room_update', `Xona ${existing.number} yangilandi: ${updates.status || 'ma\'lumot'}`, existing.number, null);
    res.json(room);
  } finally {
    db.close();
  }
});

// ============ TRANSACTIONS ============
app.get('/api/transactions', authMiddleware, (req, res) => {
  const { date, type } = req.query;
  const db = getDb();
  try {
    let query = 'SELECT * FROM transactions';
    const conditions = [];
    const params = [];

    if (date) {
      if (!isValidDate(date)) return res.status(400).json({ error: 'Noto\'g\'ri sana formati' });
      conditions.push('date(date) = ?');
      params.push(date);
    }
    if (type) {
      if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Noto\'g\'ri tur' });
      conditions.push('type = ?');
      params.push(type);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date DESC';

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } finally {
    db.close();
  }
});

app.post('/api/transactions', authMiddleware, (req, res) => {
  const { type, category, amount, description, room_number, shift_id, date } = req.body;

  // Validation
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Tur (type) kirim yoki chiqim bo\'lishi kerak' });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'Kategoriya kerak' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Summa 0 dan katta bo\'lishi kerak' });
  }
  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'Tavsif kerak' });
  }

  const db = getDb();
  try {
    const txDate = date || nowLocal();

    // Check if the date's day is closed
    if (isDayClosed(db, txDate)) {
      return res.status(403).json({ error: 'Bu kun yopilgan. Yopilgan kunga tranzaksiya qo\'shib bo\'lmaydi.' });
    }

    const cleanDesc = sanitizeString(description);
    const cleanCat = sanitizeString(category, 100);

    // Use transaction for atomicity
    const insertTx = db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO transactions (type, category, amount, description, room_number, admin_name, shift_id, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(type, cleanCat, amount, cleanDesc, room_number || null, req.admin.name, shift_id || null, txDate);

      // Update shift totals atomically
      if (shift_id) {
        if (type === 'income') {
          db.prepare('UPDATE shifts SET total_income = total_income + ? WHERE id = ?').run(amount, shift_id);
        } else {
          db.prepare('UPDATE shifts SET total_expense = total_expense + ? WHERE id = ?').run(amount, shift_id);
        }
      }

      return result.lastInsertRowid;
    });

    const rowId = insertTx();
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(rowId);
    logActivity(db, req.admin.name, 'transaction_add', `${type}: ${cleanDesc} - ${amount}`, room_number || null, amount);
    res.json(tx);
  } finally {
    db.close();
  }
});

app.delete('/api/transactions/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Noto\'g\'ri ID' });

  const db = getDb();
  try {
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!tx) return res.status(404).json({ error: 'Tranzaksiya topilmadi' });

    // Check if the transaction's day is closed
    if (isDayClosed(db, tx.date)) {
      return res.status(403).json({ error: 'Bu kun yopilgan. Yopilgan kundagi tranzaksiyani o\'chirib bo\'lmaydi.' });
    }

    // Super admin can delete any, regular admin only their own
    if (req.admin.role !== 'super_admin' && tx.admin_name !== req.admin.name) {
      return res.status(403).json({ error: 'Faqat o\'z tranzaksiyangizni o\'chira olasiz' });
    }

    const doDelete = db.transaction(() => {
      // Reverse shift totals
      if (tx.shift_id) {
        if (tx.type === 'income') {
          db.prepare('UPDATE shifts SET total_income = MAX(0, total_income - ?) WHERE id = ?').run(tx.amount, tx.shift_id);
        } else {
          db.prepare('UPDATE shifts SET total_expense = MAX(0, total_expense - ?) WHERE id = ?').run(tx.amount, tx.shift_id);
        }
      }
      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
    });

    doDelete();
    logActivity(db, req.admin.name, 'transaction_delete', `Tranzaksiya o'chirildi: ${tx.description} - ${tx.amount}`, tx.room_number, tx.amount);
    res.json({ success: true });
  } finally {
    db.close();
  }
});

app.put('/api/transactions/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Noto\'g\'ri ID' });

  const { description, amount, category } = req.body;
  const db = getDb();
  try {
    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    if (!tx) return res.status(404).json({ error: 'Tranzaksiya topilmadi' });

    // Check if the transaction's day is closed
    if (isDayClosed(db, tx.date)) {
      return res.status(403).json({ error: 'Bu kun yopilgan. Yopilgan kundagi tranzaksiyani tahrirlash mumkin emas.' });
    }

    if (req.admin.role !== 'super_admin' && tx.admin_name !== req.admin.name) {
      return res.status(403).json({ error: 'Faqat o\'z tranzaksiyangizni tahrirlash mumkin' });
    }

    const doUpdate = db.transaction(() => {
      const newAmount = (typeof amount === 'number' && amount > 0) ? amount : tx.amount;
      const amountDiff = newAmount - tx.amount;

      // Adjust shift totals if amount changed
      if (amountDiff !== 0 && tx.shift_id) {
        if (tx.type === 'income') {
          db.prepare('UPDATE shifts SET total_income = MAX(0, total_income + ?) WHERE id = ?').run(amountDiff, tx.shift_id);
        } else {
          db.prepare('UPDATE shifts SET total_expense = MAX(0, total_expense + ?) WHERE id = ?').run(amountDiff, tx.shift_id);
        }
      }

      const fields = [];
      const values = [];
      if (description !== undefined) { fields.push('description = ?'); values.push(sanitizeString(description)); }
      if (typeof amount === 'number' && amount > 0) { fields.push('amount = ?'); values.push(amount); }
      if (category !== undefined) { fields.push('category = ?'); values.push(sanitizeString(category, 100)); }

      if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }
    });

    doUpdate();
    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    logActivity(db, req.admin.name, 'transaction_edit', `Tranzaksiya tahrirlandi: ${updated.description} - ${updated.amount}`, updated.room_number, updated.amount);
    res.json(updated);
  } finally {
    db.close();
  }
});

// ============ SHIFTS ============
app.get('/api/shifts', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const shifts = db.prepare(`
      SELECT s.* FROM shifts s
      LEFT JOIN admins a ON s.admin_name = a.name
      WHERE s.start_time >= datetime('now', '-30 days', 'localtime')
        AND (a.role IS NULL OR a.role != 'super_admin')
      ORDER BY s.start_time DESC
    `).all();
    res.json(shifts);
  } finally {
    db.close();
  }
});

app.post('/api/shifts', authMiddleware, (req, res) => {
  const id = Date.now().toString();
  const db = getDb();
  try {
    db.prepare('INSERT INTO shifts (id, admin_name, start_time) VALUES (?, ?, ?)').run(id, req.admin.name, nowLocal());
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
    logActivity(db, req.admin.name, 'shift_start', 'Smena boshlandi', null, null);
    res.json(shift);
  } finally {
    db.close();
  }
});

app.put('/api/shifts/:id/close', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const db = getDb();
  try {
    db.prepare('UPDATE shifts SET end_time = ?, notes = ?, closed = 1 WHERE id = ?').run(nowLocal(), sanitizeString(notes || ''), id);
    const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(id);
    logActivity(db, req.admin.name, 'shift_close', `Smena yopildi. Kirim: ${shift.total_income}, Chiqim: ${shift.total_expense}`, null, null);
    res.json(shift);
  } finally {
    db.close();
  }
});

// ============ BOOKINGS ============
app.get('/api/bookings', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const bookings = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    res.json(bookings);
  } finally {
    db.close();
  }
});

app.post('/api/bookings', authMiddleware, (req, res) => {
  const { room_number, guest_name, guest_phone, check_in_date, check_out_date, nights, notes, prepayment } = req.body;

  // Validation
  if (!room_number || !guest_name || !guest_phone || !check_in_date) {
    return res.status(400).json({ error: 'Xona, ism, telefon va kelish sanasi kerak' });
  }
  if (!isValidDate(check_in_date)) {
    return res.status(400).json({ error: 'Noto\'g\'ri kelish sanasi' });
  }
  if (check_out_date && !isValidDate(check_out_date)) {
    return res.status(400).json({ error: 'Noto\'g\'ri ketish sanasi' });
  }
  if (check_out_date && check_out_date <= check_in_date) {
    return res.status(400).json({ error: 'Ketish sanasi kelish sanasidan keyin bo\'lishi kerak' });
  }
  const nightCount = Math.max(1, Number(nights) || 1);

  const id = Date.now().toString();
  const db = getDb();
  try {
    // Atomic: check room + insert booking + update room (prevents TOCTOU)
    const doBooking = db.transaction(() => {
      const room = db.prepare('SELECT * FROM rooms WHERE number = ?').get(room_number);
      if (!room) throw new Error('NOT_FOUND:Xona topilmadi');
      if (room.status !== 'available') throw new Error(`CONFLICT:Xona ${room_number} hozir band (${room.status}). Faqat bo'sh xonaga bron qilish mumkin.`);

      const prepaymentAmount = Number(prepayment) || 0;

      db.prepare(
        'INSERT INTO bookings (id, room_number, guest_name, guest_phone, check_in_date, check_out_date, nights, notes, created_by, prepayment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, room_number, sanitizeString(guest_name, 200), sanitizeString(guest_phone, 30), check_in_date, check_out_date || null, nightCount, sanitizeString(notes || ''), req.admin.name, prepaymentAmount);

      db.prepare('UPDATE rooms SET status = ?, guest_name = ?, guest_phone = ?, check_out = ?, booking_id = ?, notes = ? WHERE number = ?').run(
        'booked', sanitizeString(guest_name, 200), sanitizeString(guest_phone, 30), check_in_date, id, `Bron: ${check_in_date} dan`, room_number
      );

      // Oldindan to'lovni kirimga qo'shish
      if (prepaymentAmount > 0) {
        const txDate = nowLocal();
        const shift_id = req.body.shift_id || null;
        db.prepare(
          'INSERT INTO transactions (type, category, amount, description, room_number, admin_name, shift_id, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run('income', 'Oldindan to\'lov', prepaymentAmount, `${room_number}-xona, ${sanitizeString(guest_name, 200)} - oldindan to'lov (bron)`, room_number, req.admin.name, shift_id, txDate);

        if (shift_id) {
          db.prepare('UPDATE shifts SET total_income = total_income + ? WHERE id = ?').run(prepaymentAmount, shift_id);
        }
      }
    });

    try {
      doBooking();
    } catch (e) {
      if (e.message.startsWith('NOT_FOUND:')) return res.status(404).json({ error: e.message.slice(10) });
      if (e.message.startsWith('CONFLICT:')) return res.status(400).json({ error: e.message.slice(9) });
      throw e;
    }
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    logActivity(db, req.admin.name, 'booking_create', `Bron: ${room_number}-xona, ${guest_name}`, room_number, null);
    res.json(booking);
  } finally {
    db.close();
  }
});

app.put('/api/bookings/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { guest_name, guest_phone, check_in_date, check_out_date, nights, room_number, notes, prepayment } = req.body;
  const db = getDb();
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Bron topilmadi' });
    if (booking.status !== 'active') return res.status(400).json({ error: 'Faqat faol bronni tahrirlash mumkin' });

    const doEdit = db.transaction(() => {
      const newRoomNumber = room_number || booking.room_number;

      // If room changed, release old room and book new one
      if (room_number && room_number !== booking.room_number) {
        // Release old room
        db.prepare('UPDATE rooms SET status = ?, guest_name = NULL, guest_phone = NULL, check_out = NULL, booking_id = NULL, notes = NULL WHERE number = ?')
          .run('available', booking.room_number);

        // Check new room is available
        const newRoom = db.prepare('SELECT * FROM rooms WHERE number = ?').get(room_number);
        if (!newRoom) throw new Error('NOT_FOUND:Xona topilmadi');
        if (newRoom.status !== 'available') throw new Error(`CONFLICT:Xona ${room_number} band (${newRoom.status})`);

        // Book new room
        const gn = guest_name ? sanitizeString(guest_name, 200) : booking.guest_name;
        const gp = guest_phone ? sanitizeString(guest_phone, 30) : booking.guest_phone;
        const ci = check_in_date || booking.check_in_date;
        db.prepare('UPDATE rooms SET status = ?, guest_name = ?, guest_phone = ?, check_out = ?, booking_id = ?, notes = ? WHERE number = ?')
          .run('booked', gn, gp, ci, id, `Bron: ${ci} dan`, room_number);
      } else {
        // Update current room info
        const gn = guest_name ? sanitizeString(guest_name, 200) : booking.guest_name;
        const gp = guest_phone ? sanitizeString(guest_phone, 30) : booking.guest_phone;
        const ci = check_in_date || booking.check_in_date;
        db.prepare('UPDATE rooms SET guest_name = ?, guest_phone = ?, check_out = ?, notes = ? WHERE number = ?')
          .run(gn, gp, ci, `Bron: ${ci} dan`, booking.room_number);
      }

      // Update booking
      const fields = [];
      const values = [];
      if (guest_name) { fields.push('guest_name = ?'); values.push(sanitizeString(guest_name, 200)); }
      if (guest_phone) { fields.push('guest_phone = ?'); values.push(sanitizeString(guest_phone, 30)); }
      if (check_in_date) { fields.push('check_in_date = ?'); values.push(check_in_date); }
      if (check_out_date !== undefined) { fields.push('check_out_date = ?'); values.push(check_out_date || null); }
      if (nights) { fields.push('nights = ?'); values.push(Math.max(1, Number(nights) || 1)); }
      if (room_number) { fields.push('room_number = ?'); values.push(room_number); }
      if (notes !== undefined) { fields.push('notes = ?'); values.push(sanitizeString(notes || '')); }
      if (prepayment !== undefined) { fields.push('prepayment = ?'); values.push(Number(prepayment) || 0); }

      if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }
    });

    try {
      doEdit();
    } catch (e) {
      if (e.message.startsWith('NOT_FOUND:')) return res.status(404).json({ error: e.message.slice(10) });
      if (e.message.startsWith('CONFLICT:')) return res.status(400).json({ error: e.message.slice(9) });
      throw e;
    }

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    logActivity(db, req.admin.name, 'booking_edit', `Bron tahrirlandi: ${updated.room_number}-xona, ${updated.guest_name}`, updated.room_number, null);
    res.json(updated);
  } finally {
    db.close();
  }
});

app.put('/api/bookings/:id/cancel', authMiddleware, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Bron topilmadi' });
    if (booking.status !== 'active') return res.status(400).json({ error: 'Faqat faol bronni bekor qilish mumkin' });

    // Atomic cancel
    const doCancel = db.transaction(() => {
      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', id);
      db.prepare('UPDATE rooms SET status = ?, guest_name = NULL, guest_phone = NULL, check_out = NULL, booking_id = NULL, notes = NULL WHERE number = ?').run('available', booking.room_number);

      // Oldindan to'lovni qaytarish (chiqimga yozish)
      if (booking.prepayment > 0) {
        const txDate = nowLocal();
        const shift_id = req.body.shift_id || null;
        db.prepare(
          'INSERT INTO transactions (type, category, amount, description, room_number, admin_name, shift_id, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run('expense', 'Bron qaytarish', booking.prepayment, `${booking.room_number}-xona, ${booking.guest_name} - oldindan to'lov qaytarildi (bron bekor)`, booking.room_number, req.admin.name, shift_id, txDate);

        if (shift_id) {
          db.prepare('UPDATE shifts SET total_expense = total_expense + ? WHERE id = ?').run(booking.prepayment, shift_id);
        }
      }
    });

    doCancel();
    logActivity(db, req.admin.name, 'booking_cancel', `Bron bekor qilindi: ${booking.room_number}-xona, ${booking.guest_name}`, booking.room_number, booking.prepayment || null);
    res.json({ success: true });
  } finally {
    db.close();
  }
});

app.put('/api/bookings/:id/checkin', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { passport, nights, date, total_price } = req.body;
  const db = getDb();
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) return res.status(404).json({ error: 'Bron topilmadi' });
    if (booking.status !== 'active') return res.status(400).json({ error: 'Faqat faol brondan joylashtirish mumkin' });

    const room = db.prepare('SELECT * FROM rooms WHERE number = ?').get(booking.room_number);
    if (!room) return res.status(404).json({ error: 'Xona topilmadi' });

    const nightCount = Math.max(1, Number(nights) || 1);
    const fullTotal = (typeof total_price === 'number' && total_price > 0) ? total_price : (nightCount * room.price_per_night);
    const prepaid = booking.prepayment || 0;
    const remaining = Math.max(0, fullTotal - prepaid);

    // Chiqish sanasini hisoblash
    const checkInTime = date ? new Date(date) : new Date();
    checkInTime.setDate(checkInTime.getDate() + nightCount);
    const pad = (n) => String(n).padStart(2, '0');
    const checkOutDate = booking.check_out_date || `${checkInTime.getFullYear()}-${pad(checkInTime.getMonth() + 1)}-${pad(checkInTime.getDate())}`;

    const shift_id = req.body.shift_id || null;
    const txDate = date || nowLocal();

    // Atomic: update booking + room + transaction + shift
    const doCheckIn = db.transaction(() => {
      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('checked_in', id);

      db.prepare('UPDATE rooms SET status = ?, guest_name = ?, guest_phone = ?, guest_passport = ?, check_in = ?, check_out = ?, booking_id = NULL, notes = NULL WHERE number = ?').run(
        'occupied', booking.guest_name, booking.guest_phone, sanitizeString(passport || ''), nowLocal(), checkOutDate, booking.room_number
      );

      // Faqat qoldiq to'lovni kirimga qo'shish (oldindan to'lov allaqachon bron paytida kirimga yozilgan)
      if (remaining > 0) {
        db.prepare('INSERT INTO transactions (type, category, amount, description, room_number, admin_name, shift_id, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          'income', 'Xona to\'lovi', remaining, `${booking.room_number}-xona, ${booking.guest_name}, ${nightCount} kecha (bron, qoldiq to'lov)`, booking.room_number, req.admin.name, shift_id, txDate
        );

        if (shift_id) {
          db.prepare('UPDATE shifts SET total_income = total_income + ? WHERE id = ?').run(remaining, shift_id);
        }
      }
    });

    doCheckIn();
    logActivity(db, req.admin.name, 'checkin_from_booking', `Brondan joylashtirish: ${booking.room_number}-xona, ${booking.guest_name}, jami: ${fullTotal}, oldindan: ${prepaid}, qoldiq: ${remaining} so'm`, booking.room_number, fullTotal);
    res.json({ success: true, remaining, fullTotal, prepaid });
  } finally {
    db.close();
  }
});

// ============ STATISTICS ============
app.get('/api/statistics', authMiddleware, (req, res) => {
  const db = getDb();
  try {
    const monthlyData = db.prepare(`
      SELECT
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month
    `).all();

    const topRooms = db.prepare(`
      SELECT room_number, SUM(amount) as revenue, COUNT(*) as count
      FROM transactions
      WHERE type = 'income' AND room_number IS NOT NULL AND room_number != ''
      GROUP BY room_number
      ORDER BY revenue DESC
      LIMIT 10
    `).all();

    const expenseCategories = db.prepare(`
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type = 'expense'
      GROUP BY category
      ORDER BY total DESC
    `).all();

    const dailyActivity = db.prepare(`
      SELECT
        date(date) as day,
        COUNT(*) as check_ins,
        0 as check_outs
      FROM transactions
      WHERE type = 'income' AND category = 'Xona to''lovi' AND date >= date('now', '-30 days')
      GROUP BY date(date)
      ORDER BY day
    `).all();

    const roomStatuses = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM rooms
      GROUP BY status
    `).all();

    const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get();

    // Weekly data (last 4 weeks)
    const weeklyData = db.prepare(`
      SELECT
        CAST((julianday('now', 'localtime') - julianday(date)) / 7 AS INTEGER) as weeks_ago,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE date >= date('now', '-28 days')
      GROUP BY weeks_ago
      ORDER BY weeks_ago DESC
    `).all();

    // Income categories for pie chart
    const incomeCategories = db.prepare(`
      SELECT category, SUM(amount) as total
      FROM transactions
      WHERE type = 'income'
      GROUP BY category
      ORDER BY total DESC
    `).all();

    // KPIs
    const kpiData = db.prepare(`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense,
        COUNT(CASE WHEN type = 'income' AND category = 'Xona to''lovi' THEN 1 END) as totalCheckins
      FROM transactions
    `).get();

    const monthCount = db.prepare(`
      SELECT COUNT(DISTINCT strftime('%Y-%m', date)) as months FROM transactions
    `).get();

    const avgMonthlyRevenue = monthCount.months > 0 ? Math.round(kpiData.totalRevenue / monthCount.months) : 0;

    const occupiedCount = db.prepare(`SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'`).get();
    const currentOccupancy = totalRooms.count > 0 ? Math.round((occupiedCount.count / totalRooms.count) * 100) : 0;

    res.json({
      monthlyData,
      topRooms,
      expenseCategories,
      dailyActivity,
      roomStatuses,
      totalRooms: totalRooms.count,
      weeklyData,
      incomeCategories,
      kpi: {
        totalRevenue: kpiData.totalRevenue || 0,
        totalExpense: kpiData.totalExpense || 0,
        totalCheckins: kpiData.totalCheckins || 0,
        avgMonthlyRevenue,
        currentOccupancy,
      },
    });
  } finally {
    db.close();
  }
});

// ============ REPORTS ============
app.get('/api/reports/daily/:date', authMiddleware, (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Noto\'g\'ri sana formati (YYYY-MM-DD)' });
  }
  const db = getDb();
  try {
    const transactions = db.prepare('SELECT * FROM transactions WHERE date(date) = ? ORDER BY date').all(date);
    const shifts = db.prepare('SELECT * FROM shifts WHERE date(start_time) = ?').all(date);
    const rooms = db.prepare('SELECT * FROM rooms').all();

    res.json({ date, transactions, shifts, rooms });
  } finally {
    db.close();
  }
});

// ============ DAILY REPORT CLOSE ============
app.post('/api/reports/daily/:date/close', authMiddleware, (req, res) => {
  const { date } = req.params;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Noto\'g\'ri sana formati' });
  }
  const { report_text } = req.body;
  if (!report_text) {
    return res.status(400).json({ error: 'report_text kerak' });
  }
  const db = getDb();
  try {
    // Calculate day totals from transactions
    const totals = db.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
       FROM transactions WHERE date(date) = ?`
    ).get(date);

    db.prepare(
      'INSERT OR REPLACE INTO daily_reports (date, report_text, admin_name, closed_at, total_income, total_expense) VALUES (?, ?, ?, datetime(\'now\', \'localtime\'), ?, ?)'
    ).run(date, report_text, req.admin.name, totals.total_income, totals.total_expense);
    const row = db.prepare('SELECT * FROM daily_reports WHERE date = ?').get(date);
    logActivity(db, req.admin.name, 'day_close', `Kun yopildi: ${date}`, null, null);
    res.json(row);
  } finally {
    db.close();
  }
});

app.get('/api/reports/closed-dates', authMiddleware, (req, res) => {
  const { month } = req.query;
  const db = getDb();
  try {
    let rows;
    if (month) {
      if (!isValidMonth(month)) return res.status(400).json({ error: 'Noto\'g\'ri oy formati (YYYY-MM)' });
      rows = db.prepare('SELECT date, admin_name, closed_at, report_text, total_income, total_expense FROM daily_reports WHERE date LIKE ? ORDER BY date').all(month + '%');
    } else {
      rows = db.prepare('SELECT date, admin_name, closed_at, total_income, total_expense FROM daily_reports ORDER BY date DESC').all();
    }
    res.json(rows);
  } finally {
    db.close();
  }
});

// ============ GITHUB WEBHOOK ============
app.post('/webhook/github', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error('WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'No signature' });
  }

  const body = req.body;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(body);
  const event = req.headers['x-github-event'];

  if (event !== 'push' || payload.ref !== 'refs/heads/main') {
    return res.status(200).json({ message: 'Ignored' });
  }

  console.log(`[Deploy] Push to main by ${payload.pusher?.name || 'unknown'}, starting deploy...`);

  const scriptPath = path.join(__dirname, '../deploy.sh');
  exec(`bash ${scriptPath}`, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
    if (error) {
      console.error('[Deploy] Error:', error.message);
      console.error('[Deploy] Stderr:', stderr);
    } else {
      console.log('[Deploy] Success:', stdout);
    }
  });

  res.status(200).json({ message: 'Deploy started' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Samo Hotel server v1.1 running on http://localhost:${PORT}`);
});
