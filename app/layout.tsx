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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    document.documentElement.classList.add(theme);
                  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
              
              // Registrar Service Worker para notificaciones
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker registrado con éxito:', registration);
                    })
                    .catch(function(error) {
                      console.log('Error al registrar Service Worker:', error);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <NotificationPermission />
        </ThemeProvider>
      </body>
    </html>
  )
}
