import { db, initDb } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import ServerMonitor from "./ServerMonitor";

interface PageProps {
  params: Promise<{
    client_name: string;
  }>;
}

export default async function MonitoringPage({ params }: PageProps) {
  const { client_name } = await params;

  await initDb();

  let domain = "";
  let isEnabled = false;

  try {
    const result = await db.execute({
      sql: "SELECT domain, is_monitoring_enabled FROM licenses WHERE client_name = ?",
      args: [client_name],
    });

    if (result.rows.length > 0) {
      const node = result.rows[0];
      isEnabled = node.is_monitoring_enabled === 1;
      domain = (node.domain as string) || "";
    }
  } catch (error) {
    console.error("Failed to fetch monitoring details:", error);
    return notFound();
  }

  if (!isEnabled || !domain) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center p-6 selection:bg-pink-500 selection:text-white">
        {/* Background */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(rgba(236, 72, 153, 0.2) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(236, 72, 153, 0.2) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }}>
        </div>

        <div className="relative z-10 text-center max-w-md bg-gray-950 p-8 border border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.15)]">
          <div className="text-pink-500 text-6xl mb-4 font-black">403</div>
          <h1 className="text-2xl font-bold uppercase tracking-widest text-pink-400 mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm">
            Monitoring data for <span className="text-cyan-400 font-bold">{client_name}</span> is either disabled or the node does not exist in the public registry.
          </p>
          <div className="mt-8">
            <Link href="/" className="inline-block border border-cyan-500 text-cyan-400 px-6 py-2 uppercase tracking-widest text-xs hover:bg-cyan-950/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
              Return to Grid
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-cyan-500 selection:text-black">
      {/* Background */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="border-b border-cyan-900/50 bg-black/80 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl md:text-2xl font-black tracking-tighter">
              <span className="text-gray-500">NODE/</span>
              <span className="text-cyan-400">{client_name}</span>
            </h1>
            <Link href="/" className="text-xs border border-cyan-800 text-cyan-600 px-3 py-1.5 uppercase hover:text-cyan-400 hover:border-cyan-500 transition-colors">
              Back to Registry
            </Link>
          </div>
        </header>

        <main className="flex-grow w-full max-w-6xl mx-auto px-6 py-8">
          <div className="mb-6 border-b border-gray-800 pb-2 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold uppercase text-white tracking-widest">Live Telemetry</h2>
              <div className="text-xs text-cyan-600 mt-1 uppercase tracking-widest font-bold">
                Source: {domain}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] animate-pulse"></div>
              <span className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Streaming</span>
            </div>
          </div>

          <ServerMonitor domain={domain} clientName={client_name} />
        </main>
      </div>
    </div>
  );
}
