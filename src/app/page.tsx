import { db, initDb } from "@/lib/db";
import NodeCardLink from "./NodeCardLink";
export const revalidate = 60;

export default async function Home() {
  await initDb();

  let totalVPS = 0;
  let activeVPS = 0;
  let totalClients = 0;
  let nodes: Record<string, unknown>[] = [];

  try {
    const result = await db.execute("SELECT client_name, status, is_monitoring_enabled, domain, tele_id FROM licenses");

    totalVPS = result.rows.length;
    activeVPS = result.rows.filter(row => row.status === 'active').length;

    const uniqueClients = new Set(result.rows.map(row => row.client_name as string));
    totalClients = uniqueClients.size;

    nodes = result.rows
      .filter(row => row.is_monitoring_enabled === 1 && (row.tele_id === null || row.tele_id === ""))
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
          {/* Apple Weather Style Single Card Metrics */}
          <div className="ui-panel p-5 md:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-1">Network Overview</div>
                <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {totalVPS} <span className="text-sm font-normal text-gray-400">Total Nodes</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-900 rounded-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-green-400 font-bold">Secure Network</span>
              </div>
            </div>

            {/* Horizontal progress ratio (Active vs Total) */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-xs tracking-wider">
                <span className="text-gray-400 uppercase">Active Ratio</span>
                <span className="text-cyan-400 font-bold font-mono">
                  {totalVPS > 0 ? Math.round((activeVPS / totalVPS) * 100) : 0}% Active
                </span>
              </div>
              <div className="h-2 bg-gray-900 rounded-sm overflow-hidden p-0.5 border border-cyan-950">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-400 rounded-sm transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                  style={{ width: `${totalVPS > 0 ? (activeVPS / totalVPS) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Sub-tiles grid (Weather app style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-cyan-950/60">
              {/* Active Nodes Tile */}
              <div className="ui-panel-inset p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Active Nodes</div>
                  <div className="text-2xl md:text-3xl font-bold text-cyan-300 font-mono">{activeVPS}</div>
                </div>
                <div className="w-10 h-10 rounded-sm bg-cyan-950/50 border border-cyan-900 flex items-center justify-center text-cyan-400 font-bold text-xs tracking-widest">
                  ACT
                </div>
              </div>

              {/* Registered Clients Tile */}
              <div className="ui-panel-inset p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">Registered Clients</div>
                  <div className="text-2xl md:text-3xl font-bold text-pink-400 font-mono">{totalClients}</div>
                </div>
                <div className="w-10 h-10 rounded-sm bg-pink-950/30 border border-pink-900 flex items-center justify-center text-pink-400 font-bold text-xs tracking-widest">
                  CLI
                </div>
              </div>
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
                  <NodeCardLink key={i} clientName={node.client_name} />
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
