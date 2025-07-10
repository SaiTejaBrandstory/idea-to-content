import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // 'all', 'month', 'week', 'day'
    const year_month = searchParams.get('year_month') // Format: '2024-01'

    let query: any

    // Get total usage statistics with simple query instead of function
    const { data: totalData, error: totalError } = await supabase
      .from('usage_history')
      .select('input_tokens, output_tokens, total_cost_usd, total_cost_inr, api_provider, operation_type')
      .eq('user_id', user.id)
    
    if (totalError) {
      console.error('Error fetching total usage:', totalError)
      return NextResponse.json(
        { error: 'Failed to fetch total usage' },
        { status: 500 }
      )
    }
    
    // Calculate totals manually
    const totalStats = {
      total_operations: totalData.length,
      total_input_tokens: totalData.reduce((sum, item) => sum + (item.input_tokens || 0), 0),
      total_output_tokens: totalData.reduce((sum, item) => sum + (item.output_tokens || 0), 0),
      total_cost_usd: totalData.reduce((sum, item) => sum + (parseFloat(item.total_cost_usd) || 0), 0),
      total_cost_inr: totalData.reduce((sum, item) => sum + (parseFloat(item.total_cost_inr) || 0), 0),
      openai_operations: totalData.filter(item => item.api_provider === 'openai').length,
      together_operations: totalData.filter(item => item.api_provider === 'together').length,
      humanize_operations: totalData.filter(item => item.operation_type === 'humanize').length
    }
    
    query = { data: [totalStats], error: null }

    // Get recent activity (last 10 operations)
    const { data: recentActivity, error: recentError } = await supabase
      .from('usage_history')
      .select('operation_type, api_provider, model_name, total_cost_usd, created_at, generated_content_preview')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Error fetching recent activity:', recentError)
    }

    // Get daily usage for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: dailyUsage, error: dailyError } = await supabase
      .from('usage_history')
      .select('created_at, total_cost_usd, operation_type, api_provider')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (dailyError) {
      console.error('Error fetching daily usage:', dailyError)
    }

    // Process daily usage data
    const dailyStats = dailyUsage ? dailyUsage.reduce((acc: any, record: any) => {
      const date = new Date(record.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          total_cost: 0,
          operations: 0,
          openai_operations: 0,
          together_operations: 0,
          rephrasy_operations: 0
        }
      }
      acc[date].total_cost += parseFloat(record.total_cost_usd || 0)
      acc[date].operations += 1
      if (record.api_provider === 'openai') {
        acc[date].openai_operations += 1
      } else if (record.api_provider === 'together') {
        acc[date].together_operations += 1
      } else if (record.api_provider === 'rephrasy') {
        acc[date].rephrasy_operations += 1
      }
      return acc
    }, {}) : {}

    return NextResponse.json({
      total_usage: query.data?.[0] || null,
      monthly_usage: period === 'month' ? query.data : null,
      recent_activity: recentActivity || [],
      daily_stats: Object.values(dailyStats || {}),
      period,
      year_month
    })
  } catch (error) {
    console.error('Error in stats GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 