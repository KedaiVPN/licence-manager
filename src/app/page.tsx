import { db, initDb } from "@/lib/db";
import { Server, Activity, Users } from "lucide-react";
import Link from "next/link";
export const revalidate = 60;

export default async function Home() {
  await initDb();

  let totalVPS = 0;
  let activeVPS = 0;
  let totalClients = 0;
  let nodes: Record<string, unknown>[] = [];

  try {
    const result = await db.execute("SELECT client_name, status, is_monitoring_enabled, domain FROM licenses");

    totalVPS = result.rows.length;
    activeVPS = result.rows.filter(row => row.status === 'active').length;

    const uniqueClients = new Set(result.rows.map(row => row.client_name as string));
    totalClients = uniqueClients.size;

    nodes = result.rows
      .filter(row => row.is_monitoring_enabled === 1)
      .sort((a, b) => (a.client_name as string).localeCompare(b.client_name as string));
  } catch (error) {
    console.error("Failed to fetch public stats:", error);
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-pink-500 selection:text-white pb-16">
      {/* Background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-cyan-950 bg-black/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold tracking-widest uppercase">
              <span className="text-cyan-400">DYNAMIC</span>
              <span className="text-pink-500">LICENCE</span>
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-6xl mx-auto px-6 mt-12 w-full space-y-12">
          <div className="space-y-3">
            <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight text-white">
              System <span className="text-cyan-400">Status</span>
            </h2>
            <p className="text-cyan-600 max-w-2xl text-sm md:text-base">
              Monitoring global node distribution and active license metrics across the secure network.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="ui-panel p-6 relative overflow-hidden">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-cyan-950/40 border border-cyan-900 text-cyan-400">
                  <Server className="w-5 h-5" />
                </div>
                <h3 className="ui-label">Total Nodes</h3>
              </div>
              <div className="text-4xl font-bold text-white">{totalVPS}</div>
            </div>

            <div className="ui-panel p-6 relative overflow-hidden">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-cyan-950/40 border border-cyan-900 text-cyan-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="ui-label">Active Nodes</h3>
              </div>
              <div className="text-4xl font-bold text-cyan-300">{activeVPS}</div>
            </div>

            <div className="ui-panel p-6 relative overflow-hidden">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-pink-950/30 border border-pink-900 text-pink-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="ui-label">Registered Clients</h3>
              </div>
              <div className="text-4xl font-bold text-pink-400">{totalClients}</div>
            </div>
          </div>

          {/* Client List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-cyan-950 pb-3">
              <h3 className="text-lg font-bold uppercase tracking-wider text-white">Network Participants</h3>
              <div className="text-xs text-cyan-500 font-mono uppercase tracking-widest">Status: Online</div>
            </div>

            {nodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nodes.map((node: Record<string, any>, i) => (
                  <Link key={i} href={`/${node.client_name}/monitoring`} className="block">
                    <div className="ui-panel p-4 flex items-center justify-between hover:border-cyan-500/50 hover:bg-cyan-950/10 transition-all group cursor-pointer">
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse"></div>
                        <span className="text-sm truncate text-cyan-300 font-bold">
                          {node.client_name}
                        </span>
                      </div>
                      <Activity className="w-4 h-4 text-cyan-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="ui-panel p-12 text-center text-cyan-700">
                No active nodes registered in the network yet.
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-cyan-950 py-6 text-center text-xs text-gray-500 tracking-widest mt-auto">
          <p>© {new Date().getFullYear()} DYNAMIC LICENCE SYSTEM // ALL RIGHTS RESERVED</p>
        </footer>
      </div>
    </div>
  );
}
