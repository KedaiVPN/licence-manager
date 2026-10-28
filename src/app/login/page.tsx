"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      {/* Background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="ui-panel p-8 relative overflow-hidden bg-[#0a0a0c] shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-px bg-cyan-400"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-cyan-950/40 border border-cyan-900 mb-4">
              <Terminal className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-widest uppercase text-white">SYS<span className="text-pink-500">ADMIN</span></h1>
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
              <label className="ui-label block mb-2">Identifier</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ui-input p-3 text-cyan-300"
                placeholder="admin@system.local"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="ui-label block mb-2">Access Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input p-3 pl-10 text-cyan-300"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-700" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-950/60 border border-cyan-500 text-cyan-300 py-3 uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "AUTHENTICATING..." : "INITIALIZE SESSION"}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-cyan-950 pt-4">
            <Link href="/" className="text-xs text-cyan-700 hover:text-cyan-400 uppercase tracking-wider flex items-center justify-center gap-1">
              <span className="text-pink-500">&larr;</span> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
