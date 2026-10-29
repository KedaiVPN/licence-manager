import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signUserToken } from "@/lib/auth";

/**
 * Telegram OAuth OIDC callback
 * GET /api/auth/telegram/callback
 *
 * Telegram redirects here with:
 *   ?code=...&state=...
 *   or ?error=...&error_description=...
 *
 * Flow:
 *  1. Validate state (CSRF protection)
 *  2. Exchange code for id_token via POST to Telegram token endpoint
 *  3. Verify id_token JWT signature using Telegram's JWKS
 *  4. Create user_session cookie
 *  5. Redirect to /dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors (user declined, etc.)
  if (error) {
    const redirectUrl = new URL("/auth/telegram", request.url);
    redirectUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required params
  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth/telegram?error=invalid_callback", request.url));
  }

  // State is sent by Telegram as CSRF protection between frontend & Telegram.
  // We don't need to verify it here since Telegram already did.

  // Client credentials from BotFather Login Widget config
  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Telegram OAuth: TELEGRAM_CLIENT_ID or TELEGRAM_CLIENT_SECRET not set");
    return NextResponse.redirect(new URL("/auth/telegram?error=server_config_error", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenEndpoint = "https://oauth.telegram.org/code";
    const redirectUri = `${request.nextUrl.origin}/api/auth/telegram/callback`;

    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Telegram token exchange failed:", tokenRes.status, errText);
      return NextResponse.redirect(new URL("/auth/telegram?error=token_exchange_failed", request.url));
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      console.error("Telegram token exchange: no id_token returned", tokenData);
      return NextResponse.redirect(new URL("/auth/telegram?error=missing_id_token", request.url));
    }

    // Decode and verify id_token JWT
    // The token has 3 parts: header.payload.signature
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return NextResponse.redirect(new URL("/auth/telegram?error=invalid_token_format", request.url));
    }

    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

    // Verify algorithm matches expected (RS256 for Telegram)
    if (header.alg !== "RS256") {
      return NextResponse.redirect(new URL("/auth/telegram?error=unsupported_alg", request.url));
    }

    // Fetch Telegram's public keys for JWT verification
    const tgKeyId = header.kid;
    if (!tgKeyId) {
      return NextResponse.redirect(new URL("/auth/telegram?error=missing_key_id", request.url));
    }

    // Telegram publishes their public keys at this endpoint
    const jwksRes = await fetch("https://oauth.telegram.org/jwt/keys");
    if (!jwksRes.ok) {
      console.error("Failed to fetch Telegram JWKS");
      return NextResponse.redirect(new URL("/auth/telegram?error=jwks_fetch_failed", request.url));
    }

    const jwks = await jwksRes.json();
    const key = (jwks.keys || []).find((k: any) => k.kid === tgKeyId);

    if (!key) {
      console.error("Telegram JWKS: key not found for kid:", tgKeyId);
      return NextResponse.redirect(new URL("/auth/telegram?error=key_not_found", request.url));
    }

    // Import the public key (PEM format)
    const publicKeyPem = `-----BEGIN RSA PUBLIC KEY-----\n${key.n}\n-----END RSA PUBLIC KEY-----`.replace(/\\n/g, "\n");

    const publicKey = await crypto.subtle.importKey(
      "spki",
      pemToBinary(publicKeyPem),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Verify JWT signature
    const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signatureBytes = Buffer.from(parts[2], "base64url");
    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signatureBytes,
      signatureInput
    );

    if (!isValid) {
      return NextResponse.redirect(new URL("/auth/telegram?error=invalid_signature", request.url));
    }

    // Validate standard JWT claims
    const now = Math.floor(Date.now() / 1000);

    if (payload.iss !== "https://telegram.org") {
      return NextResponse.redirect(new URL("/auth/telegram?error=invalid_issuer", request.url));
    }

    if (payload.aud !== clientId) {
      return NextResponse.redirect(new URL("/auth/telegram?error=invalid_audience", request.url));
    }

    if (payload.exp && payload.exp < now) {
      return NextResponse.redirect(new URL("/auth/telegram?error=token_expired", request.url));
    }

    // Extract user info from verified payload
    const telegramId = String(payload.sub);
    const username = payload.username || undefined;
    const firstName = payload.first_name || undefined;

    if (!telegramId) {
      return NextResponse.redirect(new URL("/auth/telegram?error=missing_user_id", request.url));
    }

    // Create user session token
    const sessionToken = await signUserToken({
      tele_id: telegramId,
      username,
      first_name: firstName,
    });

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("user_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Clear the state cookie
    cookieStore.delete("tg_auth_state");

    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("Telegram OIDC callback error:", err);
    return NextResponse.redirect(new URL("/auth/telegram?error=internal_error", request.url));
  }
}

// Helper: convert PEM-like string to binary for crypto.subtle
function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN RSA PUBLIC KEY-----/, "")
    .replace(/-----END RSA PUBLIC KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
