"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/admin-dynamic");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono flex items-center justify-center p-6 selection:bg-pink-500 selection:text-white">
      {/* Background elements */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
             backgroundSize: '20px 20px'
           }}>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="border border-cyan-500/50 bg-black/80 p-8 shadow-[0_0_15px_rgba(6,182,212,0.3)] relative overflow-hidden backdrop-blur-sm">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-500"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-full bg-cyan-950/50 border border-cyan-800 mb-4 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <Terminal className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-widest uppercase">SYS<span className="text-pink-500">ADMIN</span></h1>
            <p className="text-xs text-cyan-700 mt-2 tracking-widest">AUTHORIZED PERSONNEL ONLY</p>
          </div>

          {error && (
            <div className="mb-6 p-3 border border-pink-500/50 bg-pink-950/30 text-pink-400 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Identifier</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-cyan-950/20 border border-cyan-800 p-3 text-cyan-300 focus:outline-none focus:border-cyan-400 focus:bg-cyan-950/40 transition-colors placeholder:text-cyan-800/50"
                placeholder="admin@system.local"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Access Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-cyan-950/20 border border-cyan-800 p-3 pl-10 text-cyan-300 focus:outline-none focus:border-cyan-400 focus:bg-cyan-950/40 transition-colors placeholder:text-cyan-800/50"
                  placeholder="••••••••••••"
                  required
                />
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-700" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-transparent border border-cyan-500 text-cyan-400 py-3 uppercase tracking-widest font-bold hover:bg-cyan-500 hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <span className="relative z-10">{isLoading ? "AUTHENTICATING..." : "INITIALIZE SESSION"}</span>
              <div className="absolute inset-0 bg-cyan-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0"></div>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-cyan-900/50 pt-4">
            <a href="/" className="text-xs text-cyan-700 hover:text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="text-pink-500">&larr;</span> Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
