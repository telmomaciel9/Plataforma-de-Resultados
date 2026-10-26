import './globals.css'
import config from '@/tournament.config.json'

export const metadata = {
  title: config.platformName,
  description: config.platformDescription,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body className="antialiased">{children}</body>
    </html>
  )
}
