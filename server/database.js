process.env.TZ = 'Asia/Tashkent';

const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database.sqlite';

function getDb() {
  const db = new Database(path.resolve(__dirname, DB_PATH));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      floor INTEGER NOT NULL,
      status TEXT DEFAULT 'available' CHECK(status IN ('available','occupied','cleaning','maintenance','booked')),
      guest_name TEXT,
      guest_passport TEXT,
      guest_phone TEXT,
      check_in DATETIME,
      check_out DATETIME,
      price_per_night INTEGER DEFAULT 300000,
      notes TEXT,
      booking_id TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATETIME DEFAULT (datetime('now', 'localtime')),
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      category TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      room_number TEXT,
      admin_name TEXT NOT NULL,
      shift_id TEXT
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      admin_name TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      total_income INTEGER DEFAULT 0,
      total_expense INTEGER DEFAULT 0,
      notes TEXT,
      closed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      guest_name TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      check_in_date TEXT NOT NULL,
      check_out_date TEXT,
      nights INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      created_by TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','checked_in','cancelled'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
      admin_name TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      room_number TEXT,
      amount INTEGER
    );

    CREATE TABLE IF NOT EXISTS daily_reports (
      date TEXT PRIMARY KEY,
      report_text TEXT NOT NULL,
      closed_at DATETIME DEFAULT (datetime('now', 'localtime')),
      admin_name TEXT NOT NULL
    );
  `);

  // Performance indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON transactions(shift_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
    CREATE INDEX IF NOT EXISTS idx_shifts_admin_name ON shifts(admin_name);
    CREATE INDEX IF NOT EXISTS idx_shifts_closed ON shifts(closed);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_room_number ON bookings(room_number);
    CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date);
  `);

  // Migration: add role column to admins
  try {
    db.exec(`ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin'`);
  } catch (e) {
    // Column already exists — ignore
  }

  // Migration: add prepayment column to bookings
  try {
    db.exec(`ALTER TABLE bookings ADD COLUMN prepayment INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists — ignore
  }

  // Migration: add total_income/total_expense columns to daily_reports
  try {
    db.exec(`ALTER TABLE daily_reports ADD COLUMN total_income INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists — ignore
  }
  try {
    db.exec(`ALTER TABLE daily_reports ADD COLUMN total_expense INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists — ignore
  }

  db.close();
}

module.exports = { getDb, initDb };
