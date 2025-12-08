// src/pages/Login.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, sendPasswordReset, loginWithGoogle } from "../authService";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    try {
      setLoading(true);
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message ?? "Fel e-post eller lösenord.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    try {
      await sendPasswordReset(email);
      setInfo("Om e-posten finns skickades ett återställnings-mail.");
    } catch (err: any) {
      console.error("Reset error:", err);
      setError(err.message ?? "Kunde inte skicka återställnings-mail.");
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setInfo(null);
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Google login error:", err);
      setError(err.message ?? "Kunde inte logga in med Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <h1>Logga in</h1>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Loggar in..." : "Logga in"}
          </button>
        </form>

        <button
          type="button"
          className="link-button"
          onClick={handleForgotPassword}
        >
          Glömt lösenord?
        </button>

        {/* ⭐ Google-knapp */}
        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          Fortsätt med Google
        </button>

        <p className="auth-switch">
          Har du inget konto? <Link to="/register">Skapa konto</Link>
        </p>
      </div>
    </div>
  );
}
