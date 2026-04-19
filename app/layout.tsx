import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Live Ranking - ČTS mládež",
  description: "Aktuální žebříček mladšího žactva, staršího žactva a dorostu",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
