/**
 * DB Backup Script
 *
 * Foydalanish:
 *   node backup.js              — bir marta backup
 *   node backup.js --schedule   — har 6 soatda avtomatik backup
 *
 * Backup fayllar: server/backups/ papkasida saqlanadi
 * Oxirgi 30 ta backup saqlanadi, eskilari avtomatik o'chiriladi
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || './database.sqlite');
const BACKUP_DIR = path.resolve(__dirname, './backups');
const MAX_BACKUPS = 30;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function createBackup() {
  ensureBackupDir();

  if (!fs.existsSync(DB_PATH)) {
    console.error(`[Backup] DB fayl topilmadi: ${DB_PATH}`);
    return false;
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.sqlite`);

  try {
    // SQLite safe backup: fayl nusxasini olish
    // WAL mode da .sqlite-wal va .sqlite-shm fayllar ham bo'lishi mumkin
    fs.copyFileSync(DB_PATH, backupFile);

    const walPath = DB_PATH + '-wal';
    const shmPath = DB_PATH + '-shm';
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, backupFile + '-wal');
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, backupFile + '-shm');
    }

    const sizeMB = (fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2);
    console.log(`[Backup] Yaratildi: ${backupFile} (${sizeMB} MB)`);

    // Eski backuplarni tozalash
    cleanOldBackups();
    return true;
  } catch (err) {
    console.error(`[Backup] Xatolik: ${err.message}`);
    return false;
  }
}

function cleanOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.sqlite'))
    .sort()
    .reverse();

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      const filePath = path.join(BACKUP_DIR, file);
      fs.unlinkSync(filePath);
      // WAL va SHM fayllarni ham o'chirish
      const walPath = filePath + '-wal';
      const shmPath = filePath + '-shm';
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      console.log(`[Backup] Eski backup o'chirildi: ${file}`);
    }
  }
}

// Bir marta yoki jadval bo'yicha ishga tushirish
if (process.argv.includes('--schedule')) {
  console.log('[Backup] Jadval rejimi: har 6 soatda backup olinadi');
  createBackup();
  setInterval(createBackup, 6 * 60 * 60 * 1000);
} else {
  createBackup();
}
