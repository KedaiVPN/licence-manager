import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signUserToken } from '@/lib/auth';
import crypto from 'crypto';

/**
 * Verify Telegram Web App authentication hash
 * POST /api/auth/telegram
 * 
 * Body:
 * {
 *   "id": 123456789,
 *   "first_name": "Izal",
 *   "username": "izal_dev",
 *   "photo_url": "https://...",
 *   "auth_date": 1234567890,
 *   "hash": "aabbccdd..."
 * }
 */
export async function POST(request: Request) {
  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    
    if (!BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Bot token not configured' },
        { status: 500 }
      );
    }

    const data = await request.json();
    const { id, first_name, username, photo_url, auth_date, hash } = data;

    // Validate required fields
    if (!id || !hash || !auth_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify hash signature (prevent spoofing)
    const dataCheckString = [
      `auth_date=${auth_date}`,
      `first_name=${first_name || ''}`,
      `id=${id}`,
      ...(photo_url ? [`photo_url=${photo_url}`] : []),
      ...(username ? [`username=${username}`] : []),
    ]
      .sort()
      .join('\n');

    // Create HMAC-SHA256 signature
    const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash matches
    if (computedHash !== hash) {
      return NextResponse.json(
        { error: 'Invalid authentication hash' },
        { status: 401 }
      );
    }

    // Verify auth_date is recent (within 5 minutes to prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - auth_date;
    if (timeDiff > 300 || timeDiff < -10) {
      return NextResponse.json(
        { error: 'Authentication expired' },
        { status: 401 }
      );
    }

    // Create user session token
    const token = await signUserToken({
      tele_id: String(id),
      username: username || undefined,
      first_name: first_name || undefined,
    });

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('user_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        tele_id: String(id),
        username: username || null,
        first_name: first_name || null,
        photo_url: photo_url || null,
      },
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
