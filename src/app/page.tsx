import { db, initDb } from "@/lib/db";
import { Server, Activity, Users } from "lucide-react";

export const revalidate = 60; // Revalidate page every 60 seconds

export default async function Home() {
  await initDb();

  let totalVPS = 0;
  let activeVPS = 0;
  let clients: string[] = [];

  try {
    const result = await db.execute("SELECT client_name, status FROM licenses");

    totalVPS = result.rows.length;
    activeVPS = result.rows.filter(row => row.status === 'active').length;

    // Get unique client names
    const uniqueClients = new Set(result.rows.map(row => row.client_name as string));
    clients = Array.from(uniqueClients).sort();
  } catch (error) {
    console.error("Failed to fetch public stats:", error);
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-cyan-500 selection:text-black">
      {/* Cyberpunk Grid Background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="border-b border-cyan-900/50 bg-black/80 backdrop-blur-md sticky top-0">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-start items-center">
            <h1 className="text-3xl font-black tracking-tighter">
              <span className="text-cyan-400">DYNAMIC</span>
              <span className="text-pink-500">LICENCE</span>
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow max-w-6xl mx-auto px-6 py-12 w-full">
          <div className="mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight text-white/90">
              System <span className="text-cyan-400">Status</span>
            </h2>
            <p className="text-cyan-600/80 max-w-2xl text-lg">
              Monitoring global node distribution and active license metrics across the network.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <div className="bg-gray-950 border border-cyan-900/40 p-6 rounded-lg relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/5 blur-2xl rounded-full group-hover:bg-cyan-500/10 transition-colors"></div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-cyan-950/30 rounded text-cyan-400">
                  <Server className="w-6 h-6" />
                </div>
                <h3 className="text-sm text-gray-400 uppercase tracking-wider">Total Nodes</h3>
              </div>
              <div className="text-5xl font-black text-white">{totalVPS}</div>
            </div>

            <div className="bg-gray-950 border border-pink-900/40 p-6 rounded-lg relative overflow-hidden group hover:border-pink-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/5 blur-2xl rounded-full group-hover:bg-pink-500/10 transition-colors"></div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-pink-950/30 rounded text-pink-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-sm text-gray-400 uppercase tracking-wider">Active Nodes</h3>
              </div>
              <div className="text-5xl font-black text-white">{activeVPS}</div>
            </div>

            <div className="bg-gray-950 border border-purple-900/40 p-6 rounded-lg relative overflow-hidden group hover:border-purple-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 blur-2xl rounded-full group-hover:bg-purple-500/10 transition-colors"></div>
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-purple-950/30 rounded text-purple-400">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm text-gray-400 uppercase tracking-wider">Registered Clients</h3>
              </div>
              <div className="text-5xl font-black text-white">{clients.length}</div>
            </div>
          </div>

          {/* Client List */}
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-2">
              <h3 className="text-xl font-bold uppercase text-cyan-400">Network Participants</h3>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Status: Online</div>
            </div>

            {clients.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {clients.map((client, i) => (
                  <div key={i} className="bg-gray-900/50 border border-gray-800 px-4 py-3 rounded flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                    <span className="text-gray-300 text-sm truncate">{client}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic p-8 text-center border border-dashed border-gray-800 rounded">
                No active nodes registered in the network yet.
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-cyan-900/30 py-6 text-center text-xs text-gray-500 tracking-widest mt-auto">
          <p>© {new Date().getFullYear()} DYNAMIC LICENCE SYSTEM // ALL RIGHTS RESERVED</p>
        </footer>
      </div>
    </div>
  );
}
