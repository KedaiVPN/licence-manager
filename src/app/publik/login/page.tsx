"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

export default function TelegramAuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if opened as Telegram Mini App
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      if (tg.initDataUnsafe?.user) {
        handleMiniAppLogin(tg.initDataUnsafe);
      }
    }
  }, []);

  const handleMiniAppLogin = async (initDataUnsafe: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initDataUnsafe.user.id,
          first_name: initDataUnsafe.user.first_name,
          username: initDataUnsafe.user.username,
          photo_url: initDataUnsafe.user.photo_url,
          auth_date: initDataUnsafe.auth_date,
          hash: initDataUnsafe.hash,
        }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Mini App authentication failed");
        setIsLoading(false);
      }
    } catch {
      setError("Network error during Telegram Mini App login");
      setIsLoading(false);
    }
  };

  const handleOidcLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Call backend start endpoint to securely generate PKCE and cookies
      const res = await fetch("/api/auth/telegram/start");
      if (!res.ok) {
        throw new Error("Failed to initialize Telegram OAuth session");
      }
      const data = await res.json();
      if (!data.redirectUrl) {
        throw new Error("Invalid response from auth initialization");
      }

      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setError(err.message || "Failed to initiate Telegram login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono flex items-center justify-center p-6 selection:bg-pink-500 selection:text-white">
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="w-full max-w-md relative z-10">
        <div className="ui-panel p-8 relative overflow-hidden bg-[#0a0a0c] shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-px bg-cyan-400"></div>

          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-cyan-950/40 border border-cyan-900 mb-4 rounded-sm">
              <svg
                className="w-8 h-8 text-cyan-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm5.894 8.221l-.527 2.596c-.042.209-.175.323-.363.323h-1.45c-.153 0-.278.124-.278.277v1.311c0 .153.125.278.278.278h1.45c.188 0 .321.114.363.323l.527 2.596c.042.209-.013.398-.208.398H15.67c-.167 0-.305-.112-.337-.275l-.315-1.547h-2.556l-.315 1.547c-.032.163-.17.275-.337.275H8.836c-.195 0-.25-.189-.208-.398l.527-2.596c.042-.209.175-.323.363-.323h1.45c.153 0 .278-.125.278-.278v-1.311c0-.153-.125-.277-.278-.277h-1.45c-.188 0-.321-.114-.363-.323L8.106 8.221c-.042-.209.013-.398.208-.398h2.594c.167 0 .305.112.337.275l.315 1.547h2.556l.315-1.547c.032-.163.17-.275.337-.275h2.594c.195 0 .25.189.208.398z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-widest uppercase text-white">
              DYN<span className="text-pink-500">LICENCE</span>
            </h1>
            <p className="text-xs text-cyan-700 mt-2 tracking-widest">
              CLIENT PORTAL
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 border border-pink-500/50 bg-pink-950/30 text-pink-400 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-sm text-cyan-400">
                Redirecting to Telegram...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleOidcLogin}
                className="w-full bg-cyan-950/60 border border-cyan-500 text-cyan-300 py-3 px-4 uppercase tracking-wider font-bold hover:bg-cyan-400 hover:text-black transition-colors flex items-center justify-center gap-3 shadow-lg shadow-cyan-950/50"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zm5.894 8.221l-.527 2.596c-.042.209-.175.323-.363.323h-1.45c-.153 0-.278.124-.278.277v1.311c0 .153.125.278.278.278h1.45c.188 0 .321.114.363.323l.527 2.596c.042.209-.013.398-.208.398H15.67c-.167 0-.305-.112-.337-.275l-.315-1.547h-2.556l-.315 1.547c-.032.163-.17.275-.337.275H8.836c-.195 0-.25-.189-.208-.398l.527-2.596c.042-.209.175-.323.363-.323h1.45c.153 0 .278-.125.278-.278v-1.311c0-.153-.125-.277-.278-.277h-1.45c-.188 0-.321-.114-.363-.323L8.106 8.221c-.042-.209.013-.398.208-.398h2.594c.167 0 .305.112.337.275l.315 1.547h2.556l.315-1.547c.032-.163.17-.275.337-.275h2.594c.195 0 .25.189.208.398z" />
                </svg>
                LOGIN WITH TELEGRAM
              </button>
              <p className="text-[11px] text-cyan-800 text-center leading-relaxed">
                Login menggunakan akun telegram anda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
