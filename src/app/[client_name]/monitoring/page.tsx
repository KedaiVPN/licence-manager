import { db, initDb } from "@/lib/db";
import { notFound } from "next/navigation";
import ServerMonitor from "./ServerMonitor";
import DynamicLicenseHeader from "@/components/DynamicLicenseHeader";

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
        <div className="fixed inset-0 z-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(236, 72, 153, 0.2) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(236, 72, 153, 0.2) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }}>
        </div>

        <div className="ui-panel relative z-10 text-center max-w-md p-8 border-pink-900/60">
          <div className="text-pink-500 text-5xl mb-4 font-bold">403</div>
          <h1 className="text-xl font-bold uppercase tracking-widest text-pink-400 mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Monitoring data for <span className="text-cyan-400 font-bold">{client_name}</span> is either disabled or the node does not exist in the public registry.
          </p>
          <div className="mt-8">
            <a href="/" className="inline-block border border-cyan-500 text-cyan-400 px-6 py-2 uppercase tracking-widest text-xs hover:bg-cyan-950/50 transition-colors">
              Return to Grid
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-pink-500 selection:text-white pb-12">
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <DynamicLicenseHeader showLogout={false} />

        <main className="flex-grow w-full max-w-6xl mx-auto px-6 mt-8">
          <div className="mb-6 border-b border-cyan-950 pb-3 flex justify-between items-end gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold uppercase text-white tracking-widest">Live Telemetry</h2>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-pulse"></div>
              <span className="text-xs text-green-400 uppercase tracking-widest font-bold">Streaming</span>
            </div>
          </div>

          <ServerMonitor domain={domain} clientName={client_name} />
        </main>
      </div>
    </div>
  );
}
