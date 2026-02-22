const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) {
  console.error('XATO: JWT_SECRET .env faylida kamida 16 belgi bo\'lishi kerak!');
  process.exit(1);
}

function generateToken(admin) {
  return jwt.sign({ id: admin.id, name: admin.name, username: admin.username, role: admin.role || 'admin' }, SECRET, { expiresIn: '8h' });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token kerak' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);
    req.admin = decoded;
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

module.exports = { generateToken, authMiddleware, superAdminMiddleware };
