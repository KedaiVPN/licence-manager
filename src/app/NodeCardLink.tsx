"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ChevronRight, LoaderCircle } from "lucide-react";

interface NodeCardLinkProps {
  clientName: string;
}

export default function NodeCardLink({ clientName }: NodeCardLinkProps) {
  const [isOpening, setIsOpening] = useState(false);

  return (
    <Link
      href={`/${clientName}/monitoring`}
      onClick={() => setIsOpening(true)}
      aria-label={`Open monitoring for ${clientName}`}
      aria-busy={isOpening}
      className={`ui-card-interactive group block min-h-16 p-4 ${isOpening ? "selected" : ""}`}
    >
      <div className="relative z-10 flex h-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden="true">
            <span className="absolute h-3 w-3 rounded-full bg-green-400/30 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-cyan-200">{clientName}</span>
            <span className={`mt-1 block text-[10px] font-bold uppercase tracking-widest ${isOpening ? "text-pink-400" : "text-cyan-600 group-hover:text-cyan-400"}`} aria-live="polite">
              {isOpening ? "Opening..." : "Open monitoring"}
            </span>
          </div>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-cyan-900 bg-black/40 text-cyan-500 transition-colors group-hover:border-cyan-500 group-hover:bg-cyan-950/50 group-hover:text-cyan-200" aria-hidden="true">
          {isOpening ? <LoaderCircle className="h-4 w-4 animate-spin text-pink-400" /> : <ChevronRight className="h-5 w-5" />}
        </span>
      </div>
    </Link>
  );
}
