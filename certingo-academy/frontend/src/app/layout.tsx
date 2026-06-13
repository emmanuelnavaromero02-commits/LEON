import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Certingo Academy | AI-Powered Certification Prep',
  description: 'Master Cloud Certifications with Adaptive Intelligence.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
