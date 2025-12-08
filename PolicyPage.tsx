import React from "react";

export default function PolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem 1rem 4rem",
        display: "flex",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #020617 0%, #020617 40%, #020617 100%)",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
          borderRadius: "18px",
          border: "1px solid rgba(148,163,184,0.4)",
          boxShadow:
            "0 40px 90px rgba(15,23,42,0.9), 0 0 0 1px rgba(59,130,246,0.35)",
          padding: "2.2rem 1.8rem",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: "0.5rem",
            color: "#bfdbfe",
          }}
        >
          Användarvillkor – Stylexs / DrumVisualizer
        </h1>
        <p style={{ color: "#9ca3af", marginBottom: "1.8rem" }}>
          Senast uppdaterad: 2025
        </p>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>1. Allmänt</h2>
          <p style={{ lineHeight: 1.7 }}>
            Dessa användarvillkor (“Villkoren”) reglerar din användning av Stylexs
            webbplats, appar och digitala tjänster (“Tjänsterna”). Genom att
            använda någon av våra Tjänster samtycker du till dessa Villkor. Om du
            inte godkänner Villkoren ska du inte använda Tjänsterna.
          </p>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            <strong>Stylexs drivs av:</strong>
            <br />
            Stylexs – Robin Eriksson Brunbäck
            <br />
            E-post: <a href="mailto:info@stylexs.se">info@stylexs.se</a>
            <br />
            Webbplats:{" "}
            <a href="https://stylexs.se" target="_blank" rel="noreferrer">
              https://stylexs.se
            </a>
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            2. Användarbehörighet och åldersgräns
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            För att använda Stylexs Tjänster måste du vara minst 18 år. Om du är
            under 18 år krävs godkännande från vårdnadshavare för att skapa konto
            eller använda våra appar och produkter. Stylexs tar inget ansvar för
            om minderåriga använder våra Tjänster utan godkännande.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            3. Musikrättigheter och användning av innehåll
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            All musik, ljudfiler och annat ljudmaterial som finns tillgängligt
            inom Stylexs plattformar är skyddat av upphovsrätt. Det är inte
            tillåtet att kopiera, ladda ner, distribuera eller använda vår musik
            utanför våra Tjänster.
          </p>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            Det är dock tillåtet att spela in och dela innehåll på sociala medier
            (t.ex. videor, livestreams, klipp eller reels) som visar hur du
            använder våra Tjänster, till exempel när du spelar i BeatTrainer.
            All delning måste ske på ett sätt som tydligt visar att musiken
            används inom Stylexs-plattformen.
          </p>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            Vid överträdelse av dessa regler kan Stylexs vidta åtgärder, inklusive
            att begränsa tillgången till konton eller inleda rättsliga åtgärder.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            4. Beteenderegler
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            Stylexs är en plattform som ska vara trygg, inspirerande och fri från
            trakasserier. Det är strikt förbjudet att:
          </p>
          <ul style={{ marginLeft: "1.2rem", marginTop: "0.4rem", lineHeight: 1.7 }}>
            <li>sprida hat, hot, trakasserier eller diskriminerande innehåll,</li>
            <li>publicera olämpligt, kränkande eller olagligt material,</li>
            <li>använda våra Tjänster för spam, bedrägeri eller skadlig kod.</li>
          </ul>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            Brott mot dessa regler kan leda till direkt eller permanent avstängning
            från våra Tjänster. Vid allvarliga överträdelser kan Stylexs anmäla
            händelsen till relevanta myndigheter.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            5. Immateriella rättigheter
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            Allt innehåll på Stylexs.se och våra appar, inklusive kod, design,
            grafik, logotyper, ljud, text, musik och videor, ägs av Stylexs eller
            används med tillstånd från respektive rättighetsinnehavare.
          </p>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            Det är inte tillåtet att kopiera, reproducera, sälja, hyra ut eller
            modifiera något material utan skriftligt tillstånd från Stylexs.
          </p>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            Rättigheterna till användarskapat material (t.ex. videor eller
            profiler) som publiceras på plattformen förblir användarens, men
            Stylexs har rätt att visa materialet inom plattformen i syfte att
            marknadsföra och förbättra tjänsten.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            6. Ansvar, garanti och begränsning
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            Stylexs tillhandahåller sina Tjänster “i befintligt skick” utan
            garantier för tillgänglighet, funktionalitet eller kompatibilitet. Vi
            ansvarar inte för förlust av data, driftstopp, tekniska fel eller
            skador som uppstår till följd av användning av våra Tjänster.
            Användning sker på egen risk.
          </p>
          <p style={{ marginTop: "0.6rem", lineHeight: 1.7 }}>
            Stylexs har rätt att när som helst uppdatera, ändra, pausa eller
            avsluta hela eller delar av sina Tjänster utan föregående meddelande.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            7. Ändringar av villkoren
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            Stylexs förbehåller sig rätten att uppdatera dessa Villkor vid behov.
            När ändringar görs uppdateras datumet överst på denna sida. Fortsatt
            användning av våra Tjänster efter publicering av nya villkor innebär
            att du accepterar dessa.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "0.4rem" }}>
            8. Tillämplig lag och tvister
          </h2>
          <p style={{ lineHeight: 1.7 }}>
            Dessa villkor regleras av svensk lag. Eventuella tvister ska i första
            hand lösas genom dialog mellan användaren och Stylexs. Om en
            överenskommelse inte kan nås, avgörs tvisten i svensk domstol med
            Göteborgs tingsrätt som första instans.
          </p>
        </section>
      </div>
    </div>
  );
}
