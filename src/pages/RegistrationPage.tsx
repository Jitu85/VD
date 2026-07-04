import { useState, type FormEvent } from 'react';
import { startStudentRegistration, verifyStudentRegistration } from '../lib/api';
import { routeHref } from '../lib/routing';

const COUNTRIES = `Afghanistan,Albania,Algeria,Andorra,Angola,Antigua and Barbuda,Argentina,Armenia,Australia,Austria,Azerbaijan,Bahamas,Bahrain,Bangladesh,Barbados,Belarus,Belgium,Belize,Benin,Bhutan,Bolivia,Bosnia and Herzegovina,Botswana,Brazil,Brunei,Bulgaria,Burkina Faso,Burundi,Cabo Verde,Cambodia,Cameroon,Canada,Central African Republic,Chad,Chile,China,Colombia,Comoros,Congo Democratic Republic,Congo Republic,Costa Rica,Côte d’Ivoire,Croatia,Cuba,Cyprus,Czechia,Denmark,Djibouti,Dominica,Dominican Republic,Ecuador,Egypt,El Salvador,Equatorial Guinea,Eritrea,Estonia,Eswatini,Ethiopia,Fiji,Finland,France,Gabon,Gambia,Georgia,Germany,Ghana,Greece,Grenada,Guatemala,Guinea,Guinea-Bissau,Guyana,Haiti,Honduras,Hungary,Iceland,India,Indonesia,Iran,Iraq,Ireland,Israel,Italy,Jamaica,Japan,Jordan,Kazakhstan,Kenya,Kiribati,Kuwait,Kyrgyzstan,Laos,Latvia,Lebanon,Lesotho,Liberia,Libya,Liechtenstein,Lithuania,Luxembourg,Madagascar,Malawi,Malaysia,Maldives,Mali,Malta,Marshall Islands,Mauritania,Mauritius,Mexico,Micronesia,Moldova,Monaco,Mongolia,Montenegro,Morocco,Mozambique,Myanmar,Namibia,Nauru,Nepal,Netherlands,New Zealand,Nicaragua,Niger,Nigeria,North Korea,North Macedonia,Norway,Oman,Pakistan,Palau,Palestine,Panama,Papua New Guinea,Paraguay,Peru,Philippines,Poland,Portugal,Qatar,Romania,Russia,Rwanda,Saint Kitts and Nevis,Saint Lucia,Saint Vincent and the Grenadines,Samoa,San Marino,Sao Tome and Principe,Saudi Arabia,Senegal,Serbia,Seychelles,Sierra Leone,Singapore,Slovakia,Slovenia,Solomon Islands,Somalia,South Africa,South Korea,South Sudan,Spain,Sri Lanka,Sudan,Suriname,Sweden,Switzerland,Syria,Taiwan,Tajikistan,Tanzania,Thailand,Timor-Leste,Togo,Tonga,Trinidad and Tobago,Tunisia,Turkey,Turkmenistan,Tuvalu,Uganda,Ukraine,United Arab Emirates,United Kingdom,United States,Uruguay,Uzbekistan,Vanuatu,Vatican City,Venezuela,Vietnam,Yemen,Zambia,Zimbabwe`.split(',');

export function RegistrationPage() {
  const [form, setForm] = useState({ name: '', age: '', grade: '', school: '', email: '', password: '', confirm: '', phone: '', country: '' });
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const validCore = () => /^[\p{L} .'-]{2,}$/u.test(form.name)
    && Number(form.age) >= 4
    && Number(form.age) <= 18
    && Boolean(form.grade)
    && form.school.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    && form.password.length >= 10
    && form.password === form.confirm
    && /^\+[1-9][0-9 ()-]{7,18}$/.test(form.phone)
    && Boolean(form.country);

  const sendCode = async () => {
    if (!validCore()) {
      setMessage('Complete every field correctly. Use a 10-character password and a phone number with country code, such as +91 98765 43210.');
      return;
    }
    if (!consent) {
      setMessage('Parental or guardian consent is required for this student account.');
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await startStudentRegistration({
      fullName: form.name,
      age: Number(form.age),
      grade: form.grade,
      school: form.school,
      email: form.email.trim(),
      password: form.password,
      phone: form.phone,
      country: form.country,
      guardianConsent: true,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setCodeSent(true);
    setMessage('A six-digit Secret Code was sent to your email address.');
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!codeSent) {
      setMessage('Send a Secret Code first.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setMessage('Enter the six-digit Secret Code.');
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await verifyStudentRegistration(form.email.trim(), code);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    window.location.hash = routeHref({ page: 'hub' }).slice(1);
  };

  return <div className="registration-page">
    <header className="admin-auth-header"><a href={routeHref({ page: 'landing' })} className="admin-auth-brand"><span>VC</span><strong>Virtual Classroom</strong></a><a href={routeHref({ page: 'student-login' })}>&larr; Return to Login</a></header>
    <main className="registration-main"><form className="registration-panel" onSubmit={verify}>
      <h1>Create Your Account</h1><p className="registration-subtitle">Begin your learning journey.</p><div className="ornament-rule"><i /></div>
      <div className="registration-fields">
        <label>Full Name<input value={form.name} onChange={(event) => update('name', event.target.value)} minLength={2} required /></label>
        <label>Age<input type="number" min="4" max="18" value={form.age} onChange={(event) => update('age', event.target.value)} required /></label>
        <label>Class / Grade<select value={form.grade} onChange={(event) => update('grade', event.target.value)} required><option value="">Select class or grade</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label>
        <label>School Name<input value={form.school} onChange={(event) => update('school', event.target.value)} required /></label>
        <label>Email Address<input type="email" autoComplete="email" value={form.email} onChange={(event) => { update('email', event.target.value); setCodeSent(false); }} required /></label>
        <label>Password<input type="password" autoComplete="new-password" minLength={10} value={form.password} onChange={(event) => update('password', event.target.value)} required /></label>
        <label>Confirm Password<input type="password" autoComplete="new-password" minLength={10} value={form.confirm} onChange={(event) => update('confirm', event.target.value)} required /></label>
        <label>Phone Number<input type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></label>
        <label>Country<select value={form.country} onChange={(event) => update('country', event.target.value)} required><option value="">Select your country</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select></label>
      </div>
      <label className="guardian-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I am the parent or guardian of this student, and I consent to the creation of this account. <em>Required for users under 18.</em></span></label>
      <section className="verification-band" aria-labelledby="verify-heading"><div><h2 id="verify-heading">Verify Your Email</h2><p>Request a six-digit Secret Code, then enter it below.</p></div><button type="button" onClick={sendCode} disabled={busy}>{codeSent ? 'Resend Secret Code' : 'Send Secret Code'}</button><label>Secret Code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></label><strong className={codeSent ? 'verified' : ''}>{codeSent ? 'Code sent' : 'Not sent'}</strong></section>
      <p className="registration-message" role="status">{message}</p>
      <button className="create-account" type="submit" disabled={!codeSent || busy}>{busy ? 'Please wait…' : 'Verify & Create Account'}</button>
      <small>Your account is created only after the emailed code is verified.</small>
    </form></main>
    <footer className="admin-auth-footer">Developed and designed by Abhijit Kumar Misra.</footer>
  </div>;
}