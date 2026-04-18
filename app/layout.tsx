import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Živý žebříček ČTS mládež",
  description: "Aktuální žebříček mladšího žactva, staršího žactva a dorostu",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  )
}
