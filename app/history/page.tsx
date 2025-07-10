import History from '@/components/History'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Usage History - Idea to Content',
  description: 'View your AI content generation history, costs, and usage statistics',
}

export default function HistoryPage() {
  return <History />
} 