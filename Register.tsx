// src/pages/Register.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginWithGoogle } from "../authService";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    if (password !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }

    try {
      setLoading(true);
      await registerUser(email, password);
      setInfo("Konto skapat! Du kan nu logga in.");
      // Om du hellre vill skicka direkt till dashboard:
      // navigate("/dashboard");
    } catch (err: any) {
      console.error("Register error:", err);
      setError(err.message ?? "Något gick fel vid registrering.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setInfo(null);
    try {
      setLoading(true);
      await loginWithGoogle();
      // Google-användare är redan inloggade här
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Google register/login error:", err);
      setError(err.message ?? "Kunde inte logga in med Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <h1>Skapa konto</h1>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <form onSubmit={handleRegister}>
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

          <input
            type="password"
            placeholder="Upprepa lösenord"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Skapar konto..." : "Registrera"}
          </button>
        </form>

        {/* ⭐ Google-knapp */}
        <button
          type="button"
          className="google-button"
          onClick={handleGoogleRegister}
          disabled={loading}
        >
          Fortsätt med Google
        </button>

        <p className="auth-switch">
          Har du redan konto? <Link to="/login">Logga in</Link>
        </p>
      </div>
    </div>
  );
}
