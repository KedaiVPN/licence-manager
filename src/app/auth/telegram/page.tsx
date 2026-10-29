"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader } from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            username?: string;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready(): void;
      };
    };
    onTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

type TelegramAuthUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

// Username bot TANPA @. Wajib di-set via env NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
// dan domain website harus didaftarkan ke bot via @BotFather -> /setdomain
const BOT_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "kedaivpn_bot";

export default function TelegramAuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTelegramLogin = async (user: TelegramAuthUser) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          first_name: user.first_name,
          username: user.username || undefined,
          photo_url: user.photo_url || undefined,
          auth_date: user.auth_date,
          hash: user.hash,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Login failed");
        setIsLoading(false);
      }
    } catch {
      setError("An error occurred during login");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1) Kalau dibuka sebagai Telegram Mini App, langsung pakai initData
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      const initData = window.Telegram.WebApp.initDataUnsafe;
      if (initData?.user && initData.hash) {
        handleTelegramLogin({
          id: initData.user.id,
          first_name: initData.user.first_name,
          username: initData.user.username,
          photo_url: initData.user.photo_url,
          auth_date: initData.auth_date,
          hash: initData.hash,
        });
        return;
      }
    }

    // 2) Browser biasa: pasang global callback untuk Login Widget,
    //    lalu inject widget script resmi Telegram.
    window.onTelegramAuth = (user) => {
      handleTelegramLogin(user);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.async = true;

    const container = document.getElementById("telegram-login-container");
    if (container) {
      container.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
      script.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                Verifying with Telegram...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Official Telegram Login Widget renders its button here.
                  Widget muncul hanya jika domain sudah /setdomain di BotFather. */}
              <div
                id="telegram-login-container"
                className="flex justify-center min-h-[46px]"
              />
              <p className="text-[11px] text-cyan-800 text-center leading-relaxed">
                Login menggunakan akun Telegram. Kamu akan diminta
                mengotorisasi bot via jendela Telegram.
              </p>
            </div>
          )}

          <div className="mt-8 text-center border-t border-cyan-950 pt-4">
            <p className="text-xs text-cyan-700 mb-3">
              Admin login:
            </p>
            <Link
              href="/login"
              className="text-xs text-cyan-400 hover:text-cyan-300 uppercase tracking-wider inline-block"
            >
              SYSADMIN CONSOLE
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
