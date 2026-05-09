"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Cpu, MemoryStick as Memory, Activity, Globe, Clock } from "lucide-react";

interface ServerMonitorProps {
  domain: string;
  clientName: string;
}

interface StreamData {
  time: string;
  cpu_usage: number;
  ram_used: number;
  ram_total: number;
  ram_percentage: number;
  net_rx_mbps: number;
  net_tx_mbps: number;
  bandwidth_daily_gb: string;
  bandwidth_monthly_gb: string;
  uptime: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-cyan-500/50 p-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <p className="text-gray-400 text-xs mb-2">{label}</p>
        {payload.map((entry: { color: string, name: string, value: number }, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-bold font-mono" style={{ color: entry.color }}>
              {entry.value.toFixed(2)} {entry.name.includes('Mbps') ? 'Mbps' : '%'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ServerMonitor({ domain, clientName }: ServerMonitorProps) {
  const [dataBuffer, setDataBuffer] = useState<StreamData[]>([]);
  const [latestData, setLatestData] = useState<StreamData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectSSE = () => {
      // Connect directly to the VPS domain
      eventSource = new EventSource(`https://${domain}/api/monitoring/stream`);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);

          const now = new Date();
          const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

          const newData: StreamData = {
            time: timeString,
            cpu_usage: parseFloat(parsed.cpu_usage),
            ram_used: parseFloat(parsed.ram_used),
            ram_total: parseFloat(parsed.ram_total),
            ram_percentage: parseFloat(parsed.ram_used) / parseFloat(parsed.ram_total) * 100,
            net_rx_mbps: parseFloat(parsed.net_rx_mbps),
            net_tx_mbps: parseFloat(parsed.net_tx_mbps),
            bandwidth_daily_gb: parsed.bandwidth_daily_gb,
            bandwidth_monthly_gb: parsed.bandwidth_monthly_gb,
            uptime: parseFloat(parsed.uptime)
          };

          setLatestData(newData);

          setDataBuffer(prev => {
            const newBuffer = [...prev, newData];
            // Keep last 20 data points
            if (newBuffer.length > 20) {
              return newBuffer.slice(newBuffer.length - 20);
            }
            return newBuffer;
          });
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        eventSource?.close();
        setIsConnected(false);
        setError("Connection to telemetry stream lost. Attempting to reconnect...");

        // Try to reconnect after 5 seconds
        reconnectTimeout = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [domain]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };



  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {error && (
          <div className="flex-1 bg-pink-950/30 border border-pink-500/50 p-3 text-pink-400 text-sm flex items-center justify-between animate-pulse">
            <span>{error}</span>
          </div>
        )}
        {!isConnected && !error && (
          <div className="flex-1 bg-cyan-950/30 border border-cyan-500/50 p-3 text-cyan-400 text-sm flex items-center gap-3">
            <Globe className="w-4 h-4 animate-spin" />
            <span>Establishing secure connection to telemetry stream...</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-950 border border-gray-800 p-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 blur-xl rounded-full"></div>
          <div className="flex items-center space-x-2 mb-2 text-cyan-600">
            <Cpu className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-bold">CPU Load</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {latestData ? `${latestData.cpu_usage.toFixed(1)}%` : '--'}
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 blur-xl rounded-full"></div>
          <div className="flex items-center space-x-2 mb-2 text-pink-600">
            <Memory className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-bold">Memory</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {latestData ? `${latestData.ram_used.toFixed(0)} MB` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            of {latestData ? `${latestData.ram_total.toFixed(0)} MB` : '--'}
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl rounded-full"></div>
          <div className="flex items-center space-x-2 mb-2 text-purple-600">
            <Activity className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-bold">Bandwidth</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {latestData ? `${latestData.bandwidth_daily_gb} GB` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Today
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 blur-xl rounded-full"></div>
          <div className="flex items-center space-x-2 mb-2 text-green-600">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-bold">Uptime</span>
          </div>
          <div className="text-2xl font-black text-white font-mono text-sm md:text-xl md:mt-1">
            {latestData ? formatUptime(latestData.uptime) : '--'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Load Chart */}
        <div className="bg-gray-950 border border-gray-800 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center">
            <div className="w-1 h-4 bg-cyan-500 mr-2"></div>
            System Load (CPU/RAM)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataBuffer} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickMargin={10} minTickGap={30} />
                <YAxis stroke="#4b5563" fontSize={10} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cpu_usage" name="CPU" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
                <Area type="monotone" dataKey="ram_percentage" name="RAM" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Chart */}
        <div className="bg-gray-950 border border-gray-800 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center">
            <div className="w-1 h-4 bg-purple-500 mr-2"></div>
            Network Throughput
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataBuffer} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickMargin={10} minTickGap={30} />
                <YAxis stroke="#4b5563" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="net_rx_mbps" name="Download (Mbps)" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorRx)" isAnimationActive={false} />
                <Area type="monotone" dataKey="net_tx_mbps" name="Upload (Mbps)" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
