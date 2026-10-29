import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Generate PKCE + state, save to secure cookies, return redirect URL
 * GET /api/auth/telegram/start
 *
 * Returns: { redirectUrl: string }
 */
export async function GET() {
  try {
    const CLIENT_ID = process.env.TELEGRAM_CLIENT_ID;
    if (!CLIENT_ID) {
      return NextResponse.json(
        { error: "TELEGRAM_CLIENT_ID not configured" },
        { status: 500 }
      );
    }

    // Generate PKCE challenge
    const codeVerifier = crypto.randomBytes(32).toString("hex");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString("hex");

    // Save to secure HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set("tg_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    cookieStore.set("tg_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    // Build official Telegram OAuth OIDC authorization URL
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      origin: process.env.NEXT_PUBLIC_APP_URL || "https://monitoring.kedaivpn.my.id",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "https://monitoring.kedaivpn.my.id"}/api/auth/telegram/callback`,
      response_type: "code",
      scope: "openid profile",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const redirectUrl = `https://oauth.telegram.org/auth?${params.toString()}`;

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error("[TELEGRAM START] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
