"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Terminal, AlertCircle, ArrowLeft, LogOut } from "lucide-react";

type License = {
  ip_address: string;
  client_name: string;
  status: "active" | "banned" | null;
  domain?: string | null;
};

type InstallJob = {
  id: number;
  ip_address: string;
  client_name: string;
  domain: string;
  status: string;
  log?: string;
};

const ACTIVE_STATUSES = ["pending", "running"];

export default function PublicInstallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ipParam = searchParams.get("ip");

  const [license, setLicense] = useState<License | null>(null);
  const [formData, setFormData] = useState({ domain: "", password: "", ssh_port: "22" });
  const [formError, setFormError] = useState("");
  const [job, setJob] = useState<InstallJob | null>(null);
  const [jobLog, setJobLog] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [starting, setStarting] = useState(false);
  const [loadingLicense, setLoadingLicense] = useState(true);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ipParam) {
      setLoadingLicense(false);
      return;
    }
    setLoadingLicense(true);
    (async () => {
      try {
        const res = await fetch(`/api/client/install/license?ip=${encodeURIComponent(ipParam)}`);
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.license) {
          setLicense(data.license);
          setFormData((current) => ({ ...current, domain: current.domain || data.license.domain || "" }));
        }
        if (data.job && data.job.status !== "cancelled") {
          setJob(data.job);
          setJobLog("");
          setJobStatus(data.job.status);
        }
      } finally {
        setLoadingLicense(false);
      }
    })();
  }, [ipParam, router]);

  useEffect(() => {
    if (!job) return;
    setJobStatus(job.status);
    const evtSource = new EventSource(`/api/client/install/stream?id=${job.id}`);

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.chunk) setJobLog((previous) => previous + data.chunk);
        if (data.status) setJobStatus(data.status);
        if (data.done) {
          setJobStatus(data.status || "success");
          evtSource.close();
        }
      } catch { /* SSE keepalive */ }
    };

    return () => evtSource.close();
  }, [job]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [jobLog]);

  const startInstall = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!license) return;
    setStarting(true);
    setFormError("");
    try {
      const res = await fetch("/api/client/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: license.ip_address,
          domain: formData.domain,
          ssh_port: Number(formData.ssh_port) || 22,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create install job");
        return;
      }
      setJob({
        id: data.job_id,
        ip_address: license.ip_address,
        client_name: license.client_name,
        domain: formData.domain,
        status: "pending",
      });
      setJobLog("");
      setJobStatus("pending");
      setFormData((current) => ({ ...current, password: "" }));
    } catch {
      setFormError("Network error while creating install job");
    } finally {
      setStarting(false);
    }
  };

  const jobIsActive = !!job && ACTIVE_STATUSES.includes(jobStatus || job.status);
  const statusColor =
    jobStatus === "success"
      ? "border-green-400/60 text-green-300 bg-green-950/30 shadow-[0_0_14px_rgba(34,197,94,0.6)]"
      : jobStatus === "failed"
        ? "border-pink-500/50 text-pink-400 bg-pink-950/30"
        : jobStatus === "cancelled"
          ? "border-gray-500/50 text-gray-400 bg-gray-900/40"
          : "border-yellow-500/50 text-yellow-400 bg-yellow-950/20";

  return (
    <div className="min-h-screen bg-black text-gray-300 font-mono selection:bg-pink-500 selection:text-white pb-12">
      <header className="border-b border-cyan-950 bg-black/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 border border-cyan-900 text-cyan-400 hover:text-cyan-200 hover:border-cyan-500 transition-colors" title="Back to dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" /> Remote Install
              </h1>
              <p className="text-xs text-cyan-600 font-mono">
                {loadingLicense ? "Memuat data lisensi..." : license ? `${license.ip_address} · ${license.client_name}` : `IP tidak ditemukan: ${ipParam || "-"}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"))}
            className="p-2 text-pink-500 hover:text-pink-300 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8 space-y-6">
        {loadingLicense ? (
          <div className="ui-panel p-8 text-center text-cyan-700 animate-pulse">Memuat data lisensi...</div>
        ) : !license ? (
          <div className="ui-panel p-8 text-center text-pink-500 border-pink-900/50">
            Licence tidak ditemukan untuk IP {ipParam || "-"}.
          </div>
        ) : (
          <>
            <section className="ui-panel p-6">
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-950 pb-2 mb-4">Informasi Target</h2>

              {formError && (
                <div className="mb-4 p-3 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}
              {jobIsActive && (
                <div className="mb-4 p-3 bg-yellow-950/20 border border-yellow-500/40 text-yellow-400 text-sm">
                  Ada instalasi aktif (Job #{job?.id}). Form dinonaktifkan sampai proses selesai.
                </div>
              )}

              <form onSubmit={startInstall} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="ui-label block mb-2">Domain</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    disabled={jobIsActive}
                    className="ui-input p-2 text-cyan-300 font-mono text-sm"
                    placeholder="node1.example.com"
                    required
                  />
                </div>
                <div>
                  <label className="ui-label block mb-2">SSH Port</label>
                  <input
                    type="number"
                    value={formData.ssh_port}
                    onChange={(e) => setFormData({ ...formData, ssh_port: e.target.value })}
                    disabled={jobIsActive}
                    className="ui-input p-2 text-cyan-300 font-mono text-sm"
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="ui-label block mb-2">Root Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={jobIsActive}
                    className="ui-input p-2 text-cyan-300 font-mono text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-[10px] text-cyan-700 mt-1">Password dienkripsi (AES-256-GCM) dan tidak ditampilkan di log.</p>
                </div>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={starting || jobIsActive}
                    className="w-full bg-cyan-950/60 border border-cyan-500 text-cyan-300 py-3 uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-colors disabled:opacity-40"
                  >
                    {starting ? "QUEUING..." : job ? "START NEW INSTALLATION" : "START INSTALLATION"}
                  </button>
                </div>
              </form>
            </section>

            {job && (
              <section className="ui-panel p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950 pb-4">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Install Console — {job.ip_address}</h3>
                      <p className="text-[10px] text-cyan-700 font-mono">Job #{job.id} · {job.domain}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border ${statusColor}`}>
                    {jobStatus || "unknown"}
                  </div>
                </div>

                <div className="bg-[#0a0a0c] border border-cyan-950 p-4 rounded h-80 overflow-auto font-mono text-xs text-green-400 whitespace-pre-wrap leading-relaxed">
                  {jobLog || <span className="text-cyan-600 italic">Waiting for installation logs...</span>}
                  <div ref={logEndRef} />
                </div>

                {jobStatus === "success" && (
                  <div className="p-4 bg-green-950/30 border border-green-500/50 text-green-400 text-sm flex items-center gap-2">
                    ✓ Instalasi selesai. Anda dapat mengakses service Anda di {formData.domain || license.domain}.
                  </div>
                )}
                {jobStatus === "failed" && (
                  <div className="p-4 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
                    ✗ Instalasi gagal. Cek log di atas untuk detail.
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
