import { useState } from 'react'
import { formatUZS } from '../types'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react'

const INCOME_CATS = ['Xona to\'lovi', 'Qo\'shimcha xizmat', 'Restoran', 'Transfer', 'Boshqa kirim']
const EXPENSE_CATS = ['Xodimlar maoshi', 'Kommunal', 'Tozalash', 'Oziq-ovqat', 'Ta\'mirlash', 'Boshqa chiqim']

export default function FinancePage() {
  const { transactions, addTransaction, deleteTransaction, editTransaction } = useData()
  const { admin } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [txType, setTxType] = useState<'income' | 'expense'>('income')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [dateFilter, setDateFilter] = useState('')

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filtered = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase()) && !tx.category.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (dateFilter && tx.date.split('T')[0] !== dateFilter) return false
    return true
  })

  // Reset page when filters change
  const filterKey = `${filterType}-${searchQuery}-${dateFilter}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPage(0)
  }

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleAdd = async () => {
    if (!category) { setFormError('Kategoriya tanlang'); return }
    if (!amount || Number(amount) <= 0) { setFormError('Summa 0 dan katta bo\'lishi kerak'); return }
    if (!description.trim()) { setFormError('Tavsif kiriting'); return }

    setSubmitting(true)
    setFormError('')
    try {
      const now = new Date()
      const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      const fullDate = txDate + timeStr

      await addTransaction({
        date: fullDate,
        type: txType,
        category,
        amount: Number(amount),
        description: description.trim(),
        roomNumber: roomNumber.trim() || undefined,
      })

      setShowAdd(false)
      setCategory('')
      setAmount('')
      setDescription('')
      setRoomNumber('')
      setTxDate(new Date().toISOString().split('T')[0])
    } catch (err: any) {
      setFormError(err.message || 'Xatolik yuz berdi')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id)
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err.message || 'O\'chirishda xatolik')
      setDeleteConfirm(null)
    }
  }

  const openEdit = (tx: typeof transactions[0]) => {
    setEditId(tx.id)
    setEditCategory(tx.category)
    setEditAmount(String(tx.amount))
    setEditDescription(tx.description)
    setFormError('')
  }

  const handleEdit = async () => {
    if (!editId) return
    if (!editDescription.trim()) { setFormError('Tavsif kiriting'); return }
    if (!editAmount || Number(editAmount) <= 0) { setFormError('Summa 0 dan katta bo\'lishi kerak'); return }

    setSubmitting(true)
    setFormError('')
    try {
      await editTransaction(editId, {
        description: editDescription.trim(),
        amount: Number(editAmount),
        category: editCategory,
      })
      setEditId(null)
    } catch (err: any) {
      setFormError(err.message || 'Tahrirlashda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const canModify = (txAdmin: string) => {
    return admin?.role === 'super_admin' || txAdmin === admin?.name
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>Moliya</h2>
          <p className="text-white/30 text-sm mt-1">Kirim va chiqimlarni boshqaring</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Qo'shish
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-emerald-400/60 uppercase tracking-wider">Kirim</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatUZS(totalIncome)}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-[10px] text-red-400/60 uppercase tracking-wider">Chiqim</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatUZS(totalExpense)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] text-amber-400/60 uppercase tracking-wider">Balans</span>
          </div>
          <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
            {formatUZS(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Qidirish..."
            className="w-full bg-[#161923] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterType === t
                  ? t === 'income' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : t === 'expense' ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
              }`}
            >
              {t === 'all' ? 'Barchasi' : t === 'income' ? 'Kirim' : 'Chiqim'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Calendar className="w-3.5 h-3.5 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="bg-[#161923] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-xs text-white/50 focus:outline-none focus:border-amber-500/30"
          />
        </div>
      </div>

      {/* Transactions list */}
      <div className="bg-[#161923] rounded-2xl border border-white/[0.06] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">Operatsiyalar topilmadi</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-white/25 mt-0.5">
                      <span>{tx.category}</span>
                      {tx.roomNumber && <><span>•</span><span>{tx.roomNumber}-xona</span></>}
                      <span>•</span>
                      <span>{tx.admin}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatUZS(tx.amount)}
                    </p>
                    <p className="text-[10px] text-white/20 mt-0.5">
                      {new Date(tx.date).toLocaleDateString('uz-UZ')} {new Date(tx.date).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {canModify(tx.admin) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(tx) }}
                        className="p-1.5 rounded-lg hover:bg-amber-500/10 text-white/30 hover:text-amber-400 transition-all"
                        title="Tahrirlash"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deleteConfirm === tx.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(tx.id) }}
                            className="px-2 py-1 bg-red-500/15 text-red-400 rounded-lg text-[10px] font-medium border border-red-500/20"
                          >
                            Ha
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                            className="px-2 py-1 bg-white/[0.05] text-white/40 rounded-lg text-[10px] font-medium border border-white/[0.06]"
                          >
                            Yo'q
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(tx.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
                          title="O'chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
            <span className="text-xs text-white/25">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length} ta
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] text-white/40 border border-white/[0.06] disabled:opacity-30 hover:text-white/60 transition-all"
              >
                Oldingi
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= filtered.length}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] text-white/40 border border-white/[0.06] disabled:opacity-30 hover:text-white/60 transition-all"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add transaction dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Yangi operatsiya
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setTxType('income'); setCategory('') }}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  txType === 'income'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                }`}
              >
                Kirim
              </button>
              <button
                onClick={() => { setTxType('expense'); setCategory('') }}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  txType === 'expense'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                }`}
              >
                Chiqim
              </button>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-2">Kategoriya</label>
              <div className="flex flex-wrap gap-1.5">
                {(txType === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      category === c
                        ? txType === 'income'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        : 'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Summa (so'm)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 text-lg font-semibold"
              />
            </div>

            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Tavsif</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Nima uchun..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Xona raqami (ixtiyoriy)</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="301"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Sana</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={e => setTxDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
                />
              </div>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                {formError}
              </div>
            )}
            <button
              onClick={handleAdd}
              disabled={submitting}
              className={`w-full font-semibold py-3 rounded-xl shadow-lg text-sm transition-all disabled:opacity-50 ${
                txType === 'income'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20'
              }`}
            >
              {submitting ? 'Qo\'shilmoqda...' : `${txType === 'income' ? 'Kirim' : 'Chiqim'} qo'shish`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit transaction dialog */}
      <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
        <DialogContent className="bg-[#1a1d2a] border-white/[0.08] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Tranzaksiyani tahrirlash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Kategoriya</label>
              <input
                type="text"
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Summa (so'm)</label>
              <input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 text-lg font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-1.5">Tavsif</label>
              <input
                type="text"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
              />
            </div>
            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setEditId(null); setFormError('') }}
                disabled={submitting}
                className="py-3 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 text-sm font-medium transition-colors disabled:opacity-50">
                Bekor qilish
              </button>
              <button type="button" onClick={handleEdit}
                disabled={submitting}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 text-sm disabled:opacity-50">
                {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
