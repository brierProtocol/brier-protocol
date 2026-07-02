import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Twitter Client ID not configured' }, { status: 500 });
  }

  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // State encodes the wallet + random string to prevent CSRF
  const randomState = crypto.randomBytes(16).toString('hex');
  const state = `${wallet.toLowerCase()}_${randomState}`;

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`;

  // Build Twitter OAuth 2.0 URL
  const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
  twitterAuthUrl.searchParams.set('response_type', 'code');
  twitterAuthUrl.searchParams.set('client_id', clientId);
  twitterAuthUrl.searchParams.set('redirect_uri', redirectUri);
  twitterAuthUrl.searchParams.set('scope', 'users.read tweet.read offline.access'); // Minimal scope for reading profile
  twitterAuthUrl.searchParams.set('state', state);
  twitterAuthUrl.searchParams.set('code_challenge', codeChallenge);
  twitterAuthUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(twitterAuthUrl.toString());

  // Store code_verifier and state in cookies for the callback
  response.cookies.set('twitter_oauth_verifier', codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 10, path: '/' });
  response.cookies.set('twitter_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 10, path: '/' });

  return response;
}
