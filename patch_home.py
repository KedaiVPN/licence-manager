import re

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Update SQL query
content = content.replace(
    """const result = await db.execute("SELECT client_name, status FROM licenses");""",
    """const result = await db.execute("SELECT client_name, status, is_monitoring_enabled, domain FROM licenses");"""
)

# Update node data
content = content.replace(
    """  let clients: string[] = [];""",
    """  let nodes: any[] = [];"""
)

content = content.replace(
    """    // Get unique client names
    const uniqueClients = new Set(result.rows.map(row => row.client_name as string));
    clients = Array.from(uniqueClients).sort();""",
    """    nodes = result.rows.sort((a, b) => (a.client_name as string).localeCompare(b.client_name as string));"""
)

content = content.replace(
    """              <div className="text-5xl font-black text-white">{clients.length}</div>""",
    """              <div className="text-5xl font-black text-white">{nodes.length}</div>"""
)

# Render nodes instead of unique clients
node_render = """            {nodes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nodes.map((node, i) => {
                  const isMonitoringEnabled = node.is_monitoring_enabled === 1;
                  const CardContent = (
                    <div className={`px-4 py-3 rounded flex items-center justify-between border transition-all ${
                      isMonitoringEnabled
                        ? 'bg-cyan-950/20 border-cyan-500/50 hover:bg-cyan-900/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer group'
                        : 'bg-gray-900/50 border-gray-800'
                    }`}>
                      <div className="flex items-center space-x-3 truncate">
                        <div className={`w-2 h-2 rounded-full ${isMonitoringEnabled ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className={`text-sm truncate ${isMonitoringEnabled ? 'text-cyan-300 font-bold' : 'text-gray-400'}`}>
                          {node.client_name}
                        </span>
                      </div>
                      {isMonitoringEnabled && (
                        <Activity className="w-4 h-4 text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  );

                  return isMonitoringEnabled ? (
                    <a key={i} href={`/${node.client_name}/monitoring`} className="block">
                      {CardContent}
                    </a>
                  ) : (
                    <div key={i}>{CardContent}</div>
                  );
                })}
              </div>
            ) : ("""

content = content.replace(
    """            {clients.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {clients.map((client, i) => (
                  <div key={i} className="bg-gray-900/50 border border-gray-800 px-4 py-3 rounded flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                    <span className="text-gray-300 text-sm truncate">{client}</span>
                  </div>
                ))}
              </div>
            ) : (""",
    node_render
)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)
