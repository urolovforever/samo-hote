process.env.TZ = 'Asia/Tashkent';

const bcrypt = require('bcryptjs');
const { getDb, initDb } = require('./database');

initDb();
const db = getDb();

// Remove old admins, keep only super admin
db.prepare('DELETE FROM admins').run();

// Seed super admin only
const hash = bcrypt.hashSync('1234', 12);
db.prepare('INSERT OR IGNORE INTO admins (name, username, password, role) VALUES (?, ?, ?, ?)').run('Admin', 'admin', hash, 'super_admin');

// Seed rooms
const rooms = [
  { id: '201', number: '201', floor: 2, price: 300000 },
  { id: '202', number: '202', floor: 2, price: 300000 },
  { id: '203', number: '203', floor: 2, price: 350000 },
  { id: '204', number: '204', floor: 2, price: 350000 },
  { id: '205', number: '205', floor: 2, price: 400000 },
  { id: '301', number: '301', floor: 3, price: 350000 },
  { id: '302', number: '302', floor: 3, price: 350000 },
  { id: '303', number: '303', floor: 3, price: 400000 },
  { id: '304', number: '304', floor: 3, price: 400000 },
  { id: '305', number: '305', floor: 3, price: 450000 },
  { id: '306', number: '306', floor: 3, price: 450000 },
  { id: '401', number: '401', floor: 4, price: 400000 },
  { id: '402', number: '402', floor: 4, price: 400000 },
  { id: '403', number: '403', floor: 4, price: 450000 },
  { id: '404', number: '404', floor: 4, price: 450000 },
  { id: '405', number: '405', floor: 4, price: 500000 },
];

const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (id, number, floor, price_per_night) VALUES (?, ?, ?, ?)');
for (const r of rooms) {
  insertRoom.run(r.id, r.number, r.floor, r.price);
}

db.close();
console.log('✅ Database seeded successfully!');
console.log('   - Super admin: admin / 1234');
console.log('   - 16 rooms created (201-205, 301-306, 401-405)');
