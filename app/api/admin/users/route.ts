import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all users (admin only)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin
  const { data: adminData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!adminData?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // List all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, is_admin, is_approved, created_at, last_sign_in_at, avatar_url')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users })
}

// POST: Approve/reject user (admin only)
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check admin
  const { data: adminData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!adminData?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { userId, approve } = body
  if (!userId || typeof approve !== 'boolean') {
    return NextResponse.json({ error: 'Missing userId or approve' }, { status: 400 })
  }
  const { error } = await supabase
    .from('users')
    .update({ is_approved: approve })
    .eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
} 