import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/lib/auth'
import Header from '@/components/Header'
import ConditionalFooter from '@/components/ConditionalFooter'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Idea to Content - AI Blog Generator',
  description: 'Generate complete blog content using AI with guided inputs and multiple formats. Create high-quality blog posts, articles, and content with advanced AI technology.',
  keywords: 'AI blog generator, content creation, blog writing, AI tools, content marketing, SEO writing',
  authors: [{ name: 'Idea to Content Team' }],
  creator: 'Idea to Content',
  publisher: 'Idea to Content',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/idea.png', sizes: '32x32', type: 'image/png' },
      { url: '/idea.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/idea.png',
    apple: '/idea.png',
  },
  openGraph: {
    title: 'Idea to Content - AI Blog Generator',
    description: 'Generate complete blog content using AI with guided inputs and multiple formats. Create high-quality blog posts, articles, and content with advanced AI technology.',
    url: '/',
    siteName: 'Idea to Content',
    images: [
      {
        url: '/idea.png',
        width: 1200,
        height: 630,
        alt: 'Idea to Content - AI Blog Generator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Idea to Content - AI Blog Generator',
    description: 'Generate complete blog content using AI with guided inputs and multiple formats. Create high-quality blog posts, articles, and content with advanced AI technology.',
    images: ['/idea.png'],
    creator: '@ideatocontent',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          {children}
          <ConditionalFooter />
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
} 