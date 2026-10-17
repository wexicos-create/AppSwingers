import React from 'react';
import { createRoot } from 'react-dom/client';
import { Flame, Heart, CalendarDays, Users, ShieldCheck, ArrowUpRight, Sparkles, Eye, MessageCircle } from 'lucide-react';
import './marketing.css';

function MarketingLanding() {
  return <main className="marketing-shell">
    <nav className="m-nav">
      <a className="m-brand" href="/" aria-label="AppSwinger inicio"><span className="m-logo">A<span>✦</span></span><span>AppSwinger</span></a>
      <span className="m-adult">SOLO ADULTOS · +18</span>
      <a className="m-nav-cta" href="/app">Entrar <ArrowUpRight size={16}/></a>
    </nav>

    <section className="m-hero">
      <div className="m-orb m-orb-one"/><div className="m-orb m-orb-two"/>
      <div className="m-copy">
        <div className="m-eyebrow"><Sparkles size={14}/> CONEXIONES SIN CHARLAS DE RELLENO</div>
        <h1>¿Y si esta noche<br/> <em>sí pasa algo?</em></h1>
        <p className="m-lead">Aquí no vienes a coleccionar “hola, ¿cómo estás?”. Vienes a descubrir quién trae tu misma vibra.</p>
        <p className="m-sub">Match entre adultos, citas informales, parejas afines, eventos y reuniones organizadas. Tú pones el ritmo; el respeto va de serie.</p>
        <div className="m-actions">
          <a className="m-button" href="/app">Descubre tu próximo Match <ArrowUpRight size={18}/></a>
          <a className="m-text-link" href="#que-hay">A ver qué se arma <span>↓</span></a>
        </div>
        <div className="m-trust"><ShieldCheck size={17}/><span>Discreción, consentimiento y límites claros.</span></div>
      </div>
      <div className="m-visual" aria-label="Vista ilustrativa de la experiencia Match">
        <div className="m-halo"/>
        <div className="m-float m-float-top"><span className="m-pulse"/> Alguien comparte tu vibra</div>
        <div className="m-phone">
          <div className="m-phone-top"><span>9:41</span><span>● ● ▰</span></div>
          <div className="m-app-head"><span className="m-mini-logo">A✦</span><span>AppSwinger</span><span className="m-online"/></div>
          <div className="m-photo m-photo-one"><div className="m-photo-shape m-shape-a"/><div className="m-photo-shape m-shape-b"/><div className="m-photo-copy"><span className="m-verified">✓ Perfil de muestra</span><strong>La química<br/>se descubre.</strong><small>Conexiones con intención</small></div><span className="m-photo-count">01 / 04</span></div>
          <div className="m-profile-row"><div><strong>Tu siguiente historia</strong><small>Primero la vibra, luego lo demás.</small></div><span className="m-heart">♡</span></div>
          <div className="m-match-actions"><span>↶</span><span>✕</span><span className="m-like">♥</span><span>✦</span></div>
          <div className="m-phone-nav"><span>⌂</span><span className="active">♡</span><span>▦</span><span>◉</span></div>
        </div>
        <div className="m-float m-float-bottom"><Heart size={16} fill="currentColor"/> Match es mutuo. La decisión también.</div>
        <div className="m-spark m-spark-a">✦</div><div className="m-spark m-spark-b">✧</div>
      </div>
    </section>

    <section className="m-strip"><span>Tu curiosidad tiene casa.</span><i>✦</i><span>Tu consentimiento, siempre.</span><i>✦</i><span>Tu historia, tus reglas.</span></section>

    <section id="que-hay" className="m-discover">
      <div className="m-section-kicker">MÁS QUE UN DESLIZAMIENTO</div>
      <h2>La noche tiene <em>más de una puerta.</em></h2>
      <p className="m-section-intro">Explora a tu manera, conoce gente afín y decide hasta dónde quieres llegar. Sin promesas mágicas ni presión.</p>
      <div className="m-feature-grid">
        <article className="m-feature"><div className="m-feature-icon"><Flame/></div><h3>Match con intención</h3><p>Citas informales, química y personas adultas que buscan una conexión compatible contigo.</p><span className="m-feature-tag">DESLIZA · CONECTA</span></article>
        <article className="m-feature"><div className="m-feature-icon"><CalendarDays/></div><h3>Eventos y reuniones</h3><p>Descubre encuentros para parejas e individuales, con información de acceso y condiciones publicadas por cada organizador.</p><span className="m-feature-tag">DESCUBRE · PARTICIPA</span></article>
        <article className="m-feature"><div className="m-feature-icon"><Users/></div><h3>Comunidad y organizadores</h3><p>Conoce propuestas, perfiles y anfitriones. Revisa los detalles antes de decidir si ese plan es para ti.</p><span className="m-feature-tag">EXPLORA · ELIGE</span></article>
      </div>
    </section>

    <section className="m-quote">
      <div className="m-quote-mark">“</div>
      <div><div className="m-section-kicker">EL PACTO APP SWINGER</div><h2>El placer de conectar.<br/><em>El poder de elegir.</em></h2><p>La atracción abre la conversación. El consentimiento decide el camino.</p></div>
      <a className="m-button m-button-light" href="/app">Quiero descubrir <ArrowUpRight size={18}/></a>
    </section>

    <section className="m-safety"><div className="m-safety-icon"><ShieldCheck size={26}/></div><div><h3>La confianza también atrae.</h3><p>AppSwinger está pensado para adultos. Respeta los límites, cuida tus datos y verifica la información disponible antes de asistir a cualquier encuentro. Ninguna insignia sustituye tu propio criterio.</p></div></section>

    <footer className="m-footer"><a className="m-brand" href="/"><span className="m-logo">A<span>✦</span></span><span>AppSwinger</span></a><span>El placer de conectar. El poder de elegir.</span><div><a href="#que-hay">Explorar</a><a href="/app">Entrar</a></div><small>Solo para mayores de 18 años. Las conexiones y encuentros dependen del consentimiento mutuo. Consulta las condiciones y políticas antes de usar el servicio.</small></footer>
  </main>;
}

createRoot(document.getElementById('marketing-root')!).render(<MarketingLanding />);
