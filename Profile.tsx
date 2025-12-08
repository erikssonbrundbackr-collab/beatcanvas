// src/pages/Profile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  updateCurrentUser,
  logoutUser,
} from "../authService";
import "./Auth.css";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) {
        navigate("/login");
        return;
      }
      setUser(u);
      setName(u.displayName || "");
    })();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    try {
      setSaving(true);
      await updateCurrentUser({ name });
      setInfo("Profil uppdaterad!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  if (!user) return <p className="auth-box">Laddar...</p>;

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <h1>Profil</h1>

        {error && <p className="auth-error">{error}</p>}
        {info && <p className="auth-info">{info}</p>}

        <p><b>E-post:</b> {user.email}</p>

        <form onSubmit={handleUpdate}>
          <input
            type="text"
            placeholder="Visningsnamn"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <button disabled={saving}>
            {saving ? "Sparar..." : "Spara ändringar"}
          </button>
        </form>

        <button onClick={handleLogout} className="link-button">
          Logga ut
        </button>
      </div>
    </div>
  );
}
