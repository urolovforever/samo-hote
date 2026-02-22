import { useState, useEffect } from 'react'
import { formatUZS, todayTashkent, currentMonthTashkent, nowTimeTashkent, formatDateTashkent, formatTimeTashkent, formatDateTimeTashkent } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import JSZip from 'jszip'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle,
  TableLayoutType,
  ShadingType,
} from 'docx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ClipboardList,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Calendar,
  Archive,
  Lock,
} from 'lucide-react'
import type { Transaction, ShiftLog as ShiftLogType, Room } from '../types'

// ==================== HISOBOT FORMATLASH ====================
// Barcha jadvallar 76 belgi kenglikda
const W = 76

const V = '\u2502'  // │
const H = '\u2500'  // ─
const HH = '\u2550' // ═
const X = '\u253C'  // ┼
const XH = '\u256A' // ╪

function line(heavy = false) { return (heavy ? HH : H).repeat(W) + '\n' }

function row2(left: string, right: string, ralign: 'L' | 'R' = 'R') {
  const lw = 40, rw = W - lw - 5
  const l = left.length > lw ? left.slice(0, lw) : left.padEnd(lw)
  const rv = right.length > rw ? right.slice(0, rw) : (ralign === 'R' ? right.padStart(rw) : right.padEnd(rw))
  return V + ' ' + l + ' ' + V + ' ' + rv + ' ' + V + '\n'
}

function sep2(heavy = false) {
  const ch = heavy ? HH : H
  const cross = heavy ? XH : X
  const lw = 40, rw = W - lw - 5
  return V + ch.repeat(lw + 2) + cross + ch.repeat(rw + 2) + V + '\n'
}

function row5(a: string, b: string, c: string, d: string, e: string, eAlign: 'L' | 'R' = 'R') {
  const ws = [4, 7, 28, 13, 14]
  const vals = [a, b, c, d, e]
  const aligns: ('L' | 'R')[] = ['L', 'L', 'L', 'L', eAlign]
  let s = V
  for (let i = 0; i < 5; i++) {
    let v = vals[i]
    if (v.length > ws[i]) v = v.slice(0, ws[i])
    s += ' ' + (aligns[i] === 'R' ? v.padStart(ws[i]) : v.padEnd(ws[i])) + ' ' + V
  }
  return s + '\n'
}

function sep5(heavy = false) {
  const ch = heavy ? HH : H
  const cross = heavy ? XH : X
  const ws = [4, 7, 28, 13, 14]
  return V + ws.map(w => ch.repeat(w + 2)).join(cross) + V + '\n'
}

function center(text: string) {
  const pad = Math.max(0, Math.floor((W - text.length) / 2))
  return ' '.repeat(pad) + text + '\n'
}

// --- Report generator for a single date ---
function generateDayReport(
  date: string,
  transactions: Transaction[],
  shifts: ShiftLogType[],
  rooms: Room[],
  currentShift: ShiftLogType | null,
): string {
  const dateTx = transactions.filter(t => t.date.startsWith(date))
  const dateShifts = shifts.filter(s => s.startTime.startsWith(date))

  const incomeTx = dateTx.filter(t => t.type === 'income')
  const expenseTx = dateTx.filter(t => t.type === 'expense')
  const totalIncome = incomeTx.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0)

  const occupied = rooms.filter(r => r.status === 'occupied')
  const available = rooms.filter(r => r.status === 'available')
  const cleaning = rooms.filter(r => r.status === 'cleaning')
  const maintenance = rooms.filter(r => r.status === 'maintenance')

  let r = ''

  // SARLAVHA
  r += '\n'
  r += line(true)
  r += center('SAMO HOTEL')
  r += center('KUNLIK MOLIYAVIY HISOBOT')
  r += line(true)
  r += '  Sana:           ' + date + '\n'
  r += '  Chop etilgan:   ' + formatDateTimeTashkent(new Date()) + '\n'
  r += line()
  r += '\n'

  // XONALAR HOLATI
  r += '  XONALAR HOLATI\n'
  r += sep2()
  r += row2('Ko\'rsatkich', 'Qiymat')
  r += sep2(true)
  r += row2('Jami xonalar', String(rooms.length))
  r += row2('Band (occupied)', String(occupied.length))
  r += row2('Bo\'sh (available)', String(available.length))
  r += row2('Tozalanmoqda', String(cleaning.length))
  r += row2('Ta\'mirda', String(maintenance.length))
  r += sep2()
  const occRate = rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) + '%' : '0%'
  r += row2('Bandlik darajasi', occRate)
  r += sep2()
  r += '\n'

  // MEHMONLAR
  if (occupied.length > 0) {
    r += '  HOZIRGI MEHMONLAR\n'
    r += sep5()
    r += row5('#', 'Xona', 'Mehmon', 'Telefon', 'Kirish sana', 'L')
    r += sep5(true)
    occupied.forEach((rm, i) => {
      r += row5(
        String(i + 1),
        rm.number,
        rm.guestName || '-',
        rm.guestPhone || '-',
        rm.checkIn ? formatDateTashkent(rm.checkIn) : '-',
        'L',
      )
    })
    r += sep5()
    r += '\n'
  }

  // MOLIYAVIY XULOSA
  r += '  MOLIYAVIY XULOSA\n'
  r += sep2()
  r += row2('Ko\'rsatkich', 'Summa')
  r += sep2(true)
  r += row2('Jami kirim (tushum)', formatUZS(totalIncome))
  r += row2('Jami chiqim (xarajat)', formatUZS(totalExpense))
  r += sep2(true)
  r += row2('SALDO (foyda)', formatUZS(totalIncome - totalExpense))
  r += row2('Operatsiyalar soni', String(dateTx.length))
  r += sep2()
  r += '\n'

  // KIRIMLAR
  if (incomeTx.length > 0) {
    r += '  KIRIMLAR\n'
    r += sep5()
    r += row5('#', 'Vaqt', 'Tavsif', 'Kategoriya', 'Summa')
    r += sep5(true)
    incomeTx.forEach((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      r += row5(String(i + 1), time, tx.description, tx.category, formatUZS(tx.amount))
    })
    r += sep5()
    r += row5('', '', '', 'JAMI:', formatUZS(totalIncome))
    r += sep5()
    r += '\n'
  }

  // CHIQIMLAR
  if (expenseTx.length > 0) {
    r += '  CHIQIMLAR\n'
    r += sep5()
    r += row5('#', 'Vaqt', 'Tavsif', 'Kategoriya', 'Summa')
    r += sep5(true)
    expenseTx.forEach((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      r += row5(String(i + 1), time, tx.description, tx.category, formatUZS(tx.amount))
    })
    r += sep5()
    r += row5('', '', '', 'JAMI:', formatUZS(totalExpense))
    r += sep5()
    r += '\n'
  }

  // SMENALAR
  if (dateShifts.length > 0) {
    r += '  SMENALAR\n'
    r += sep2()
    dateShifts.forEach((s, i) => {
      const start = formatTimeTashkent(s.startTime)
      const end = s.endTime ? formatTimeTashkent(s.endTime) : '...'
      if (i > 0) r += sep2()
      r += row2(`${i + 1}. ${s.admin}`, `${start} - ${end}`, 'L')
      r += row2('   Kirim', formatUZS(s.totalIncome))
      r += row2('   Chiqim', formatUZS(s.totalExpense))
      r += row2('   Balans', formatUZS(s.totalIncome - s.totalExpense))
      if (s.notes) r += row2('   Izoh', s.notes, 'L')
    })
    r += sep2()
    r += '\n'
  }

  if (currentShift && currentShift.startTime.startsWith(date)) {
    const start = formatTimeTashkent(currentShift.startTime)
    r += '  JORIY SMENA (yopilmagan)\n'
    r += sep2()
    r += row2('Admin', currentShift.admin, 'L')
    r += row2('Boshlanish', start, 'L')
    r += sep2()
    r += row2('Kirim', formatUZS(currentShift.totalIncome))
    r += row2('Chiqim', formatUZS(currentShift.totalExpense))
    r += sep2(true)
    r += row2('Balans', formatUZS(currentShift.totalIncome - currentShift.totalExpense))
    r += sep2()
    r += '\n'
  }

  if (dateTx.length === 0 && dateShifts.length === 0 && !(currentShift && currentShift.startTime.startsWith(date))) {
    r += '  Bu sana uchun ma\'lumot topilmadi.\n\n'
  }

  r += line(true)
  r += center('Samo Hotel Boshqaruv Tizimi')
  r += line(true)

  return r
}

