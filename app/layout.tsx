import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import NotificationPermission from "@/components/notification-permission"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HomeApp - Organiza tu hogar",
  description: "Organiza tu hogar, conecta con tu familia y simplifica tu vida diaria",
    generator: 'v0.app',
    manifest: '/manifest.json'
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
