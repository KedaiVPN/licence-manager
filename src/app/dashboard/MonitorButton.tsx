"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

interface MonitorButtonProps {
  clientName: string;
  isEnabled: boolean;
}

export default function MonitorButton({ clientName, isEnabled }: MonitorButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isEnabled || isLoading) {
      e.preventDefault();
      return;
    }
    setIsLoading(true);
    // Navigate after brief feedback
    router.push(`/${clientName}/monitoring`);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isEnabled || isLoading}
      className={`flex-1 py-2 border text-xs uppercase tracking-wider font-bold transition-colors ${
        isEnabled && !isLoading
          ? "border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/20"
          : "border-cyan-900 text-cyan-800 cursor-not-allowed opacity-50"
      }`}
      title={
        isEnabled
          ? "Buka halaman monitoring"
          : "Monitoring aktif setelah instalasi berhasil"
      }
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-1.5">
          <LoaderCircle className="w-3 h-3 animate-spin" />
          Opening...
        </span>
      ) : (
        "Monitor"
      )}
    </button>
  );
}