function generateShiftReport(shift: ShiftLogType, shiftTransactions: Transaction[]): string {
  const incomeTx = shiftTransactions.filter(t => t.type === 'income')
  const expenseTx = shiftTransactions.filter(t => t.type === 'expense')

  let r = ''

  // SARLAVHA
  r += '\n'
  r += line(true)
  r += center('SAMO HOTEL')
  r += center('SMENA MOLIYAVIY HISOBOTI')
  r += line(true)
  r += '  Admin:          ' + shift.admin + '\n'
  r += '  Boshlanish:     ' + formatDateTimeTashkent(shift.startTime) + '\n'
  r += '  Tugash:         ' + (shift.endTime ? formatDateTimeTashkent(shift.endTime) : 'Hali yopilmagan') + '\n'
  r += '  Holati:         ' + (shift.closed ? 'Yopilgan' : 'Ochiq (faol)') + '\n'
  r += '  Chop etilgan:   ' + formatDateTimeTashkent(new Date()) + '\n'
  r += line()
  r += '\n'

  // MOLIYAVIY XULOSA
  r += '  MOLIYAVIY XULOSA\n'
  r += sep2()
  r += row2('Ko\'rsatkich', 'Summa')
  r += sep2(true)
  r += row2('Jami kirim (tushum)', formatUZS(shift.totalIncome))
  r += row2('Jami chiqim (xarajat)', formatUZS(shift.totalExpense))
  r += sep2(true)
  r += row2('SALDO (foyda)', formatUZS(shift.totalIncome - shift.totalExpense))
  r += row2('Operatsiyalar soni', String(shiftTransactions.length))
  r += sep2()
  r += '\n'

  // KIRIMLAR
  if (incomeTx.length > 0) {
    r += '  KIRIMLAR\n'
    r += sep5()
    r += row5('#', 'Vaqt', 'Tavsif', 'Kategoriya', 'Summa')
    r += sep5(true)
    incomeTx.forEach((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      r += row5(String(i + 1), time, tx.description, tx.category, formatUZS(tx.amount))
    })
    r += sep5()
    r += row5('', '', '', 'JAMI:', formatUZS(shift.totalIncome))
    r += sep5()
    r += '\n'
  }

  // CHIQIMLAR
  if (expenseTx.length > 0) {
    r += '  CHIQIMLAR\n'
    r += sep5()
    r += row5('#', 'Vaqt', 'Tavsif', 'Kategoriya', 'Summa')
    r += sep5(true)
    expenseTx.forEach((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      r += row5(String(i + 1), time, tx.description, tx.category, formatUZS(tx.amount))
    })
    r += sep5()
    r += row5('', '', '', 'JAMI:', formatUZS(shift.totalExpense))
    r += sep5()
    r += '\n'
  }

  if (shiftTransactions.length === 0) {
    r += '  Bu smenada operatsiya mavjud emas.\n\n'
  }

  if (shift.notes) {
    r += '  SMENA IZOHI\n'
    r += sep2()
    r += row2('Izoh', shift.notes, 'L')
    r += sep2()
    r += '\n'
  }

  r += line(true)
  r += center('Samo Hotel Boshqaruv Tizimi')
  r += line(true)

  return r
}

