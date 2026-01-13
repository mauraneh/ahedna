import './globals.css'

export const metadata = {
  title: 'AHEDNA - API Backend',
  description: 'Backend API pour l\'Association des Harkis et de leurs Enfants de Dordogne et Nouvelle-Aquitaine',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}