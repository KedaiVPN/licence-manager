"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

interface InstallButtonProps {
  ipAddress: string;
  disabled?: boolean;
}

export default function InstallButton({ ipAddress, disabled }: InstallButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isLoading) {
      e.preventDefault();
      return;
    }
    setIsLoading(true);
    // Navigate after brief feedback
    router.push(`/public/install?ip=${encodeURIComponent(ipAddress)}`);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`flex-1 py-2 text-center border text-xs uppercase tracking-wider font-bold transition-colors ${
        disabled || isLoading
          ? "border-cyan-900 text-cyan-800 cursor-not-allowed opacity-50"
          : "bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-950"
      }`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-1.5">
          <LoaderCircle className="w-3 h-3 animate-spin" />
          Opening...
        </span>
      ) : (
        "Install"
      )}
    </button>
  );
}
