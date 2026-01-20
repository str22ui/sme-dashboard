import './globals.css'

export const metadata = {
  title: 'NPL KREDIT UMKM Dashboard',
  description: 'Real-time NPL SME monitoring dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
