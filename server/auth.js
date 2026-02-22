const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) {
  console.error('XATO: JWT_SECRET .env faylida kamida 16 belgi bo\'lishi kerak!');
  process.exit(1);
}

// Token blacklist: bekor qilingan tokenlarni saqlash
// key = token jti, value = expiry timestamp
const tokenBlacklist = new Map();

// Har 30 daqiqada muddati o'tgan tokenlarni tozalash
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of tokenBlacklist) {
    if (exp < now) tokenBlacklist.delete(jti);
  }
}, 30 * 60 * 1000);

function generateToken(admin) {
  const jti = `${admin.id}-${Date.now()}`;
  return jwt.sign(
    { id: admin.id, name: admin.name, username: admin.username, role: admin.role || 'admin', jti },
    SECRET,
    { expiresIn: '8h' }
  );
}

function revokeToken(token) {
  try {
    const decoded = jwt.verify(token, SECRET, { ignoreExpiration: true });
    if (decoded.jti && decoded.exp) {
      tokenBlacklist.set(decoded.jti, decoded.exp);
    }
  } catch {
    // Token yaroqsiz — e'tiborsiz qoldirish
  }
}

// Admin ID bo'yicha barcha tokenlarni bekor qilish (parol o'zgarganda)
function revokeAllTokensForAdmin(adminId) {
  // Blacklist ga faqat joriy tokenlarni qo'shish imkoni yo'q (in-memory),
  // Shuning uchun admin_password_changed_at yondashuvidan foydalanamiz
  // Bu funksiya adminPasswordChangedAt map ni yangilaydi
  adminPasswordChangedAt.set(adminId, Math.floor(Date.now() / 1000));
}

// Admin parol o'zgartirilgan vaqtni saqlash
const adminPasswordChangedAt = new Map();

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token kerak' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    // Blacklist tekshiruvi
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ error: 'Token bekor qilingan' });
    }

    // Parol o'zgartirilganmi tekshiruvi
    const changedAt = adminPasswordChangedAt.get(decoded.id);
    if (changedAt && decoded.iat < changedAt) {
      return res.status(401).json({ error: 'Parol o\'zgartirilgan. Qayta kiring.' });
    }

    req.admin = decoded;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz' });
  }
}

function superAdminMiddleware(req, res, next) {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Faqat super admin uchun' });
  }
  next();
}

module.exports = { generateToken, revokeToken, revokeAllTokensForAdmin, authMiddleware, superAdminMiddleware };
