export const metadata = {
  title: 'Gestion AHEDNA',
  description: 'Espace de gestion des contenus AHEDNA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
