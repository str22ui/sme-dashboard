import './globals.css'

export const metadata = {
  title: 'SME Dashboard - Admin Portal',
  description: 'Upload portal for SME Dashboard data',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
