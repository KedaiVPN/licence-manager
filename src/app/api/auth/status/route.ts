import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_session")?.value;
  if (!token) return null;
  return await verifyUserToken(token);
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (user) {
      return NextResponse.json({
        isLoggedIn: true,
        user: {
          tele_id: user.tele_id,
          username: user.username || null,
          first_name: user.first_name || null,
        },
      });
    } else {
      return NextResponse.json({ isLoggedIn: false });
    }
  } catch (error) {
    console.error("Auth status error:", error);
    return NextResponse.json({ isLoggedIn: false }, { status: 500 });
  }
}
