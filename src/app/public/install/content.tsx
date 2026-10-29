"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Terminal, AlertCircle, ArrowLeft, Loader } from "lucide-react";

export default function PublicInstallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ip = searchParams.get("ip");

  const [password, setPassword] = useState("");
  const [port, setPort] = useState("22");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip) {
      setError("IP address is missing in query string");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/client/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: ip,
          ssh_port: Number(port),
          password: password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to start installation job");
      }
    } catch {
      setError("Network error occurred while initiating installation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono flex items-center justify-center p-6 selection:bg-pink-500 selection:text-white">
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      ></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="ui-panel p-8 bg-[#0a0a0c] shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-px bg-cyan-400"></div>

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-950">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Server Installer
              </h1>
              <p className="text-xs text-cyan-700 mt-1">
                Target Node: <span className="text-white font-mono">{ip || "Unknown"}</span>
              </p>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-cyan-500 hover:text-cyan-300 flex items-center gap-1 border border-cyan-950 px-3 py-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </div>

          {!ip ? (
            <div className="p-4 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Error: IP address parameter (?ip=...) is required.
            </div>
          ) : success ? (
            <div className="space-y-6 py-6 text-center">
              <div className="w-12 h-12 bg-cyan-950 border border-cyan-500 rounded-full flex items-center justify-center mx-auto text-cyan-400">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2">
                  Installation Job Started
                </h3>
                <p className="text-xs text-cyan-600 leading-relaxed max-w-sm mx-auto">
                  Job instalasi untuk <span className="text-cyan-400">{ip}</span> berhasil dibuat dan sedang diproses oleh daemon.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-block w-full bg-cyan-950/60 border border-cyan-500 text-cyan-400 py-3 uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-colors"
              >
                KEMBALI KE DASHBOARD
              </Link>
            </div>
          ) : (
            <form onSubmit={handleInstall} className="space-y-4">
              {error && (
                <div className="p-3 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="ui-label block mb-2">SSH Password *</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input p-3 font-mono text-sm w-full"
                  placeholder="Masukkan password root VPS"
                  required
                />
              </div>

              <div>
                <label className="ui-label block mb-2">SSH Port</label>
                <input
                  type="number"
                  min="1"
                  max="65535"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="ui-input p-3 font-mono text-sm w-full"
                  required
                />
              </div>

              <p className="text-[11px] text-cyan-800 leading-relaxed">
                Kredensial dienkripsi aman dengan AES-256-GCM dan langsung dihapus setelah job selesai.
              </p>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-cyan-950/60 border border-cyan-500 text-cyan-400 py-3.5 uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> STARTING INSTALL...
                  </>
                ) : (
                  "MULAI INSTALASI"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
