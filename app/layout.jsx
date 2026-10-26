import './globals.css'
import config from '@/tournament.config.json'

export const metadata = {
  title: config.title,
  description: config.description,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body className="antialiased">{children}</body>
    </html>
  )
}
