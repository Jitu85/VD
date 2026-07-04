import { useState, type FormEvent } from 'react';
import { login } from '../lib/api';
import { routeHref } from '../lib/routing';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await login(email.trim(), password, 'administrator');
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    window.location.hash = routeHref({ page: 'admin' }).slice(1);
  };

  return <div className="admin-login-page">
    <header className="admin-auth-header"><a href={routeHref({ page: 'landing' })} className="admin-auth-brand"><span>VC</span><strong>Virtual Classroom</strong></a><a href={routeHref({ page: 'landing' })}>&larr; Return to public site</a></header>
    <main className="admin-auth-main">
      <form className="admin-auth-panel" onSubmit={submit}>
        <h1>Administrator Access</h1><div className="ornament-rule"><i /></div><p>Authorised personnel only.</p>
        <label>Admin Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label className="show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label>
        <button className="admin-signin" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in securely'}</button>
        <p className="auth-error" role="alert">{error}</p>
      </form>
    </main>
    <footer className="admin-auth-footer">Developed and designed by Abhijit Kumar Misra.</footer>
  </div>;
}