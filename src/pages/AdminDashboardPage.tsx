import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  archiveAdminModule,
  createAdminModule,
  fetchAdminDashboard,
  fetchSession,
  logout,
  updateAdminModule,
  updateGuestLogin,
  type AdminDashboardData,
  type AdminModule,
  type SessionUser,
} from '../lib/api';
import { routeHref } from '../lib/routing';

type StudentStatus = 'all' | 'pending' | 'active' | 'disabled';
type ModuleDraft = Omit<AdminModule, 'updatedAt'>;

const STATUS_LABELS: Record<AdminModule['status'], string> = {
  draft: 'Draft',
  coming_soon: 'Coming soon',
  published: 'Published',
  archived: 'Archived',
};

export function AdminDashboardPage() {
  const [session, setSession] = useState<SessionUser | null | undefined>(undefined);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StudentStatus>('all');
  const [activeSection, setActiveSection] = useState('Overview');
  const [editor, setEditor] = useState<ModuleDraft | null>(null);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadDashboard = useCallback(async (
    filters: { query?: string; status?: StudentStatus; cursor?: string } = {},
  ) => fetchAdminDashboard({ ...filters, limit: 25 }), []);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchSession(), loadDashboard()]).then(([sessionResult, dashboardResult]) => {
      if (!active) return;
      setSession(sessionResult.ok && sessionResult.data.user.role === 'administrator' ? sessionResult.data.user : null);
      if (dashboardResult.ok) setDashboard(dashboardResult.data);
      else if (dashboardResult.code !== 'AUTHENTICATION_REQUIRED' && dashboardResult.code !== 'ADMINISTRATOR_REQUIRED') {
        setMessage(dashboardResult.message);
      }
    });
    return () => { active = false; };
  }, [loadDashboard]);

  if (session === undefined) return <div className="admin-denied"><h1>Checking administrator session...</h1></div>;
  if (!session) return <div className="admin-denied"><h1>Administrator session required</h1><p>Please sign in before opening the dashboard.</p><a href={routeHref({ page: 'admin-login' })}>Go to Administrator Access</a></div>;
  if (!dashboard) return <div className="admin-denied"><h1>Loading administration data...</h1><p>{message}</p></div>;

  const applyStudentFilters = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await loadDashboard({ query, status });
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    setDashboard(result.data);
    setMessage('Student ledger updated.');
  };

  const loadMoreStudents = async () => {
    if (!dashboard.nextCursor) return;
    setBusy(true);
    const result = await loadDashboard({ query, status, cursor: dashboard.nextCursor });
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    setDashboard((current) => current ? {
      ...result.data,
      students: [...current.students, ...result.data.students],
    } : result.data);
  };

  const toggleGuest = async () => {
    const enabled = !dashboard.guestLoginEnabled;
    setBusy(true);
    const result = await updateGuestLogin(enabled);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    setDashboard((current) => current ? { ...current, guestLoginEnabled: enabled } : current);
    setMessage(`Guest Login is now ${enabled ? 'enabled' : 'disabled'}.`);
  };

  const beginAddModule = () => {
    let ordinal = dashboard.modules.length + 1;
    let code = String.fromCharCode(64 + Math.min(26, ordinal));
    while (dashboard.modules.some((module) => module.code === code) && ordinal < 26) {
      ordinal += 1;
      code = String.fromCharCode(64 + ordinal);
    }
    setEditingCode(null);
    setEditor({
      code,
      title: `Learning Module ${code}`,
      description: 'New learning content is being prepared.',
      status: 'draft',
      routeSlug: `module-${code.toLowerCase()}`,
      sortOrder: ordinal * 10,
    });
    setMessage('');
  };

  const beginEditModule = (module: AdminModule) => {
    const { updatedAt: _updatedAt, ...draft } = module;
    setEditingCode(module.code);
    setEditor(draft);
    setMessage('');
  };

  const saveModule = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    setBusy(true);
    const result = editingCode
      ? await updateAdminModule(editingCode, {
          title: editor.title,
          description: editor.description,
          status: editor.status,
          routeSlug: editor.routeSlug,
          sortOrder: editor.sortOrder,
        })
      : await createAdminModule(editor);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    setDashboard((current) => {
      if (!current) return current;
      const previous = current.modules.find((module) => module.code === result.data.module.code);
      const wasActive = previous ? previous.status !== 'archived' : false;
      const isActive = result.data.module.status !== 'archived';
      const activeDelta = Number(isActive) - Number(wasActive);
      return {
        ...current,
        modules: [...current.modules.filter((module) => module.code !== result.data.module.code), result.data.module]
          .sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code)),
        summary: {
          ...current.summary,
          activeModules: Math.max(0, current.summary.activeModules + activeDelta),
        },
      };
    });
    setEditor(null);
    setEditingCode(null);
    setMessage(`Module ${result.data.module.code} saved.`);
  };

  const archiveModule = async (code: string) => {
    if (!window.confirm(`Archive Module ${code}? It will disappear from the public library.`)) return;
    setBusy(true);
    const result = await archiveAdminModule(code);
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    setDashboard((current) => current ? {
      ...current,
      modules: current.modules.map((module) => module.code === code ? result.data.module : module),
      summary: { ...current.summary, activeModules: Math.max(0, current.summary.activeModules - 1) },
    } : current);
    setMessage(`Module ${code} archived.`);
  };

  const signOut = async () => {
    await logout();
    window.location.hash = routeHref({ page: 'admin-login' }).slice(1);
  };

  const summary = [
    ['Registered Students', dashboard.summary.registeredStudents],
    ['Verified Accounts', dashboard.summary.verifiedAccounts],
    ['Schools', dashboard.summary.schools],
    ['Active Modules', dashboard.summary.activeModules],
  ] as const;

  return <div className="admin-dashboard">
    <header className="admin-topbar"><a href={routeHref({ page: 'landing' })}><span>VC</span><strong>Virtual Classroom Administration</strong></a><div><b>{session.displayName}</b><button type="button" onClick={signOut}>Sign out</button></div></header>
    <div className="admin-shell">
      <aside className="admin-sidebar"><nav aria-label="Administration">{['Overview', 'Students', 'Schools', 'Content Modules', 'Access Settings'].map((item) => <button key={item} className={activeSection === item ? 'active' : ''} type="button" onClick={() => setActiveSection(item)}>{item}</button>)}</nav></aside>
      <main className="admin-workspace">
        <h1>Administration Overview</h1>
        <p className="admin-status" role="status">{message}</p>
        <section className="admin-summary" aria-label="Platform summary">{summary.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
        <div className="admin-content-grid">
          <section className="admin-ledger"><h2>Student Ledger</h2><form className="ledger-tools" onSubmit={applyStudentFilters}><input aria-label="Search students" placeholder="Search students" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Account status" value={status} onChange={(event) => setStatus(event.target.value as StudentStatus)}><option value="all">All account statuses</option><option value="active">Verified</option><option value="pending">Pending</option><option value="disabled">Disabled</option></select><button type="submit" disabled={busy}>Apply</button></form><div className="admin-table-wrap"><table><thead><tr><th>Student</th><th>Age</th><th>Class</th><th>School</th><th>Email</th><th>Status</th></tr></thead><tbody>{dashboard.students.map((student) => <tr key={student.publicId}><td>{student.name}</td><td>{student.age}</td><td>{student.grade}</td><td>{student.school}</td><td>{student.email}</td><td>{student.status === 'active' ? 'Verified' : student.status === 'pending' ? 'Pending' : 'Disabled'}</td></tr>)}</tbody></table></div>{dashboard.students.length === 0 ? <p>No students match these filters.</p> : <p>Showing {dashboard.students.length} of {dashboard.summary.registeredStudents} students</p>}{dashboard.nextCursor ? <button className="load-more" type="button" onClick={loadMoreStudents} disabled={busy}>Load more students</button> : null}</section>
          <div className="admin-side-stack">
            <section className="admin-access"><h2>Access Settings</h2><div><div><strong>Guest Login</strong><p>Allow visitors to access published content without creating an account.</p></div><button type="button" className={dashboard.guestLoginEnabled ? 'on' : ''} onClick={toggleGuest} aria-pressed={dashboard.guestLoginEnabled} disabled={busy}><span>{dashboard.guestLoginEnabled ? 'On' : 'Off'}</span><i /></button></div></section>
            <section className="admin-modules"><h2>Content Modules</h2><table><thead><tr><th>Module</th><th>Title</th><th>Status</th><th>Actions</th></tr></thead><tbody>{dashboard.modules.map((module) => <tr key={module.code}><td>Module {module.code}</td><td>{module.title}</td><td>{STATUS_LABELS[module.status]}</td><td><button type="button" onClick={() => beginEditModule(module)}>Edit</button><button type="button" onClick={() => archiveModule(module.code)} disabled={module.code === 'A' || module.status === 'archived' || busy}>Archive</button></td></tr>)}</tbody></table><button className="add-module" type="button" onClick={beginAddModule}>+ Add module</button>
              {editor ? <form className="module-editor" onSubmit={saveModule}><h3>{editingCode ? `Edit Module ${editingCode}` : 'Add Content Module'}</h3><label>Code<input value={editor.code} onChange={(event) => setEditor({ ...editor, code: event.target.value.toUpperCase() })} disabled={Boolean(editingCode)} maxLength={6} required /></label><label>Title<input value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} required /></label><label>Description<textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label><label>Route<input value={editor.routeSlug} onChange={(event) => setEditor({ ...editor, routeSlug: event.target.value.toLowerCase() })} required /></label><div><label>Status<select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as AdminModule['status'] })}><option value="draft">Draft</option><option value="coming_soon">Coming soon</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label>Order<input type="number" min="0" max="32767" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} required /></label></div><div className="module-editor-actions"><button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save module'}</button><button type="button" onClick={() => setEditor(null)}>Cancel</button></div></form> : null}
            </section>
          </div>
        </div>
        <section className="usage-overview"><h2>Usage Overview <small>(Last 30 Days)</small></h2><div><label>Active Users <span>{dashboard.usage.activeUsers}</span><i><b style={{ width: `${Math.min(100, dashboard.usage.activeUsers)}%` }} /></i></label><label>Questions Answered <span>{dashboard.usage.answeredQuestions}</span><i><b style={{ width: `${Math.min(100, dashboard.usage.answeredQuestions)}%` }} /></i></label></div></section>
      </main>
    </div>
  </div>;
}