const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr']

// ==================== WORD DOCX HISOBOT ====================
const AMBER_COLOR = 'D97706'
const AMBER_LIGHT = 'FEF3C7'
const EMERALD_COLOR = '059669'
const EMERALD_LIGHT = 'D1FAE5'
const RED_COLOR = 'DC2626'
const RED_LIGHT = 'FEE2E2'
const PURPLE_COLOR = '7C3AED'
const GRAY_HEADER = '1F2937'
const GRAY_LIGHT = 'F3F4F6'
const WHITE = 'FFFFFF'

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left: { style: BorderStyle.NONE, size: 0, color: WHITE },
  right: { style: BorderStyle.NONE, size: 0, color: WHITE },
}

const thinBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
}

function docxHeaderCell(text: string, widthPct?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: 'Segoe UI' })],
      spacing: { before: 60, after: 60 },
    })],
    shading: { type: ShadingType.CLEAR, fill: GRAY_HEADER },
    borders: thinBorders,
    ...(widthPct ? { width: { size: widthPct, type: WidthType.PERCENTAGE } } : {}),
  })
}

function docxCell(text: string, opts?: { bold?: boolean; color?: string; align?: typeof AlignmentType.RIGHT; shading?: string }): TableCell {
  return new TableCell({
    children: [new Paragraph({
      alignment: opts?.align || AlignmentType.LEFT,
      children: [new TextRun({
        text,
        bold: opts?.bold,
        color: opts?.color || '374151',
        size: 20,
        font: 'Segoe UI',
      })],
      spacing: { before: 40, after: 40 },
    })],
    shading: opts?.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    borders: thinBorders,
  })
}

function docxSectionTitle(text: string, color: string = AMBER_COLOR): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color, size: 26, font: 'Segoe UI' })],
    spacing: { before: 300, after: 120 },
  })
}

function docxKvRow(label: string, value: string, opts?: { valueBold?: boolean; valueColor?: string; shading?: string }): TableRow {
  return new TableRow({
    children: [
      docxCell(label, { shading: opts?.shading }),
      docxCell(value, { align: AlignmentType.RIGHT, bold: opts?.valueBold, color: opts?.valueColor, shading: opts?.shading }),
    ],
  })
}

