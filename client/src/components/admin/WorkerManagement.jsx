import { useState } from 'react'
import { Briefcase, Plus, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, Loader2, X, UserPlus, Users } from 'lucide-react'
import { adminService } from '../../services/admin.service'
import { toast } from 'react-toastify'

const DEPARTMENTS = [
  'Electrical', 'Plumbing', 'Furniture', 'Cleanliness',
  'AC/Ventilation', 'Internet/WiFi', 'Infrastructure', 'Security', 'General'
]

const EMPTY_FORM = { name: '', email: '', password: '', department: '', phone: '' }

const WorkerManagement = ({ workers = [], onRefresh }) => {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const getWorkloadColor = (count) => {
    if (count >= 5) return 'bg-red-100 text-red-700'
    if (count >= 3) return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  const getBar = (count) => {
    const pct = Math.min((count / 8) * 100, 100)
    const color = count >= 5 ? 'bg-red-500' : count >= 3 ? 'bg-amber-400' : 'bg-emerald-500'
    return { pct, color }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminService.createWorker(form)
      toast.success(`Worker "${form.name}" created successfully`)
      setForm(EMPTY_FORM)
      setShowForm(false)
      onRefresh?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create worker')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id) => {
    setTogglingId(id)
    try {
      const res = await adminService.toggleWorkerStatus(id)
      toast.success(`Worker ${res.isActive ? 'activated' : 'deactivated'}`)
      onRefresh?.()
    } catch {
      toast.error('Failed to update worker status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await adminService.deleteWorker(id)
      toast.success('Worker deleted')
      setConfirmDeleteId(null)
      onRefresh?.()
    } catch {
      toast.error('Failed to delete worker')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-xl">
              <Users size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Worker Management</h2>
              <p className="text-xs text-gray-500">Manage worker accounts — only admin-created workers can log in</p>
            </div>
            <span className="ml-1 text-xs bg-purple-100 text-purple-700 font-semibold px-2.5 py-1 rounded-full">
              {workers.length} workers
            </span>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-purple-200 hover:brightness-105 active:scale-95 transition-all"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Cancel' : 'Add Worker'}
          </button>
        </div>

        {/* Add Worker Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-100 rounded-lg"><UserPlus size={14} className="text-purple-600" /></div>
              <h3 className="font-semibold text-gray-800 text-sm">New Worker Account</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input-field" placeholder="e.g. Rajesh Kumar" required
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input-field" type="email" placeholder="worker@college.edu" required
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input className="input-field pr-10" type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" required minLength={6}
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Department *</label>
                <select className="input-field" required value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Phone (optional)</label>
                <input className="input-field" placeholder="9876543210"
                  value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-sm hover:brightness-105 active:scale-95 transition-all disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" />Creating…</> : <><UserPlus size={14} />Create Worker</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Workers table */}
      <div className="card overflow-hidden p-0">
        {workers.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={22} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500">No workers yet</p>
            <p className="text-xs text-gray-400 mt-1">Use "Add Worker" to create worker accounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Worker</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Department</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Active</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Workload</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {workers.map(w => {
                  const { pct, color } = getBar(w.activeComplaintCount ?? 0)
                  return (
                    <tr key={w._id} className="hover:bg-purple-50/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {w.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{w.name}</div>
                            <div className="text-xs text-gray-400">{w.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                          <Briefcase size={12} className="text-gray-400" /> {w.department}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getWorkloadColor(w.activeComplaintCount ?? 0)}`}>
                          {w.activeComplaintCount ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 w-36">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{w.completedCount ?? 0} resolved</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          w.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${w.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {w.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle */}
                          <button
                            title={w.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggle(w._id)}
                            disabled={togglingId === w._id}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-purple-600"
                          >
                            {togglingId === w._id
                              ? <Loader2 size={16} className="animate-spin" />
                              : w.isActive ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />
                            }
                          </button>
                          {/* Delete */}
                          {confirmDeleteId === w._id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600 font-medium">Sure?</span>
                              <button onClick={() => handleDelete(w._id)} disabled={deletingId === w._id}
                                className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-lg hover:bg-red-600 transition-colors">
                                {deletingId === w._id ? '…' : 'Yes'}
                              </button>
                              <button onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-gray-500 hover:bg-gray-100 px-2 py-0.5 rounded-lg transition-colors">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(w._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkerManagement
