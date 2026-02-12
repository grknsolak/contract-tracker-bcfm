import React, { useState } from 'react';
import { login } from './api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login(email, password);
      onLogin(data.user);
    } catch (err) {
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    }
  };

  return (
    <div className="screen center">
      <div className="card glass float" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center space-y">
          <div className="brand gradient-text" style={{ fontSize: '2rem' }}>
            ☁️ BCFM Agreement
          </div>
          <p className="muted">Sözleşme Takip Sistemi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y">
          <label className="field">
            <span className="label">📧 E-posta</span>
            <input
              className="interactive"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label className="field">
            <span className="label">🔒 Şifre</span>
            <input
              className="interactive"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <div className="alert danger">{error}</div>
          )}

          <button type="submit" className="btn primary glow-on-hover" style={{ width: '100%' }}>
            🚀 Giriş Yap
          </button>

          <div className="muted text-center" style={{ fontSize: '0.875rem' }}>
            Varsayılan: admin@example.com / admin123
          </div>
        </form>
      </div>
    </div>
  );
}
