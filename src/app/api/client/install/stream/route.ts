import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_session")?.value;
  if (!token) return null;
  return await verifyUserToken(token);
}

// GET /api/client/install/stream?id=123 (SSE stream untuk user public install page)
// Validasi: job harus milik user yang sedang login (owner_tele_id match).
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");
  if (!jobId) {
    return new Response("Missing job id", { status: 400 });
  }

  // Verifikasi job ini milik user yang sedang login
  const jobCheck = await db.execute({
    sql: "SELECT owner_tele_id FROM install_jobs WHERE id = ?",
    args: [jobId],
  });
  if (jobCheck.rows.length === 0) {
    return new Response("Job not found", { status: 404 });
  }
  if (String(jobCheck.rows[0].owner_tele_id) !== String(user.tele_id)) {
    return new Response("Forbidden", { status: 403 });
  }

  let lastLength = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        clearInterval(keepalive);
        try { controller.close(); } catch { /* already closed */ }
      };

      const tick = async () => {
        try {
          const res = await db.execute({
            sql: "SELECT log, status, finished_at FROM install_jobs WHERE id = ? AND owner_tele_id = ?",
            args: [jobId, user.tele_id],
          });

          if (res.rows.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Job not found" })}\n\n`));
            close();
            return;
          }

          const job = res.rows[0] as any;
          const currentLog = job.log || "";
          const newChunk = currentLog.slice(lastLength);

          if (newChunk) {
            lastLength = currentLog.length;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ chunk: newChunk, status: job.status })}\n\n`)
            );
          }

          if (job.finished_at || ["success", "failed", "cancelled", "needs_confirmation"].includes(job.status)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, status: job.status })}\n\n`)
            );
            close();
          }
        } catch {
          // Keep stream alive or terminate on fatal
        }
      };

      const interval = setInterval(tick, 1000);
      const keepalive = setInterval(() => {
        try { controller.enqueue(encoder.encode(": ping\n\n")); } catch { /* closed */ }
      }, 15000);

      await tick();

      request.signal.addEventListener("abort", () => close());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
