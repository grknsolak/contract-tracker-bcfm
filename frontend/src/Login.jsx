import React, { useState } from "react";
import { loginUser } from "./utils/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Small deliberate delay for feedback
    await new Promise((r) => setTimeout(r, 350));
    const user = loginUser(email, password);
    setLoading(false);
    if (!user) {
      setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
      return;
    }
    onLogin(user);
  };

  return (
    <div className="login-screen">
      {/* Subtle ambient glow */}
      <div className="login-glow" aria-hidden="true" />

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <div className="login-brand-title">Contract Tracker</div>
            <div className="login-brand-sub">Operations Suite</div>
          </div>
        </div>

        {/* Heading */}
        <div className="login-heading">
          <h2>Hoş geldiniz</h2>
          <p>Devam etmek için hesabınıza giriş yapın</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Email */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">
              E-posta
            </label>
            <div className="login-input-wrap">
              <svg
                className="login-input-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                id="login-email"
                className="login-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bcfm.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-password">
              Şifre
            </label>
            <div className="login-input-wrap">
              <svg
                className="login-input-icon"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login-password"
                className="login-input login-input--pass"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                tabIndex={-1}
              >
                {showPass ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="login-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className={`login-submit${loading ? " login-submit--loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Giriş yapılıyor…
              </>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        {/* Demo hint */}
        <div className="login-demo-hint">
          <span className="login-demo-label">Demo hesaplar</span>
          <div className="login-demo-rows">
            <div className="login-demo-row">
              <span>admin@bcfm.com</span>
              <span className="login-demo-sep">·</span>
              <span>admin123</span>
            </div>
            <div className="login-demo-row">
              <span>gurkan@bcfm.com</span>
              <span className="login-demo-sep">·</span>
              <span>gurkan123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
