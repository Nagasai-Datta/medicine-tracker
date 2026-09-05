import { useState } from 'react';
import { signIn } from '../db';

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (!email.trim() || !password) {
      setErr('Enter email and password');
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      onSignedIn();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-add-box">
      <input
        className="mt-input"
        type="email"
        inputMode="email"
        autoComplete="username"
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErr('');
        }}
      />
      <input
        className="mt-input"
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setErr('');
        }}
      />
      {err && <div className="mt-error">{err}</div>}
      <button type="button" className="mt-primary-btn" onClick={submit} disabled={busy}>
        {busy ? 'Signing in' : 'Sign in'}
      </button>
    </div>
  );
}
