import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signUserToken } from "@/lib/auth";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Telegram OAuth OIDC callback
 * GET /api/auth/telegram/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://monitoring.kedaivpn.my.id";

  if (error) {
    console.error("[TELEGRAM OAUTH] Error from Telegram:", error, errorDescription);
    return NextResponse.redirect(`${baseUrl}/publik/login?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/publik/login?error=invalid_callback`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("tg_auth_state")?.value;
  const codeVerifier = cookieStore.get("tg_code_verifier")?.value;

  if (!storedState || storedState !== state) {
    console.error("[TELEGRAM OAUTH] State mismatch", { stored: storedState, received: state });
    return NextResponse.redirect(`${baseUrl}/publik/login?error=state_mismatch`);
  }

  if (!codeVerifier) {
    console.error("[TELEGRAM OAUTH] Missing code_verifier in cookies");
    return NextResponse.redirect(`${baseUrl}/publik/login?error=missing_verifier`);
  }

  const clientId = process.env.TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[TELEGRAM OAUTH] Credentials not configured");
    return NextResponse.redirect(`${baseUrl}/publik/login?error=server_config_error`);
  }

  try {
    // 1. Exchange code for id_token at official token endpoint
    const tokenRes = await fetch("https://oauth.telegram.org/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: `${baseUrl}/api/auth/telegram/callback`,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[TELEGRAM OAUTH] Token exchange failed:", tokenRes.status, errBody);
      return NextResponse.redirect(`${baseUrl}/publik/login?error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      console.error("[TELEGRAM OAUTH] No id_token returned", tokenData);
      return NextResponse.redirect(`${baseUrl}/publik/login?error=missing_id_token`);
    }

    // 2. Verify id_token JWT using remote JWKS from Telegram
    const JWKS = createRemoteJWKSet(new URL("https://oauth.telegram.org/.well-known/jwks.json"));
    
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: "https://oauth.telegram.org",
      audience: clientId,
    });

    // Use 'id' claim for actual Telegram user ID (not 'sub' which is OIDC identifier)
    const telegramId = String(payload.id || payload.sub);
    const oidcSub = String(payload.sub); // OIDC subject — used to find migrated licenses
    const username = (payload.preferred_username as string) || (payload.username as string) || undefined;
    const firstName = (payload.name as string) || (payload.given_name as string) || undefined;

    if (!telegramId) {
      console.error("[TELEGRAM OAUTH] Payload missing id (telegram id)", payload);
      return NextResponse.redirect(`${baseUrl}/publik/login?error=invalid_user_payload`);
    }

    // 3. Migrate licenses from OIDC sub to real Telegram id if needed
    try {
      const { db } = await import("@/lib/db");
      // Licenses stored under OIDC sub (wrong ID) — migrate to correct Telegram id
      await db.execute({
        sql: `UPDATE install_jobs SET owner_tele_id = ? WHERE owner_tele_id = ?`,
        args: [telegramId, oidcSub],
      });
      const migrated = await db.execute({
        sql: `UPDATE licenses SET tele_id = ? WHERE tele_id = ?`,
        args: [telegramId, oidcSub],
      });
      if (migrated.rowsAffected > 0) {
        console.log(`[TELEGRAM OAUTH] Migrated ${migrated.rowsAffected} license(s) from sub=${oidcSub} to id=${telegramId}`);
      }
    } catch (migrateErr) {
      console.error("[TELEGRAM OAUTH] Migration error (non-fatal):", migrateErr);
    }

    // 4. Create app user session
    const sessionToken = await signUserToken({
      tele_id: telegramId,
      username,
      first_name: firstName,
    });

    cookieStore.set("user_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Cleanup PKCE and state cookies
    cookieStore.delete("tg_code_verifier");
    cookieStore.delete("tg_auth_state");

    return NextResponse.redirect(`${baseUrl}/dashboard`);
  } catch (err: any) {
    console.error("[TELEGRAM OAUTH] Exception during callback:", err);
    return NextResponse.redirect(`${baseUrl}/publik/login?error=internal_error`);
  }
}
