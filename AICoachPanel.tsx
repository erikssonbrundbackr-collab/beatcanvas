import { useState } from "react";
import "./AICoachPanel.css";

type ChatMessage = {
  sender: "ai" | "user";
  text: string;
};

export default function AICoachPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Hej! Jag är din trumcoach. Vad vill du veta idag?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Matchar din backend-route: server använder /api/ai + /ask
  const API_URL = "/api/ai/ask";

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setMessages((m) => [...m, { sender: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const data = await res.json();

      if (!res.ok || !data.reply) {
        setMessages((m) => [
          ...m,
          {
            sender: "ai",
            text: "❌ Serverfel. Kunde inte få svar från AI:n.",
          },
        ]);
      } else {
        setMessages((m) => [...m, { sender: "ai", text: data.reply }]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          sender: "ai",
          text: "❌ Fel: Kunde inte kontakta AI-servern.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <section className="ai-coach-card">
      <header className="ai-coach-header">
        <div className="ai-coach-title">
          <span className="ai-coach-icon">🤖</span>
          <div>
            <h2>AI-Coach</h2>
            <p className="ai-coach-subtitle">
              Ställ frågor om trumteknik, övningar, timing, hur du kan bli bättre osv.
            </p>
          </div>
        </div>
        <div className="ai-powered-pill">
          <span className="dot" />
          <span className="label">Powered by ChatGPT</span>
        </div>
      </header>

      <div className="ai-chat-box">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`ai-msg ${m.sender === "user" ? "from-user" : "from-ai"}`}
          >
            <span className="ai-msg-label">
              {m.sender === "user" ? "Du:" : "AI:"}
            </span>
            <span className="ai-msg-text">{m.text}</span>
          </div>
        ))}
      </div>

      <footer className="ai-input-area">
        <div className="ai-input-row">
          <input
            type="text"
            placeholder="Fråga AI-coachen t.ex. ”Hur får jag bättre timing på hi-hat?”"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? "Skickar…" : "Fråga"}
          </button>
        </div>
        <p className="ai-hint">
          AI:n ger tips – testa olika frågor om teknik, övningar, set-up och ljud.
        </p>
      </footer>
    </section>
  );
}
