"use client";

import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

interface DynamicLicenseHeaderProps {
  showLogout?: boolean;
}

export default function DynamicLicenseHeader({ showLogout = true }: DynamicLicenseHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDashboard = pathname === "/dashboard";

  useEffect(() => {
    // Check if user_session cookie exists
    const cookies = document.cookie.split("; ");
    const hasSession = cookies.some((cookie) => cookie.startsWith("user_session="));
    setIsLoggedIn(hasSession);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header className="border-b border-cyan-950 bg-black/90 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-bold tracking-widest uppercase">
              <span className="text-cyan-400">DYNAMIC</span>
              <span className="text-pink-500">LICENCE</span>
            </h1>
          </Link>

          {/* Burger Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-cyan-400 hover:text-white transition-colors p-1"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-black/95 border border-cyan-950 backdrop-blur-md">
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-xs text-pink-400 hover:bg-cyan-950/40 transition-colors uppercase tracking-widest flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                ) : (
                  <Link
                    href="/publik/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-xs text-cyan-400 hover:bg-cyan-950/40 transition-colors uppercase tracking-widest"
                  >
                    Login
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
