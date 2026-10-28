import { db } from "@/lib/db";

// GET /api/admin/install/stream?id=123 (SSE stream untuk admin UI)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");
  if (!jobId) {
    return new Response("Missing job id", { status: 400 });
  }

  let lastLength = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const interval = setInterval(async () => {
        try {
          const res = await db.execute({
            sql: "SELECT log, status, finished_at FROM install_jobs WHERE id = ?",
            args: [jobId],
          });

          if (res.rows.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Job not found" })}\n\n`));
            clearInterval(interval);
            controller.close();
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
            clearInterval(interval);
            controller.close();
          }
        } catch (e) {
          // Keep stream alive or terminate on fatal
        }
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
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