function generateDayReportDocx(
  date: string,
  transactions: Transaction[],
  shifts: ShiftLogType[],
  rooms: Room[],
  currentShift: ShiftLogType | null,
): Document {
  const dateTx = transactions.filter(t => t.date.startsWith(date))
  const dateShifts = shifts.filter(s => s.startTime.startsWith(date))
  const incomeTx = dateTx.filter(t => t.type === 'income')
  const expenseTx = dateTx.filter(t => t.type === 'expense')
  const totalIncome = incomeTx.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0)
  const occupied = rooms.filter(r => r.status === 'occupied')
  const available = rooms.filter(r => r.status === 'available')
  const cleaning = rooms.filter(r => r.status === 'cleaning')
  const maintenance = rooms.filter(r => r.status === 'maintenance')
  const occRate = rooms.length > 0 ? Math.round((occupied.length / rooms.length) * 100) + '%' : '0%'

  const children: (Paragraph | Table)[] = []

  // ── Header ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SAMO HOTEL', bold: true, color: AMBER_COLOR, size: 40, font: 'Segoe UI' })],
    spacing: { before: 200, after: 40 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'KUNLIK MOLIYAVIY HISOBOT', bold: true, color: '6B7280', size: 24, font: 'Segoe UI' })],
    spacing: { after: 80 },
  }))

  // Info line
  const infoTable = new Table({
    rows: [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [
          new TextRun({ text: 'Sana: ', color: '9CA3AF', size: 20, font: 'Segoe UI' }),
          new TextRun({ text: date, bold: true, color: '374151', size: 20, font: 'Segoe UI' }),
        ] })], borders: noBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: 'Chop etilgan: ', color: '9CA3AF', size: 20, font: 'Segoe UI' }),
          new TextRun({ text: formatDateTimeTashkent(new Date()), color: '6B7280', size: 20, font: 'Segoe UI' }),
        ] })], borders: noBorders }),
      ] }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  })
  children.push(infoTable)

  // Separator
  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: AMBER_COLOR } },
    spacing: { before: 80, after: 200 },
  }))

  // ── XONALAR HOLATI ──
  children.push(docxSectionTitle('XONALAR HOLATI'))
  const roomTable = new Table({
    rows: [
      new TableRow({ children: [docxHeaderCell("Ko'rsatkich", 65), docxHeaderCell('Qiymat', 35)] }),
      docxKvRow('Jami xonalar', String(rooms.length)),
      docxKvRow('Band (occupied)', String(occupied.length), { shading: GRAY_LIGHT }),
      docxKvRow("Bo'sh (available)", String(available.length)),
      docxKvRow('Tozalanmoqda', String(cleaning.length), { shading: GRAY_LIGHT }),
      docxKvRow("Ta'mirda", String(maintenance.length)),
      new TableRow({ children: [
        docxCell('Bandlik darajasi', { bold: true, shading: AMBER_LIGHT }),
        docxCell(occRate, { bold: true, align: AlignmentType.RIGHT, color: AMBER_COLOR, shading: AMBER_LIGHT }),
      ] }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  })
  children.push(roomTable)

  // ── HOZIRGI MEHMONLAR ──
  if (occupied.length > 0) {
    children.push(docxSectionTitle('HOZIRGI MEHMONLAR', PURPLE_COLOR))
    const guestRows = occupied.map((rm, i) => new TableRow({
      children: [
        docxCell(String(i + 1), { shading: i % 2 === 0 ? undefined : GRAY_LIGHT }),
        docxCell(rm.number, { bold: true, shading: i % 2 === 0 ? undefined : GRAY_LIGHT }),
        docxCell(rm.guestName || '-', { shading: i % 2 === 0 ? undefined : GRAY_LIGHT }),
        docxCell(rm.guestPhone || '-', { shading: i % 2 === 0 ? undefined : GRAY_LIGHT }),
        docxCell(rm.checkIn ? formatDateTashkent(rm.checkIn) : '-', { shading: i % 2 === 0 ? undefined : GRAY_LIGHT }),
      ],
    }))
    children.push(new Table({
      rows: [
        new TableRow({ children: [
          docxHeaderCell('#', 8), docxHeaderCell('Xona', 12), docxHeaderCell('Mehmon', 35),
          docxHeaderCell('Telefon', 22), docxHeaderCell('Kirish sana', 23),
        ] }),
        ...guestRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  // ── MOLIYAVIY XULOSA ──
  children.push(docxSectionTitle('MOLIYAVIY XULOSA', EMERALD_COLOR))
  children.push(new Table({
    rows: [
      new TableRow({ children: [docxHeaderCell("Ko'rsatkich", 65), docxHeaderCell('Summa', 35)] }),
      new TableRow({ children: [
        docxCell('Jami kirim (tushum)', { shading: EMERALD_LIGHT }),
        docxCell(formatUZS(totalIncome), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: EMERALD_LIGHT }),
      ] }),
      new TableRow({ children: [
        docxCell('Jami chiqim (xarajat)', { shading: RED_LIGHT }),
        docxCell(formatUZS(totalExpense), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: RED_LIGHT }),
      ] }),
      new TableRow({ children: [
        docxCell('SALDO (foyda)', { bold: true, shading: AMBER_LIGHT }),
        docxCell(formatUZS(totalIncome - totalExpense), { align: AlignmentType.RIGHT, bold: true, color: AMBER_COLOR, shading: AMBER_LIGHT }),
      ] }),
      docxKvRow('Operatsiyalar soni', String(dateTx.length), { shading: GRAY_LIGHT }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }))

  // ── KIRIMLAR ──
  if (incomeTx.length > 0) {
    children.push(docxSectionTitle('KIRIMLAR', EMERALD_COLOR))
    const incRows = incomeTx.map((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      const bg = i % 2 === 0 ? undefined : GRAY_LIGHT
      return new TableRow({ children: [
        docxCell(String(i + 1), { shading: bg }),
        docxCell(time, { shading: bg }),
        docxCell(tx.description, { shading: bg }),
        docxCell(tx.category, { shading: bg }),
        docxCell(formatUZS(tx.amount), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: bg }),
      ] })
    })
    incRows.push(new TableRow({ children: [
      docxCell('', { shading: EMERALD_LIGHT }), docxCell('', { shading: EMERALD_LIGHT }),
      docxCell('', { shading: EMERALD_LIGHT }),
      docxCell('JAMI:', { bold: true, shading: EMERALD_LIGHT }),
      docxCell(formatUZS(totalIncome), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: EMERALD_LIGHT }),
    ] }))
    children.push(new Table({
      rows: [
        new TableRow({ children: [
          docxHeaderCell('#', 8), docxHeaderCell('Vaqt', 12), docxHeaderCell('Tavsif', 35),
          docxHeaderCell('Kategoriya', 22), docxHeaderCell('Summa', 23),
        ] }),
        ...incRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  // ── CHIQIMLAR ──
  if (expenseTx.length > 0) {
    children.push(docxSectionTitle('CHIQIMLAR', RED_COLOR))
    const expRows = expenseTx.map((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      const bg = i % 2 === 0 ? undefined : GRAY_LIGHT
      return new TableRow({ children: [
        docxCell(String(i + 1), { shading: bg }),
        docxCell(time, { shading: bg }),
        docxCell(tx.description, { shading: bg }),
        docxCell(tx.category, { shading: bg }),
        docxCell(formatUZS(tx.amount), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: bg }),
      ] })
    })
    expRows.push(new TableRow({ children: [
      docxCell('', { shading: RED_LIGHT }), docxCell('', { shading: RED_LIGHT }),
      docxCell('', { shading: RED_LIGHT }),
      docxCell('JAMI:', { bold: true, shading: RED_LIGHT }),
      docxCell(formatUZS(totalExpense), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: RED_LIGHT }),
    ] }))
    children.push(new Table({
      rows: [
        new TableRow({ children: [
          docxHeaderCell('#', 8), docxHeaderCell('Vaqt', 12), docxHeaderCell('Tavsif', 35),
          docxHeaderCell('Kategoriya', 22), docxHeaderCell('Summa', 23),
        ] }),
        ...expRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  // ── SMENALAR ──
  if (dateShifts.length > 0) {
    children.push(docxSectionTitle('SMENALAR', PURPLE_COLOR))
    const shiftRows: TableRow[] = []
    dateShifts.forEach((s, i) => {
      const start = formatTimeTashkent(s.startTime)
      const end = s.endTime ? formatTimeTashkent(s.endTime) : '...'
      const bg = i % 2 === 0 ? undefined : GRAY_LIGHT
      shiftRows.push(new TableRow({ children: [
        docxCell(String(i + 1), { shading: bg }),
        docxCell(s.admin, { bold: true, shading: bg }),
        docxCell(`${start} - ${end}`, { shading: bg }),
        docxCell(formatUZS(s.totalIncome), { align: AlignmentType.RIGHT, color: EMERALD_COLOR, shading: bg }),
        docxCell(formatUZS(s.totalExpense), { align: AlignmentType.RIGHT, color: RED_COLOR, shading: bg }),
        docxCell(formatUZS(s.totalIncome - s.totalExpense), { align: AlignmentType.RIGHT, bold: true, color: AMBER_COLOR, shading: bg }),
      ] }))
    })
    children.push(new Table({
      rows: [
        new TableRow({ children: [
          docxHeaderCell('#', 6), docxHeaderCell('Admin', 20), docxHeaderCell('Vaqt', 20),
          docxHeaderCell('Kirim', 18), docxHeaderCell('Chiqim', 18), docxHeaderCell('Balans', 18),
        ] }),
        ...shiftRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  // ── JORIY SMENA ──
  if (currentShift && currentShift.startTime.startsWith(date)) {
    const start = formatTimeTashkent(currentShift.startTime)
    children.push(docxSectionTitle('JORIY SMENA (yopilmagan)', AMBER_COLOR))
    children.push(new Table({
      rows: [
        new TableRow({ children: [docxHeaderCell("Ko'rsatkich", 65), docxHeaderCell('Qiymat', 35)] }),
        docxKvRow('Admin', currentShift.admin),
        docxKvRow('Boshlanish', start, { shading: GRAY_LIGHT }),
        new TableRow({ children: [
          docxCell('Kirim', { shading: EMERALD_LIGHT }),
          docxCell(formatUZS(currentShift.totalIncome), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: EMERALD_LIGHT }),
        ] }),
        new TableRow({ children: [
          docxCell('Chiqim', { shading: RED_LIGHT }),
          docxCell(formatUZS(currentShift.totalExpense), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: RED_LIGHT }),
        ] }),
        new TableRow({ children: [
          docxCell('Balans', { bold: true, shading: AMBER_LIGHT }),
          docxCell(formatUZS(currentShift.totalIncome - currentShift.totalExpense), { align: AlignmentType.RIGHT, bold: true, color: AMBER_COLOR, shading: AMBER_LIGHT }),
        ] }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  if (dateTx.length === 0 && dateShifts.length === 0 && !(currentShift && currentShift.startTime.startsWith(date))) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "Bu sana uchun ma'lumot topilmadi.", italics: true, color: '9CA3AF', size: 22, font: 'Segoe UI' })],
      spacing: { before: 200, after: 200 },
    }))
  }

  // ── Footer ──
  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: AMBER_COLOR } },
    spacing: { before: 300, after: 80 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Samo Hotel Boshqaruv Tizimi', color: '9CA3AF', size: 18, font: 'Segoe UI' })],
    spacing: { after: 40 },
  }))

  return new Document({
    sections: [{ children }],
  })
}

function generateShiftReportDocx(shift: ShiftLogType, shiftTransactions: Transaction[]): Document {
  const incomeTx = shiftTransactions.filter(t => t.type === 'income')
  const expenseTx = shiftTransactions.filter(t => t.type === 'expense')

  const children: (Paragraph | Table)[] = []

  // Header
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SAMO HOTEL', bold: true, color: AMBER_COLOR, size: 40, font: 'Segoe UI' })],
    spacing: { before: 200, after: 40 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SMENA MOLIYAVIY HISOBOTI', bold: true, color: '6B7280', size: 24, font: 'Segoe UI' })],
    spacing: { after: 80 },
  }))

  // Info
  children.push(new Table({
    rows: [
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [
          new TextRun({ text: 'Admin: ', color: '9CA3AF', size: 20, font: 'Segoe UI' }),
          new TextRun({ text: shift.admin, bold: true, color: '374151', size: 20, font: 'Segoe UI' }),
        ] })], borders: noBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: 'Holati: ', color: '9CA3AF', size: 20, font: 'Segoe UI' }),
          new TextRun({ text: shift.closed ? 'Yopilgan' : 'Ochiq (faol)', bold: true, color: shift.closed ? EMERALD_COLOR : AMBER_COLOR, size: 20, font: 'Segoe UI' }),
        ] })], borders: noBorders }),
      ] }),
      new TableRow({ children: [
        new TableCell({ children: [new Paragraph({ children: [
          new TextRun({ text: 'Boshlanish: ', color: '9CA3AF', size: 20, font: 'Segoe UI' }),
          new TextRun({ text: formatDateTimeTashkent(shift.startTime), color: '374151', size: 20, font: 'Segoe UI' }),
        ] })], borders: noBorders }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [
          new TextRun({ text: 'Tugash: ', color: '9CA3AF', size: 20, font: 'Segoe UI' }),
          new TextRun({ text: shift.endTime ? formatDateTimeTashkent(shift.endTime) : 'Hali yopilmagan', color: '374151', size: 20, font: 'Segoe UI' }),
        ] })], borders: noBorders }),
      ] }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }))

  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: AMBER_COLOR } },
    spacing: { before: 80, after: 200 },
  }))

  // MOLIYAVIY XULOSA
  children.push(docxSectionTitle('MOLIYAVIY XULOSA', EMERALD_COLOR))
  children.push(new Table({
    rows: [
      new TableRow({ children: [docxHeaderCell("Ko'rsatkich", 65), docxHeaderCell('Summa', 35)] }),
      new TableRow({ children: [
        docxCell('Jami kirim (tushum)', { shading: EMERALD_LIGHT }),
        docxCell(formatUZS(shift.totalIncome), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: EMERALD_LIGHT }),
      ] }),
      new TableRow({ children: [
        docxCell('Jami chiqim (xarajat)', { shading: RED_LIGHT }),
        docxCell(formatUZS(shift.totalExpense), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: RED_LIGHT }),
      ] }),
      new TableRow({ children: [
        docxCell('SALDO (foyda)', { bold: true, shading: AMBER_LIGHT }),
        docxCell(formatUZS(shift.totalIncome - shift.totalExpense), { align: AlignmentType.RIGHT, bold: true, color: AMBER_COLOR, shading: AMBER_LIGHT }),
      ] }),
      docxKvRow('Operatsiyalar soni', String(shiftTransactions.length), { shading: GRAY_LIGHT }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  }))

  // KIRIMLAR
  if (incomeTx.length > 0) {
    children.push(docxSectionTitle('KIRIMLAR', EMERALD_COLOR))
    const incRows = incomeTx.map((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      const bg = i % 2 === 0 ? undefined : GRAY_LIGHT
      return new TableRow({ children: [
        docxCell(String(i + 1), { shading: bg }), docxCell(time, { shading: bg }),
        docxCell(tx.description, { shading: bg }), docxCell(tx.category, { shading: bg }),
        docxCell(formatUZS(tx.amount), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: bg }),
      ] })
    })
    incRows.push(new TableRow({ children: [
      docxCell('', { shading: EMERALD_LIGHT }), docxCell('', { shading: EMERALD_LIGHT }),
      docxCell('', { shading: EMERALD_LIGHT }),
      docxCell('JAMI:', { bold: true, shading: EMERALD_LIGHT }),
      docxCell(formatUZS(shift.totalIncome), { align: AlignmentType.RIGHT, bold: true, color: EMERALD_COLOR, shading: EMERALD_LIGHT }),
    ] }))
    children.push(new Table({
      rows: [
        new TableRow({ children: [
          docxHeaderCell('#', 8), docxHeaderCell('Vaqt', 12), docxHeaderCell('Tavsif', 35),
          docxHeaderCell('Kategoriya', 22), docxHeaderCell('Summa', 23),
        ] }),
        ...incRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  // CHIQIMLAR
  if (expenseTx.length > 0) {
    children.push(docxSectionTitle('CHIQIMLAR', RED_COLOR))
    const expRows = expenseTx.map((tx, i) => {
      const time = tx.date.includes('T') ? tx.date.split('T')[1]?.slice(0, 5) : ''
      const bg = i % 2 === 0 ? undefined : GRAY_LIGHT
      return new TableRow({ children: [
        docxCell(String(i + 1), { shading: bg }), docxCell(time, { shading: bg }),
        docxCell(tx.description, { shading: bg }), docxCell(tx.category, { shading: bg }),
        docxCell(formatUZS(tx.amount), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: bg }),
      ] })
    })
    expRows.push(new TableRow({ children: [
      docxCell('', { shading: RED_LIGHT }), docxCell('', { shading: RED_LIGHT }),
      docxCell('', { shading: RED_LIGHT }),
      docxCell('JAMI:', { bold: true, shading: RED_LIGHT }),
      docxCell(formatUZS(shift.totalExpense), { align: AlignmentType.RIGHT, bold: true, color: RED_COLOR, shading: RED_LIGHT }),
    ] }))
    children.push(new Table({
      rows: [
        new TableRow({ children: [
          docxHeaderCell('#', 8), docxHeaderCell('Vaqt', 12), docxHeaderCell('Tavsif', 35),
          docxHeaderCell('Kategoriya', 22), docxHeaderCell('Summa', 23),
        ] }),
        ...expRows,
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
    }))
  }

  if (shiftTransactions.length === 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Bu smenada operatsiya mavjud emas.', italics: true, color: '9CA3AF', size: 22, font: 'Segoe UI' })],
      spacing: { before: 200, after: 200 },
    }))
  }

  if (shift.notes) {
    children.push(docxSectionTitle('SMENA IZOHI', PURPLE_COLOR))
    children.push(new Paragraph({
      children: [new TextRun({ text: shift.notes, color: '374151', size: 22, font: 'Segoe UI' })],
      spacing: { before: 80, after: 80 },
    }))
  }

  // Footer
  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: AMBER_COLOR } },
    spacing: { before: 300, after: 80 },
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Samo Hotel Boshqaruv Tizimi', color: '9CA3AF', size: 18, font: 'Segoe UI' })],
  }))

  return new Document({ sections: [{ children }] })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function ShiftReport() {
  const { rooms, transactions, shifts, closeShift } = useData()
  const { currentShift } = useAuth()
  const [showClose, setShowClose] = useState(false)
  const [closeNotes, setCloseNotes] = useState('')
  const [expandedShift, setExpandedShift] = useState<string | null>(null)
  const [reportDate, setReportDate] = useState(() => todayTashkent())
  const [reportMonth, setReportMonth] = useState(() => currentMonthTashkent())
  const [zipping, setZipping] = useState(false)
  const [closedDates, setClosedDates] = useState<Record<string, { admin_name: string; closed_at: string }>>({})
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    api.getClosedDates().then(rows => {
      const map: Record<string, { admin_name: string; closed_at: string }> = {}
      rows.forEach((r: any) => { map[r.date] = { admin_name: r.admin_name, closed_at: r.closed_at } })
      setClosedDates(map)
    }).catch(() => {})
  }, [])

  const handleCloseDay = async () => {
    setClosing(true)
    try {
      const reportText = generateDayReport(reportDate, transactions, shifts, rooms, currentShift)
      await api.closeDailyReport(reportDate, reportText)
      setClosedDates(prev => ({ ...prev, [reportDate]: { admin_name: 'Siz', closed_at: todayTashkent() + 'T' + nowTimeTashkent() } }))
    } catch (err: any) {
      console.error('Kunni yopishda xatolik:', err)
      alert('Kunni yopishda xatolik: ' + (err?.message || 'Noma\'lum xato'))
    } finally {
      setClosing(false)
    }
  }

  const currentTx = currentShift
    ? transactions.filter(t => t.shift === currentShift.id)
    : []

  const handleClose = async () => {
    await closeShift(closeNotes)
    setShowClose(false)
    setCloseNotes('')
  }

  const downloadShiftReport = async (shift: ShiftLogType, shiftTx: Transaction[]) => {
    const doc = generateShiftReportDocx(shift, shiftTx)
    const blob = await Packer.toBlob(doc)
    const dateStr = shift.startTime.split('T')[0]
    downloadBlob(blob, `Smena_${shift.admin}_${dateStr}.docx`)
  }

  const today = todayTashkent()
  const [ty, tm, td] = today.split('-').map(Number)
  const minDateObj = new Date(ty, tm - 1, td - 30)
  const minDateStr = `${minDateObj.getFullYear()}-${String(minDateObj.getMonth() + 1).padStart(2, '0')}-${String(minDateObj.getDate()).padStart(2, '0')}`

  const downloadDayReport = async () => {
    const doc = generateDayReportDocx(reportDate, transactions, shifts, rooms, currentShift)
    const blob = await Packer.toBlob(doc)
    downloadBlob(blob, `Samo_Hotel_${reportDate}.docx`)
  }

  const downloadMonthlyZip = async () => {
    setZipping(true)
    try {
      const zip = new JSZip()
      const [yearStr, monthStr] = reportMonth.split('-')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr)
      const daysInMonth = new Date(year, month, 0).getDate()
      const monthName = MONTHS_UZ[month - 1]

      // Fetch closed reports for this month from server
      let closedReports: Record<string, string> = {}
      try {
        const rows = await api.getClosedDates(reportMonth)
        rows.forEach((r: any) => {
          if (r.report_text) closedReports[r.date] = r.report_text
        })
      } catch {}

      let hasData = false
      let summary = ''
      const summaryLine = '='.repeat(60)
      summary += summaryLine + '\n'
      summary += `     SAMO HOTEL — ${monthName} ${year} OYLIK XULOSA\n`
      summary += summaryLine + '\n\n'

      let monthTotalIncome = 0
      let monthTotalExpense = 0
      let totalDaysWithData = 0

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dayTx = transactions.filter(t => t.date.startsWith(dateStr))
        const dayShifts = shifts.filter(s => s.startTime.startsWith(dateStr))
        const isCurrentShiftDay = currentShift && currentShift.startTime.startsWith(dateStr)

        const hasDayData = closedReports[dateStr] || dayTx.length > 0 || dayShifts.length > 0 || isCurrentShiftDay
        if (hasDayData) {
          const doc = generateDayReportDocx(dateStr, transactions, shifts, rooms, currentShift)
          const docxBlob = await Packer.toBlob(doc)
          const arrayBuf = await docxBlob.arrayBuffer()
          zip.file(`${dateStr}.docx`, arrayBuf)
          hasData = true
          totalDaysWithData++

          const dayIncome = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
          const dayExpense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
          monthTotalIncome += dayIncome
          monthTotalExpense += dayExpense

          const tag = closedReports[dateStr] ? '  [yopilgan]' : ''
          summary += `  ${dateStr}:  Kirim: ${formatUZS(dayIncome).padStart(20)}  |  Chiqim: ${formatUZS(dayExpense).padStart(20)}${tag}\n`
        }
      }

      if (!hasData) {
        summary += `  Bu oy uchun ma'lumot topilmadi.\n`
      } else {
        summary += '\n' + summaryLine + '\n'
        summary += `  OY JAMI KIRIM:     ${formatUZS(monthTotalIncome).padStart(25)}\n`
        summary += `  OY JAMI CHIQIM:    ${formatUZS(monthTotalExpense).padStart(25)}\n`
        summary += `  OY SALDOSI:        ${formatUZS(monthTotalIncome - monthTotalExpense).padStart(25)}\n`
        summary += `  Ma'lumotli kunlar: ${totalDaysWithData}\n`
      }
      summary += summaryLine + '\n'

      zip.file(`_OYLIK_XULOSA_${monthName}_${year}.txt`, summary)

      const content = await zip.generateAsync({ type: 'blob' })
      downloadBlob(content, `Samo_Hotel_${monthName}_${year}.zip`)
    } catch (err) {
      console.error('ZIP yaratishda xatolik:', err)
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Smena hisoboti</h2>
        <p className="text-white/30 text-sm mt-1">Hisobotlarni yuklab oling va smenalarni boshqaring</p>
      </div>

      {/* Reports section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily report */}
        <div className="bg-gradient-to-br from-[#1a1f2e] to-[#161923] rounded-2xl border border-amber-500/10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Kunlik hisobot</h3>
              <p className="text-[11px] text-white/25">Oxirgi 30 kun ichida</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium block mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Sana
              </label>
              <input
                type="date"
                value={reportDate}
                min={minDateStr}
                max={todayTashkent()}
                onChange={e => setReportDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/30 transition-all"
              />
            </div>
            {closedDates[reportDate] && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">
                  Yopilgan — {closedDates[reportDate].admin_name}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={downloadDayReport}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Yuklab olish
              </button>
              <button
                type="button"
                onClick={handleCloseDay}
                disabled={closing}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all text-sm disabled:opacity-50"
              >
                {closing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Yopilmoqda...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Kunni yopish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Monthly ZIP */}
        <div className="bg-gradient-to-br from-[#1a1f2e] to-[#161923] rounded-2xl border border-purple-500/10 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
              <Archive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Oylik hisobot (ZIP)</h3>
              <p className="text-[11px] text-white/25">Har kun alohida fayl + xulosa</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider font-medium block mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />
                Oy
              </label>
              <input
                type="month"
                value={reportMonth}
                onChange={e => setReportMonth(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/30 transition-all"
              />
            </div>
            <button
              type="button"
              onClick={downloadMonthlyZip}
              disabled={zipping}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all text-sm disabled:opacity-50"
            >
              {zipping ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Tayyorlanmoqda...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4" />
                  Oylik ZIP yuklash
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Current shift */}
      {currentShift ? (
        <div className="bg-[#161923] rounded-2xl border border-emerald-500/15 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Joriy smena</h3>
                <p className="text-xs text-white/30">
                  {currentShift.admin} • {formatTimeTashkent(currentShift.startTime)} dan boshlab
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Faol</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniCard label="Kirim" value={formatUZS(currentShift.totalIncome)} color="emerald" icon={TrendingUp} />
            <MiniCard label="Chiqim" value={formatUZS(currentShift.totalExpense)} color="red" icon={TrendingDown} />
            <MiniCard label="Balans" value={formatUZS(currentShift.totalIncome - currentShift.totalExpense)} color="amber" icon={ClipboardList} />
            <MiniCard label="Operatsiyalar" value={currentTx.length.toString()} color="blue" icon={CheckCircle2} />
          </div>

          {currentTx.length > 0 && (
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Smena operatsiyalari</p>
              <div className="bg-black/20 rounded-xl divide-y divide-white/[0.04] max-h-60 overflow-y-auto">
                {currentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                      }`}>
                        {tx.type === 'income' ? (
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{tx.description}</p>
                        <p className="text-[10px] text-white/20">{tx.category}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatUZS(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => downloadShiftReport(currentShift, currentTx)}
              className="flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white font-medium py-3.5 rounded-xl transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              Yuklab olish
            </button>
            <button
              type="button"
              onClick={() => setShowClose(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-sm"
            >
              Smenani yopish
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-8 text-center">
          <AlertCircle className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">Faol smena yo'q</p>
          <p className="text-white/15 text-xs mt-1">Yangi smena boshlash uchun tizimga qayta kiring</p>
        </div>
      )}

      {/* Shift history */}
      <div>
        <h3 className="text-sm font-medium text-white/50 mb-3">Smenalar tarixi</h3>
        {shifts.length === 0 ? (
          <div className="bg-[#161923] rounded-2xl border border-white/[0.06] p-8 text-center">
            <ClipboardList className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">Hali smenalar tarixida ma'lumot yo'q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shifts.map(shift => {
              const isExpanded = expandedShift === shift.id
              const shiftTx = transactions.filter(t => t.shift === shift.id)
              return (
                <div key={shift.id} className="bg-[#161923] rounded-2xl border border-white/[0.06] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedShift(isExpanded ? null : shift.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-white/30" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{shift.admin}</p>
                        <p className="text-[11px] text-white/25">
                          {formatDateTashkent(shift.startTime)} •{' '}
                          {formatTimeTashkent(shift.startTime)}
                          {shift.endTime && ` — ${formatTimeTashkent(shift.endTime)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <span className="text-emerald-400">+{formatUZS(shift.totalIncome)}</span>
                        <span className="text-red-400">-{formatUZS(shift.totalExpense)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); downloadShiftReport(shift, shiftTx) }}
                        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                        title="Yuklab olish"
                      >
                        <Download className="w-3.5 h-3.5 text-white/40" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/20" /> : <ChevronDown className="w-4 h-4 text-white/20" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-emerald-500/5 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-emerald-400/50 uppercase">Kirim</p>
                          <p className="text-sm font-bold text-emerald-400">{formatUZS(shift.totalIncome)}</p>
                        </div>
                        <div className="bg-red-500/5 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-red-400/50 uppercase">Chiqim</p>
                          <p className="text-sm font-bold text-red-400">{formatUZS(shift.totalExpense)}</p>
                        </div>
                        <div className="bg-amber-500/5 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-amber-400/50 uppercase">Balans</p>
                          <p className="text-sm font-bold text-amber-400">{formatUZS(shift.totalIncome - shift.totalExpense)}</p>
                        </div>
                      </div>

                      {shift.notes && (
                        <div className="bg-white/[0.02] rounded-xl p-3">
                          <p className="text-[10px] text-white/25 uppercase mb-1">Izoh</p>
                          <p className="text-xs text-white/50">{shift.notes}</p>
                        </div>
                      )}

                      {shiftTx.length > 0 && (
                        <div className="bg-black/20 rounded-xl divide-y divide-white/[0.04] max-h-40 overflow-y-auto">
                          {shiftTx.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between px-3 py-2">
                              <span className="text-xs text-white/40 truncate flex-1">{tx.description}</span>
                              <span className={`text-xs font-medium ml-2 ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.type === 'income' ? '+' : '-'}{formatUZS(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Close shift dialog */}
      <Dialog open={showClose} onOpenChange={(open) => {
        if (!open && closeNotes.trim()) {
          if (!confirm('Izoh saqlanmagan. Yopilsinmi?')) return
        }
        setShowClose(open)
      }}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              Smenani yopish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {currentShift && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Kirim:</span>
                  <span className="text-emerald-400 font-semibold">{formatUZS(currentShift.totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">Chiqim:</span>
                  <span className="text-red-400 font-semibold">{formatUZS(currentShift.totalExpense)}</span>
                </div>
                <hr className="border-white/[0.06]" />
                <div className="flex justify-between text-sm">
                  <span className="text-white/50 font-medium">Balans:</span>
                  <span className="text-amber-400 font-bold">{formatUZS(currentShift.totalIncome - currentShift.totalExpense)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Smena izohi</label>
              <textarea
                value={closeNotes}
                onChange={e => setCloseNotes(e.target.value)}
                placeholder="Smenada nima bo'ldi, muhim holatlar..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowClose(false)}
                className="py-3 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-sm font-medium transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 text-sm"
              >
                Smenani yopish
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MiniCard({ label, value, color, icon: Icon }: {
  label: string; value: string; color: string; icon: React.ElementType
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/5 border-red-500/10 text-red-400',
    amber: 'bg-amber-500/5 border-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/5 border-blue-500/10 text-blue-400',
  }
  const iconColors: Record<string, string> = {
    emerald: 'text-emerald-400/50',
    red: 'text-red-400/50',
    amber: 'text-amber-400/50',
    blue: 'text-blue-400/50',
  }

  return (
    <div className={`${colors[color]} border rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3 h-3 ${iconColors[color]}`} />
        <span className="text-[10px] text-white/25 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  )
}
