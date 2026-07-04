import { useState, type FormEvent } from 'react';
import { login } from '../lib/api';
import { routeHref } from '../lib/routing';

export function StudentLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = await login(email.trim(), password, 'student');
    setSubmitting(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    window.location.hash = routeHref({ page: 'hub' }).slice(1);
  };

  const forgot = () => setMessage('Password recovery is not enabled yet. Please contact the administrator.');

  return <div className="student-login-page admin-login-page">
    <header className="admin-auth-header"><a href={routeHref({ page: 'landing' })} className="admin-auth-brand"><span>VC</span><strong>Virtual Classroom</strong></a><a href={routeHref({ page: 'landing' })}>&larr; Return to public site</a></header>
    <main className="admin-auth-main">
      <form className="admin-auth-panel student-auth-panel" onSubmit={submit}>
        <div className="student-flourish" aria-hidden="true">&#10087;</div><h1>Welcome Back</h1><div className="ornament-rule"><i /></div><p>Continue your learning journey.</p>
        <label>Email Address<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Password<input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <div className="student-login-options"><label className="show-password"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} /> Show password</label><button type="button" onClick={forgot}>Forgot password?</button></div>
        <button className="admin-signin" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Login'}</button>
        <p className="student-register">New to Virtual Classroom? <a href={routeHref({ page: 'register' })}>Create an account</a></p>
        <p className="auth-error" role="status">{message}</p>
      </form>
    </main>
    <footer className="admin-auth-footer">Developed and designed by Abhijit Kumar Misra.</footer>
  </div>;
}