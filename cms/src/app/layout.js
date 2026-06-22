export const metadata = {
  title: 'AHEDNA Payload',
  description: 'Back-office Payload pour AHEDNA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
