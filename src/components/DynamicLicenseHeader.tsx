"use client";

import Link from "next/link";
import { Gauge, Home, Loader2, LogIn, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface DynamicLicenseHeaderProps {
  showLogout?: boolean;
}

export default function DynamicLicenseHeader({ showLogout = true }: DynamicLicenseHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isOnDashboard = pathname === "/dashboard";
  const isOnHome = pathname === "/";

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        const data = response.ok ? await response.json() : { isLoggedIn: false };
        setIsLoggedIn(Boolean(data.isLoggedIn));
      } catch {
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsLoggedIn(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-cyan-950 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <h1 className="text-2xl font-bold uppercase tracking-widest">
              <span className="text-cyan-400">DYNAMIC</span>
              <span className="text-pink-500">LICENCE</span>
            </h1>
          </Link>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-cyan-950/30 active:bg-cyan-950/50"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
          >
            <span
              className={`flex h-4 w-[22px] flex-col justify-center gap-[5px] transition-transform duration-500 ${
                menuOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              <span
                className={`h-[2.5px] rounded-full bg-cyan-400 transition-all duration-500 ${
                  menuOpen
                    ? "w-full translate-y-[7.5px] rotate-45"
                    : "w-[70%] self-start"
                }`}
              />
              <span
                className={`h-[2.5px] w-full rounded-full bg-cyan-400 transition-transform duration-500 ${
                  menuOpen ? "scale-x-0" : ""
                }`}
              />
              <span
                className={`h-[2.5px] rounded-full bg-cyan-400 transition-all duration-500 ${
                  menuOpen
                    ? "w-full -translate-y-[7.5px] -rotate-45"
                    : "w-[70%] self-start"
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      <button
        type="button"
        aria-label="Tutup menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-x-0 bottom-0 top-16 z-30 bg-black/60 backdrop-blur-[1px] transition-opacity duration-200 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={menuRef}
        id="public-navigation"
        className={`fixed inset-x-0 top-16 z-40 border-b border-cyan-950 bg-black/95 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300 ease-out ${
          menuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-3 opacity-0"
        }`}
      >
        <nav className="mx-auto max-w-6xl px-6 py-2" aria-label="Menu utama">
          {/* Navigation items based on current page */}
          {isOnDashboard && (
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[52px] items-center gap-3 border-b border-cyan-950/70 px-1 py-4 text-left text-sm uppercase tracking-widest text-cyan-400 transition-colors hover:bg-cyan-950/20 active:bg-cyan-950/40"
            >
              <Home className="h-5 w-5 shrink-0" />
              <span>Home</span>
            </Link>
          )}

          {isOnHome && (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[52px] items-center gap-3 border-b border-cyan-950/70 px-1 py-4 text-left text-sm uppercase tracking-widest text-cyan-400 transition-colors hover:bg-cyan-950/20 active:bg-cyan-950/40"
            >
              <Gauge className="h-5 w-5 shrink-0" />
              <span>Dashboard</span>
            </Link>
          )}

          {/* Auth items */}
          {isLoggedIn === null ? (
            <div className="flex min-h-[52px] items-center gap-3 border-b border-cyan-950/70 px-1 py-4 text-sm uppercase tracking-widest text-cyan-700">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Memuat...</span>
            </div>
          ) : isLoggedIn && showLogout ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[52px] w-full items-center gap-3 border-b border-cyan-950/70 px-1 py-4 text-left text-sm uppercase tracking-widest text-pink-400 transition-colors hover:bg-cyan-950/20 active:bg-cyan-950/40"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </button>
          ) : (
            <Link
              href="/publik/login"
              onClick={() => setMenuOpen(false)}
              className="flex min-h-[52px] items-center gap-3 border-b border-cyan-950/70 px-1 py-4 text-sm uppercase tracking-widest text-cyan-400 transition-colors hover:bg-cyan-950/20 active:bg-cyan-950/40"
            >
              <LogIn className="h-5 w-5 shrink-0" />
              <span>Login</span>
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
