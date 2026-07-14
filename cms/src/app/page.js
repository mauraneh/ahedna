const frontendUrl =
  process.env.AHEDNA_FRONTEND_URL?.replace(/\/+$/, '') || 'http://localhost:4200';

const links = [
  {
    href: `${frontendUrl}/admin`,
    label: 'Gérer depuis AHEDNA',
    description: 'Tableau de bord, contenus, modération et utilisateurs avec le compte habituel.',
    accent: '#176b73',
    primary: true,
  },
  {
    href: '/admin',
    label: 'Accès maintenance',
    description: 'Réservé aux interventions techniques avancées.',
    accent: '#9b2f2a',
    primary: false,
  },
];

const scopes = [
  'Actualites',
  'Evenements',
  'Documents adherents',
  'Mediatheque',
  'Utilisateurs',
  'Moderation',
];

export default function HomePage() {
  return (
    <main style={styles.page}>
      <section style={styles.panel} aria-labelledby="cms-title">
        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>AHEDNA</p>
            <h1 id="cms-title" style={styles.title}>
              Gestion du site
            </h1>
          </div>
          <span style={styles.status}>Espace réservé</span>
        </div>

        <div style={styles.grid}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={link.primary ? { ...styles.linkCard, ...styles.linkCardPrimary } : styles.linkCard}
            >
              <span style={{ ...styles.linkBar, background: link.accent }} />
              <strong style={styles.linkLabel}>{link.label}</strong>
              <span style={styles.linkCopy}>{link.description}</span>
            </a>
          ))}
        </div>

        <div style={styles.scopeList} aria-label="Perimetre du back-office">
          {scopes.map((scope) => (
            <span key={scope} style={styles.scopeItem}>
              {scope}
            </span>
          ))}
        </div>

        <p style={styles.footerNote}>
          Pour la gestion courante, utilisez l'espace administrateur AHEDNA. L'accès
          maintenance est réservé aux interventions techniques.
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(1rem, 4vw, 3rem)',
    background:
      'linear-gradient(rgba(36,31,24,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(36,31,24,0.045) 1px, transparent 1px), #efe8dc',
    backgroundSize: '48px 48px, 48px 48px, auto',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  panel: {
    width: 'min(880px, 100%)',
    borderRadius: 8,
    padding: 'clamp(1.25rem, 4vw, 2.5rem)',
    background: '#fffaf0',
    border: '1px solid rgba(36,31,24,0.28)',
    boxShadow: '0 18px 40px rgba(36,31,24,0.16)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    borderBottom: '1px solid rgba(36,31,24,0.12)',
    paddingBottom: '1.25rem',
  },
  eyebrow: {
    margin: 0,
    color: '#9b2f2a',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontSize: '0.78rem',
  },
  title: {
    margin: '0.4rem 0 0',
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    lineHeight: 1,
    color: '#241f18',
    letterSpacing: 0,
  },
  status: {
    flex: '0 0 auto',
    border: '1px solid #176b73',
    borderRadius: 999,
    padding: '0.45rem 0.75rem',
    color: '#ffffff',
    background: '#176b73',
    fontSize: '0.82rem',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  linkCard: {
    position: 'relative',
    display: 'grid',
    gap: '0.5rem',
    minHeight: 128,
    padding: '1.2rem',
    borderRadius: 8,
    border: '1px solid rgba(36,31,24,0.26)',
    color: 'inherit',
    textDecoration: 'none',
    background: '#ffffff',
    boxShadow: '0 8px 18px rgba(36,31,24,0.1)',
  },
  linkCardPrimary: {
    borderColor: 'rgba(23,107,115,0.48)',
    background: '#f2fbfa',
  },
  linkBar: {
    width: 40,
    height: 4,
    borderRadius: 999,
  },
  linkLabel: {
    color: '#241f18',
    fontSize: '1.05rem',
  },
  linkCopy: {
    color: '#40362a',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  scopeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    marginTop: '1.5rem',
  },
  scopeItem: {
    border: '1px solid rgba(36,31,24,0.24)',
    borderRadius: 999,
    padding: '0.45rem 0.7rem',
    color: '#2d251d',
    background: '#f7ecd8',
    fontSize: '0.86rem',
    fontWeight: 600,
  },
  footerNote: {
    margin: '1.35rem 0 0',
    color: '#40362a',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
};
