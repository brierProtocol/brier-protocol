// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  getUnreadNotifications,
  markNotificationRead,
  markAllRead,
} from '@/lib/notifications'

// ---------------------------------------------------------------------------
// GET /api/notifications?address=0x...
// Returns unread notifications for a wallet address.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address')

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Valid wallet address required' },
        { status: 400 }
      )
    }

    const notifications = await getUnreadNotifications(address, 20)

    return NextResponse.json({
      ok: true,
      count: notifications.length,
      notifications,
    })
  } catch (err) {
    console.error('[GET /api/notifications]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/notifications/read
// Body: { id?: string, address?: string }
// Marks one notification (by id) or all notifications (by address) as read.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, address, markAll } = body as {
      id?: string
      address?: string
      markAll?: boolean
    }

    if (markAll && address) {
      await markAllRead(address)
      return NextResponse.json({ ok: true, message: 'All notifications marked as read' })
    }

    if (id) {
      await markNotificationRead(id)
      return NextResponse.json({ ok: true, message: 'Notification marked as read' })
    }

    return NextResponse.json(
      { error: 'Provide either id or address + markAll:true' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[POST /api/notifications]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
