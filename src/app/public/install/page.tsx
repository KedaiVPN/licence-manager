"use client";

import { Suspense } from "react";
import PublicInstallContent from "./content";

export default function PublicInstallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-cyan-400 font-mono flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-sm text-cyan-600 animate-pulse">Loading...</div>
          </div>
        </div>
      }
    >
      <PublicInstallContent />
    </Suspense>
  );
}
