import { useEffect, useState } from 'react';
import { Search, Trash2, Shield, User as UserIcon, MoreVertical, Building2, TrendingUp, Users as UsersIcon } from 'lucide-react';
import type { User } from '../types';
import { deleteUser, loadUsers } from '../data';
import { formatPeso, formatNumber } from './ui';
import { Modal } from './Modal';

export function UsersPage({ paperCostPerSheet }: { paperCostPerSheet: number }) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void loadUsers().then((loadedUsers) => {
      if (active) setUsers(loadedUsers);
    }).catch((loadError: unknown) => {
      if (active) setUsersError(loadError instanceof Error ? loadError.message : 'Unable to load Supabase users.');
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleDeleteUser = async () => {
    if (!userToDelete || userToDelete.role === 'admin') return;

    setIsDeleting(true);
    setUsersError('');
    try {
      await deleteUser(userToDelete.id);
      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (deleteError) {
      setUsersError(deleteError instanceof Error ? `Unable to delete user: ${deleteError.message}` : 'Unable to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    if (u.role === 'admin') return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter !== 'All' && u.department !== deptFilter) return false;
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    return true;
  });

  const totalSheets = users.reduce((s, u) => s + u.totalSheets, 0);
  const totalCost = totalSheets * paperCostPerSheet;
  const activeUsers = users.filter((u) => u.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">{users.filter(u => u.role !== 'admin').length} users · {activeUsers} active</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <UsersIcon size={20} className="text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Users</p>
              <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.role !== 'admin').length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Sheets</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(totalSheets)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Building2 size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase">Total Cost</p>
              <p className="text-2xl font-bold text-slate-900">{formatPeso(totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {usersError && <p role="alert" className="text-sm text-red-600">{usersError}</p>}
      {isLoading && <p role="status" className="text-sm text-slate-500">Loading users from Supabase…</p>}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option>All</option>
            {[...new Set(users.map((user) => user.department).filter(Boolean))].sort().map((department) => <option key={department}>{department}</option>)}
          </select>
          <select className="input w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* User table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Department</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Total Sheets</th>
                <th className="text-right px-4 py-3 font-medium">Monthly</th>
                <th className="text-right px-4 py-3 font-medium">Office</th>
                <th className="text-right px-4 py-3 font-medium">Personal</th>
                <th className="text-right px-4 py-3 font-medium">Cost</th>
                <th className="text-center px-4 py-3 font-medium">Printing</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <UserRow key={u.id} user={u} paperCostPerSheet={paperCostPerSheet} onDelete={() => setUserToDelete(u)} />
              ))}
              {!isLoading && !usersError && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">No users found in Supabase.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={userToDelete !== null}
        onClose={() => {
          if (!isDeleting) setUserToDelete(null);
        }}
        title="Delete user?"
        subtitle="This action cannot be undone."
        footer={(
          <>
            <button onClick={() => setUserToDelete(null)} className="btn-secondary" disabled={isDeleting}>Cancel</button>
            <button onClick={handleDeleteUser} className="btn-primary bg-red-600 hover:bg-red-700" disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete user'}
            </button>
          </>
        )}
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold text-slate-900">{userToDelete?.name}</span> ({userToDelete?.email})?
          This permanently deletes the Supabase Auth account, its profile, and associated print history.
        </p>
      </Modal>
    </div>
  );
}

function UserRow({ user, paperCostPerSheet, onDelete }: { user: User; paperCostPerSheet: number; onDelete: () => void }) {
  return (
    <tr className="hover:bg-slate-50/50 transition">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-semibold">
            {user.avatar}
          </div>
          <div>
            <p className="font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-600">{user.department}</td>
      <td className="px-4 py-3">
        <span className={`badge ${user.role === 'admin' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
          {user.role === 'admin' ? <><Shield size={11} /> Admin</> : <><UserIcon size={11} /> User</>}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {user.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatNumber(user.totalSheets)}</td>
      <td className="px-4 py-3 text-right text-slate-600">{user.monthlySheets}</td>
      <td className="px-4 py-3 text-right text-brand-600 font-medium">{user.officeSheets}</td>
      <td className="px-4 py-3 text-right text-amber-600 font-medium">{user.personalSheets}</td>
      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPeso(user.totalSheets * paperCostPerSheet)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`badge ${user.printingAllowed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {user.printingAllowed ? 'Allowed' : 'Blocked'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <MoreVertical size={15} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${user.name}`}
            title={`Delete ${user.name}`}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
