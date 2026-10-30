"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader } from "lucide-react";
import DynamicLicenseHeader from "@/components/DynamicLicenseHeader";

interface FormData {
  ip_address: string;
  client_name: string;
  expired_date: string;
  label: string;
  domain: string;
}

export default function RegisterLicensePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    ip_address: "",
    client_name: "",
    expired_date: "",
    label: "",
    domain: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to register license");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Network error");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono flex flex-col">
      <DynamicLicenseHeader showLogout={false} />
      
      <div className="flex-grow flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="ui-panel p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest">
            Register New License
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="ui-label block mb-2">IP Server *</label>
              <input
                type="text"
                value={formData.ip_address}
                onChange={(e) =>
                  setFormData({ ...formData, ip_address: e.target.value })
                }
                required
                className="ui-input bg-[#0a0a0c] border-cyan-900"
              />
            </div>

            <div>
              <label className="ui-label block mb-2">Client Name *</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData({ ...formData, client_name: e.target.value })
                }
                required
                className="ui-input bg-[#0a0a0c] border-cyan-900"
              />
            </div>

            <div>
              <label className="ui-label block mb-2">Expired Date (YYYY-MM-DD) *</label>
              <input
                type="date"
                value={formData.expired_date}
                onChange={(e) =>
                  setFormData({ ...formData, expired_date: e.target.value })
                }
                required
                className="ui-input bg-[#0a0a0c] border-cyan-900"
              />
            </div>

            <div>
              <label className="ui-label block mb-2">Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g. TUNNELING, PROXY"
                className="ui-input bg-[#0a0a0c] border-cyan-900"
              />
            </div>

            <div>
              <label className="ui-label block mb-2">Domain</label>
              <input
                type="text"
                value={formData.domain}
                onChange={(e) =>
                  setFormData({ ...formData, domain: e.target.value })
                }
                placeholder="e.g. example.my.id"
                className="ui-input bg-[#0a0a0c] border-cyan-900"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-500 text-black py-4 uppercase tracking-widest font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" /> Processing...
                </>
              ) : (
                "Register License"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="w-full border border-cyan-700 text-cyan-300 py-3 uppercase tracking-widest font-bold hover:bg-cyan-950/30 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
