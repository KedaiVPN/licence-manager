"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

interface DynamicLicenseHeaderProps {
  showLogout?: boolean;
}

export default function DynamicLicenseHeader({ showLogout = true }: DynamicLicenseHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
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

          {showLogout && isDashboard && (
            <button
              onClick={handleLogout}
              className="text-xs text-pink-400 border border-pink-900 px-3 py-2 hover:bg-pink-950/40 transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
