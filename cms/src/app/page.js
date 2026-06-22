const frontendAdminUrl =
  process.env.AHEDNA_FRONTEND_URL?.replace(/\/+$/, '') || 'http://localhost:4200';

const links = [
  {
    href: '/admin',
    label: 'Ouvrir le back-office',
    description: 'Actualites, evenements, documents et medias.',
  },
  {
    href: `${frontendAdminUrl}/admin`,
    label: 'Admin Angular actuel',
    description: 'Moderation, forum, galerie et operations deja en place.',
  },
];

export default function HomePage() {
  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <p style={styles.eyebrow}>AHEDNA</p>
        <h1 style={styles.title}>Back-office Payload</h1>
        <p style={styles.copy}>
          Cette application pilote le back-office editorial. Les contenus enregistres
          ici sont synchronises vers les tables publiques utilisees par le frontend.
        </p>

        <div style={styles.grid}>
          {links.map((link) => (
            <a key={link.href} href={link.href} style={styles.linkCard}>
              <strong style={styles.linkLabel}>{link.label}</strong>
              <span style={styles.linkCopy}>{link.description}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    margin: 0,
    display: 'grid',
    placeItems: 'center',
    padding: '2rem',
    background:
      'linear-gradient(rgba(37,29,20,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(37,29,20,0.03) 1px, transparent 1px), #e7d8b9',
    backgroundSize: '42px 42px, 42px 42px, auto',
    fontFamily: 'Georgia, serif',
  },
  card: {
    width: 'min(720px, 100%)',
    borderRadius: 0,
    padding: '2rem',
    background: '#eadbbd',
    border: '1px solid rgba(37,29,20,0.72)',
    boxShadow:
      'inset 0 0 0 4px rgba(234,219,189,0.72), inset 0 0 0 5px rgba(37,29,20,0.16), 0 14px 26px rgba(52,40,24,0.12)',
  },
  eyebrow: {
    margin: 0,
    color: '#9b2f2a',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0,
    fontSize: '0.78rem',
    fontFamily: '"Arial Narrow", Arial, sans-serif',
  },
  title: {
    margin: '0.75rem 0 0',
    fontSize: '3rem',
    lineHeight: 1.05,
    color: '#251d14',
    fontFamily: '"Arial Narrow", Arial, sans-serif',
    textTransform: 'uppercase',
  },
  copy: {
    margin: '1rem 0 0',
    color: '#6c5a42',
    fontSize: '1rem',
    lineHeight: 1.7,
  },
  grid: {
    display: 'grid',
    gap: '1rem',
    marginTop: '1.75rem',
  },
  linkCard: {
    display: 'grid',
    gap: '0.35rem',
    padding: '1rem 1.1rem',
    borderRadius: 0,
    border: '1px solid rgba(37,29,20,0.45)',
    color: 'inherit',
    textDecoration: 'none',
    background: '#efe3c8',
  },
  linkLabel: {
    color: '#251d14',
    fontSize: '1rem',
    fontFamily: '"Arial Narrow", Arial, sans-serif',
    textTransform: 'uppercase',
  },
  linkCopy: {
    color: '#6c5a42',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
};
