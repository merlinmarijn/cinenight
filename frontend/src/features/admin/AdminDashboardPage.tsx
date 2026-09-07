import { useEffect, useMemo, useState } from 'react';
import {
    Ban, Check, Crown, Loader2, Pencil, Search, ShieldCheck, TicketCheck, Trash2, UserRound, X,
} from 'lucide-react';
import { deleteUser, fetchUsers, updateUser, type AdminUserDto, type UserRole, type UserStatus } from '@/api/admin';
import ConfirmModal from '@/components/ConfirmModal';

type Draft = Pick<AdminUserDto, 'displayName' | 'role' | 'status' | 'canCreateGroups'>;

export default function AdminDashboardPage({ currentUserId }: { currentUserId: number }) {
    const [users, setUsers] = useState<AdminUserDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AdminUserDto | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        void fetchUsers().then(result => {
            if (result.ok) setUsers(result.data);
            else setError(result.error);
            setLoading(false);
        });
    }, []);

    const filteredUsers = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return users;
        return users.filter(user => `${user.displayName} ${user.email ?? ''} ${user.role}`.toLowerCase().includes(needle));
    }, [query, users]);

    const counts = useMemo(() => users.reduce((result, user) => {
        result.total += 1;
        if (user.role === 'ADMIN') result.admins += 1;
        if (user.role === 'VIP') result.vips += 1;
        if (user.status === 'DISABLED') result.disabled += 1;
        return result;
    }, { total: 0, admins: 0, vips: 0, disabled: 0 }), [users]);

    const beginEdit = (user: AdminUserDto) => {
        setEditingId(user.id);
        setDraft({
            displayName: user.displayName,
            role: user.role,
            status: user.status,
            canCreateGroups: user.canCreateGroups,
        });
        setError(null);
    };

    const saveEdit = async () => {
        if (editingId == null || draft == null) return;
        setSaving(true);
        setError(null);
        const result = await updateUser(editingId, draft);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setUsers(current => current.map(user => user.id === editingId ? result.data : user));
        const changedCurrentAdmin = editingId === currentUserId && (result.data.role !== 'ADMIN' || result.data.status !== 'ACTIVE');
        setEditingId(null);
        setDraft(null);
        if (changedCurrentAdmin) window.location.assign('/dashboard');
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setError(null);
        const result = await deleteUser(deleteTarget.id);
        setDeleting(false);
        if (!result.ok) {
            setError(result.error);
            setDeleteTarget(null);
            return;
        }
        setUsers(current => current.filter(user => user.id !== deleteTarget.id));
        const deletedSelf = deleteTarget.id === currentUserId;
        setDeleteTarget(null);
        if (deletedSelf) window.location.assign('/login');
    };

    return (
        <div className="admin-shell mx-auto max-w-7xl pb-16">
            <section className="relative overflow-hidden border-b border-amber-200/15 px-1 pb-10 pt-4">
                <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
                    <ShieldCheck className="h-4 w-4" /> House controls
                </p>
                <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <h1 className="max-w-3xl text-4xl font-black tracking-tight text-stone-50 md:text-5xl">Manage the guest list.</h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-stone-400">Assign access levels, pause accounts, and decide which normal users can start new groups.</p>
                    </div>
                    <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-white/10 bg-stone-900/70">
                        <Metric value={counts.total} label="Accounts" />
                        <Metric value={counts.admins} label="Admins" />
                        <Metric value={counts.vips} label="VIPs" />
                        <Metric value={counts.disabled} label="Banned" />
                    </div>
                </div>
            </section>

            <section className="pt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">User accounts</h2>
                        <p className="mt-1 text-sm text-stone-500">Changes take effect on the account’s next request.</p>
                    </div>
                    <label className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-stone-900 px-4 sm:max-w-sm focus-within:border-amber-300/50">
                        <Search className="h-4 w-4 text-stone-500" />
                        <span className="sr-only">Search users</span>
                        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or role" className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-stone-600" />
                    </label>
                </div>

                {error ? <div role="alert" className="mt-5 flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"><Ban className="h-4 w-4 shrink-0" />{error}</div> : null}

                {loading ? <div className="flex min-h-64 items-center justify-center text-stone-400"><Loader2 className="mr-3 h-5 w-5 animate-spin" />Loading accounts…</div> : (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-stone-900/45">
                        <div className="hidden grid-cols-[minmax(220px,1.5fr)_110px_120px_160px_104px] gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500 lg:grid">
                            <span>Account</span><span>Access</span><span>Status</span><span>Create groups</span><span className="text-right">Actions</span>
                        </div>
                        {filteredUsers.length === 0 ? <div className="px-5 py-16 text-center text-stone-500">No accounts match that search.</div> : filteredUsers.map(user => (
                            <UserRow
                                key={user.id}
                                user={user}
                                isCurrent={user.id === currentUserId}
                                editing={editingId === user.id}
                                draft={editingId === user.id ? draft : null}
                                saving={saving}
                                onEdit={() => beginEdit(user)}
                                onCancel={() => { setEditingId(null); setDraft(null); }}
                                onDraft={setDraft}
                                onSave={saveEdit}
                                onDelete={() => setDeleteTarget(user)}
                            />
                        ))}
                    </div>
                )}
            </section>

            <ConfirmModal
                isOpen={deleteTarget != null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Remove account?"
                description={`${deleteTarget?.displayName ?? 'This user'} will be permanently removed. Their group memberships, votes, and RSVPs will also be deleted.`}
                confirmText="Remove account"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
}

function Metric({ value, label }: { value: number; label: string }) {
    return <div className="border-r border-white/10 px-4 py-3 text-center last:border-r-0"><div className="text-xl font-black text-stone-100">{value}</div><div className="mt-0.5 text-[10px] uppercase tracking-wider text-stone-500">{label}</div></div>;
}

function UserRow({ user, isCurrent, editing, draft, saving, onEdit, onCancel, onDraft, onSave, onDelete }: {
    user: AdminUserDto;
    isCurrent: boolean;
    editing: boolean;
    draft: Draft | null;
    saving: boolean;
    onEdit: () => void;
    onCancel: () => void;
    onDraft: (draft: Draft) => void;
    onSave: () => void;
    onDelete: () => void;
}) {
    if (editing && draft) {
        return <div className="grid gap-4 border-b border-white/[0.07] bg-amber-200/[0.035] px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(220px,1.5fr)_110px_120px_160px_104px] lg:items-center">
            <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">Display name<input value={draft.displayName} onChange={event => onDraft({ ...draft, displayName: event.target.value })} minLength={2} maxLength={100} className="mt-1.5 w-full rounded-lg border border-white/10 bg-stone-950 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-amber-300/50" /></label>
            <FieldLabel label="Access"><select value={draft.role} onChange={event => onDraft({ ...draft, role: event.target.value as UserRole })} className="admin-select"><option value="USER">Normal</option><option value="VIP">VIP</option><option value="ADMIN">Admin</option></select></FieldLabel>
            <FieldLabel label="Status"><select value={draft.status} onChange={event => onDraft({ ...draft, status: event.target.value as UserStatus })} className="admin-select"><option value="ACTIVE">Active</option><option value="DISABLED">Banned</option></select></FieldLabel>
            <label className={`flex items-center gap-3 text-sm ${draft.role !== 'USER' ? 'text-stone-600' : 'text-stone-300'}`}><input type="checkbox" checked={draft.role !== 'USER' || draft.canCreateGroups} disabled={draft.role !== 'USER'} onChange={event => onDraft({ ...draft, canCreateGroups: event.target.checked })} className="h-4 w-4 accent-amber-300" />Allowed</label>
            <div className="flex justify-end gap-2"><IconButton label="Cancel" onClick={onCancel}><X /></IconButton><IconButton label="Save" onClick={onSave} disabled={saving || draft.displayName.trim().length < 2} accent>{saving ? <Loader2 className="animate-spin" /> : <Check />}</IconButton></div>
        </div>;
    }

    return <div className={`grid gap-4 border-b border-white/[0.07] px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(220px,1.5fr)_110px_120px_160px_104px] lg:items-center ${user.status === 'DISABLED' ? 'opacity-60' : ''}`}>
        <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${user.role === 'ADMIN' ? 'bg-amber-300 text-stone-950' : user.role === 'VIP' ? 'bg-fuchsia-400/15 text-fuchsia-300' : 'bg-stone-800 text-stone-400'}`}>{user.role === 'ADMIN' ? <Crown className="h-4 w-4" /> : user.role === 'VIP' ? <TicketCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}</div>
            <div className="min-w-0"><div className="truncate font-semibold text-stone-100">{user.displayName}{isCurrent ? <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">You</span> : null}</div><div className="truncate text-xs text-stone-500">{user.email ?? `Guest account · joined ${new Date(user.createdAt).toLocaleDateString()}`}</div></div>
        </div>
        <div><RoleBadge role={user.role} /></div>
        <div className={`flex items-center gap-2 text-sm ${user.status === 'ACTIVE' ? 'text-emerald-300' : 'text-red-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-red-400'}`} />{user.status === 'ACTIVE' ? 'Active' : 'Banned'}</div>
        <div className="flex items-center gap-2 text-sm text-stone-400">{user.role !== 'USER' || user.canCreateGroups ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-red-400" />}{user.role !== 'USER' ? 'Included with role' : user.canCreateGroups ? 'Allowed' : 'Not allowed'}</div>
        <div className="flex justify-end gap-2"><IconButton label="Edit user" onClick={onEdit}><Pencil /></IconButton><IconButton label="Remove user" onClick={onDelete} danger><Trash2 /></IconButton></div>
    </div>;
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}{children}</label>;
}

function RoleBadge({ role }: { role: UserRole }) {
    const style = role === 'ADMIN' ? 'bg-amber-300/10 text-amber-300' : role === 'VIP' ? 'bg-fuchsia-400/10 text-fuchsia-300' : 'bg-stone-800 text-stone-400';
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${style}`}>{role === 'USER' ? 'Normal' : role}</span>;
}

function IconButton({ label, onClick, children, disabled, accent, danger }: { label: string; onClick: () => void; children: React.ReactElement<{ className?: string }>; disabled?: boolean; accent?: boolean; danger?: boolean }) {
    const style = accent ? 'bg-amber-300 text-stone-950 hover:bg-amber-200' : danger ? 'text-stone-500 hover:bg-red-400/10 hover:text-red-300' : 'text-stone-400 hover:bg-white/5 hover:text-white';
    return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={`grid h-9 w-9 place-items-center rounded-lg transition disabled:opacity-40 ${style}`}>{children}</button>;
}
