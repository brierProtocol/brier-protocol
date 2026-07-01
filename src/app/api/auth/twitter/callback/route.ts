import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// X (Twitter) OAuth callback: exchanges the code, fetches the profile, and stores
// the verified handle (xVerified=true) on the maker's User record.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(`${redirectBase}/discover?error=twitter_auth_denied`);
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(c => {
    const [key, val] = c.trim().split('=');
    if (key && val) cookies[key] = val;
  });

  const storedState = cookies['twitter_oauth_state'];
  const codeVerifier = cookies['twitter_oauth_verifier'];

  if (!code || !returnedState || !storedState || !codeVerifier) {
    return NextResponse.redirect(`${redirectBase}/discover?error=twitter_auth_missing_params`);
  }
  if (returnedState !== storedState) {
    return NextResponse.redirect(`${redirectBase}/discover?error=twitter_auth_state_mismatch`);
  }

  const wallet = storedState.split('_')[0];
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const redirectUri = `${redirectBase}/api/auth/twitter/callback`;

  try {
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Twitter token error:', tokenData);
      return NextResponse.redirect(`${redirectBase}/maker/${wallet}?error=twitter_token_failed`);
    }

    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();
    if (!userResponse.ok || !userData.data) {
      console.error('Twitter user error:', userData);
      return NextResponse.redirect(`${redirectBase}/maker/${wallet}?error=twitter_profile_failed`);
    }

    const xHandle = userData.data.username;

    await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: { xHandle, xVerified: true },
      create: { walletAddress: wallet, xHandle, xVerified: true }
    });

    const response = NextResponse.redirect(`${redirectBase}/maker/${wallet}?x_linked=true`);
    response.cookies.delete('twitter_oauth_state');
    response.cookies.delete('twitter_oauth_verifier');
    return response;

  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return NextResponse.redirect(`${redirectBase}/maker/${wallet}?error=twitter_auth_exception`);
  }
}
