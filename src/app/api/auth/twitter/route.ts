import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Starts the X (Twitter) OAuth 2.0 PKCE flow. Redirects the user to X to
// authorize; the callback verifies and stores the handle with xVerified=true.
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

  // PKCE code_verifier + code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // State encodes the wallet + random string to prevent CSRF
  const randomState = crypto.randomBytes(16).toString('hex');
  const state = `${wallet.toLowerCase()}_${randomState}`;

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`;

  const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
  twitterAuthUrl.searchParams.set('response_type', 'code');
  twitterAuthUrl.searchParams.set('client_id', clientId);
  twitterAuthUrl.searchParams.set('redirect_uri', redirectUri);
  twitterAuthUrl.searchParams.set('scope', 'users.read tweet.read offline.access');
  twitterAuthUrl.searchParams.set('state', state);
  twitterAuthUrl.searchParams.set('code_challenge', codeChallenge);
  twitterAuthUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(twitterAuthUrl.toString());
  response.cookies.set('twitter_oauth_verifier', codeVerifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 10, path: '/' });
  response.cookies.set('twitter_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 10, path: '/' });

  return response;
}
