import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { useTranslation } from "react-i18next"; // 👈 språkstöd tillagt

export default function Home() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(); // 👈 initiera översättning
  const [showRotateMessage, setShowRotateMessage] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [openLangMenu, setOpenLangMenu] = useState(false); // 👈 ny state för dropdown

  const langMenuRef = useRef<HTMLDivElement>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // 👇 språkbyte
  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    setOpenLangMenu(false);
  };

  // 👇 stänger menyn när man klickar utanför
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setOpenLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setShowRotateMessage(isPortrait && !understood);
    };
    checkOrientation();
    window.addEventListener("orientationchange", checkOrientation);
    window.addEventListener("resize", checkOrientation);
    return () => {
      window.removeEventListener("orientationchange", checkOrientation);
      window.removeEventListener("resize", checkOrientation);
    };
  }, [understood]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.25 }
    );
    document.querySelectorAll(".fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // === CIRKELLOOP FIX ===
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let offset = 0;
    const speed = 0.7;
    let animationFrame: number;

    const animate = () => {
      offset -= speed;
      const first = container.children[0] as HTMLElement;
      if (!first) return;

      if (offset <= -first.offsetWidth - 25) {
        container.appendChild(first);
        offset += first.offsetWidth + 25;
      }

      container.style.transform = `translateX(${offset}px)`;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const features = [
    { icon: "🎧", title: t("loop_feature_1"), desc: "Chatta, jamma och samarbeta med andra musiker i communityn." },
    { icon: "🥁", title: t("loop_feature_2"), desc: "Träna med metronom och visuell rytm-feedback i realtid." },
    { icon: "🔥", title: t("loop_feature_3"), desc: "Delta i veckoutmaningar och samla exklusiva belöningar." },
    { icon: "🌟", title: t("loop_feature_4"), desc: "Följ din utveckling via statistik, nivåer och achievements." },
    { icon: "🎵", title: t("loop_feature_5"), desc: "Spela klassiker och moderna låtar i flera svårighetsgrader." },
    { icon: "🏆", title: t("loop_feature_6"), desc: "Se hur du ligger till jämfört med andra i communityn." },
    { icon: "⚙️", title: t("loop_feature_7"), desc: "Välj dina trummor, ljud och övningar – bygg din stil." },
    { icon: "💬", title: t("loop_feature_8"), desc: "Dela tips, råd och motivation i vårt globala forum." }
  ];

  const faqs = [
    { q: t("faq_1_q"), a: t("faq_1_a") },
    { q: t("faq_2_q"), a: t("faq_2_a") },
    { q: t("faq_3_q"), a: t("faq_3_a") },
    { q: t("faq_4_q"), a: t("faq_4_a") },
    { q: t("faq_5_q"), a: t("faq_5_a") },
    { q: t("faq_6_q"), a: t("faq_6_a") }
  ];

  return (
    <div className={`home-root ${showRotateMessage ? "is-blurred" : ""}`}>
      {/* === SPRÅKVAL DROPDOWN === */}
      <div className="lang-dropdown" ref={langMenuRef}>
        <button onClick={() => setOpenLangMenu(!openLangMenu)} className="lang-toggle-btn">
          🌐 {i18n.language.toUpperCase()} ▾
        </button>

        {openLangMenu && (
          <div className="lang-menu">
            {[
              { code: "sv", flag: "🇸🇪", name: "Svenska" },
              { code: "en", flag: "🇬🇧", name: "English" },
              { code: "no", flag: "🇳🇴", name: "Norsk" },
              { code: "fi", flag: "🇫🇮", name: "Suomi" },
              { code: "de", flag: "🇩🇪", name: "Deutsch" },
              { code: "fr", flag: "🇫🇷", name: "Français" },
              { code: "es", flag: "🇪🇸", name: "Español" },
              { code: "pt", flag: "🇵🇹", name: "Português" },
              { code: "it", flag: "🇮🇹", name: "Italiano" },
              { code: "nl", flag: "🇳🇱", name: "Nederlands" },
              { code: "zh", flag: "🇨🇳", name: "中文" },
              { code: "ja", flag: "🇯🇵", name: "日本語" },
              { code: "ko", flag: "🇰🇷", name: "한국어" },
              { code: "hi", flag: "🇮🇳", name: "हिन्दी" }
            ].map(({ code, flag, name }) => (
              <div
                key={code}
                onClick={() => changeLang(code)}
                className={`lang-option ${i18n.language === code ? "active" : ""}`}
              >
                {flag} {name}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRotateMessage && (
        <div className="rotate-lock">
          <div className="rotate-message">
            <h2>{t("rotate_title") || "Vänd mobilen"}</h2>
            <p>
              {t("rotate_text") ||
                "Vi rekommenderar att du vänder skärmen till liggande läge för bästa upplevelse. Om möjligt, använd dator, surfplatta eller casta till TV för att få den absolut bästa känslan."}
            </p>
            <button className="understand-btn" onClick={() => setUnderstood(true)}>
              {t("understand") || "Jag förstår"}
            </button>
          </div>
        </div>
      )}

      {/* === RESTEN AV SIDAN (ORÖRD) === */}
      <div className="home">
        {/* === HERO === */}
        <section className="hero">
          <video className="hero-video" src="/videos/Home.mp4" autoPlay loop muted playsInline></video>
          <div className="hero-overlay"></div>
          <div className="hero-content fade-up">
            <h1>
              <span className="highlight">{t("hero_title")}</span>
              <br />
              {t("hero_subtitle")}
            </h1>
            <p>{t("hero_description")}</p>
            <div className="auth-buttons">
              <button className="login-btn" onClick={() => navigate("/login")}>
                {t("login")}
              </button>
              <button className="register-btn" onClick={() => navigate("/register")}>
                {t("register")}
              </button>
            </div>
          </div>
        </section>

        {/* === SEKTION 2 === */}
        <section className="welcome-light fade-up">
          <div className="welcome-container">
            <h2 className="light-title">{t("welcome_title")}</h2>
            <p className="light-subtext">
              {t("welcome_text_1")} <br />
              {t("welcome_text_2")} <br />
              {t("welcome_text_3")}
            </p>
            <button className="cta-light">{t("try_free")}</button>
            <div className="features-row fade-up">
              <div className="feature-card">
                <div className="feature-icon">🥁</div>
                <h3>{t("feature_1_title")}</h3>
                <p>{t("feature_1_desc")}</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔥</div>
                <h3>{t("feature_2_title")}</h3>
                <p>{t("feature_2_desc")}</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🌍</div>
                <h3>{t("feature_3_title")}</h3>
                <p>{t("feature_3_desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* === SEKTION 2.5 === */}
        <section className="app-features-scroll fade-up visible">
          <h2 className="scroll-title">{t("scroll_title")}</h2>
          <div className="scroll-loop" ref={scrollRef}>
            {features.map((item, index) => (
              <div key={index} className="scroll-card">
                <div className="scroll-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === SEKTION 3 === */}
        <section className="app-info-dark fade-up">
          <div className="app-info-container">
            <div className="info-block fade-up">
              <div className="info-text">
                <h3>{t("info_1_title")}</h3>
                <p>{t("info_1_text")}</p>
              </div>
              <div className="info-image">
                <img src="/images/drums/lärdigspela.png" alt="Lär dig spela" />
              </div>
            </div>
            <div className="info-block fade-up">
              <div className="info-text">
                <h3>{t("info_2_title")}</h3>
                <p>{t("info_2_text")}</p>
              </div>
              <div className="info-image">
                <img src="/images/drums/tränasmartare.png" alt="Träna smartare" />
              </div>
            </div>
            <div className="info-block fade-up">
              <div className="info-text">
                <h3>{t("info_3_title")}</h3>
                <p>{t("info_3_text")}</p>
              </div>
              <div className="info-image">
                <img src="/images/drums/snackamedandra.png" alt="Snacka med andra" />
              </div>
            </div>
          </div>
        </section>

        {/* === FAQ === */}
        <section className="faq-section fade-up">
          <h2 className="faq-title">{t("faq_title")}</h2>
          <div className="faq-container">
            {faqs.map((item, index) => (
              <div
                key={index}
                className={`faq-item ${openIndex === index ? "open" : ""}`}
                onClick={() => toggleFAQ(index)}
              >
                <div className="faq-question">
                  <h3>{item.q}</h3>
                  <span className="faq-icon">{openIndex === index ? "−" : "+"}</span>
                </div>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === SLUTSEKTION === */}
        <section className="final-cta fade-up">
          <div className="final-container">
            <h2 className="final-title">{t("join_us")}</h2>
            <p className="final-subtext">{t("final_text")}</p>
            <button className="final-btn" onClick={() => navigate("/register")}>
              🚀 {t("start_now_free")}
            </button>
          </div>
        </section>

        {/* === FOOTER === */}
        <footer>
          <h3>DrumVisualizer</h3>
          <p>© 2025 Stylexs — Utvecklad av Robin Eriksson</p>
          <p>Den smartaste vägen till att spela bättre, varje dag.</p>
          <div className="socials">
            <a href="#">Instagram</a>
            <a href="#">TikTok</a>
            <a href="#">YouTube</a>
          </div>
          <button
            onClick={() => navigate("/policy")}
            style={{
              marginTop: "0.75rem",
              background: "transparent",
              border: "none",
              color: "#60a5fa",
              cursor: "pointer",
              fontSize: "0.9rem",
              textDecoration: "underline",
            }}
          >
            Användarvillkor & integritet (Stylexs)
          </button>
        </footer>
      </div>
    </div>
  );
}
