"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogOut, ArrowLeft, Terminal, AlertCircle } from "lucide-react";

type License = {
  ip_address: string;
  client_name: string;
  status: "active" | "banned";
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

export default function InstallPage() {
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
        const licRes = await fetch(`/api/admin/install/license?ip=${encodeURIComponent(ipParam)}`);
        if (licRes.status === 401) {
          router.push("/login");
          return;
        }
        const lic = licRes.ok ? (await licRes.json()).license : null;
        setLicense(lic);
        if (lic) setFormData((current) => ({ ...current, domain: current.domain || lic.domain || "" }));

        const jobRes = await fetch(`/api/admin/install?ip=${encodeURIComponent(ipParam)}`);
        if (jobRes.ok) {
          const { job: latest } = await jobRes.json();
          if (latest && latest.status !== "cancelled") {
            setJob(latest);
            setJobLog(latest.log || "");
            setJobStatus(latest.status);
          }
        }
      } finally {
        setLoadingLicense(false);
      }
    })();
  }, [ipParam, router]);

  const startInstall = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!license) return;
    setStarting(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: license.ip_address,
          client_name: license.client_name,
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

  useEffect(() => {
    if (!job) return;
    setJobStatus(job.status);
    const evtSource = new EventSource(`/api/admin/install/stream?id=${job.id}`);

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.chunk) setJobLog((previous) => previous + data.chunk);
        if (data.status) setJobStatus(data.status);
        if (data.done) {
          setJobStatus(data.status || "done");
          evtSource.close();
        }
      } catch { /* SSE keepalive */ }
    };

    return () => evtSource.close();
  }, [job]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [jobLog]);

  const jobIsActive = !!job && ACTIVE_STATUSES.includes(jobStatus || job.status);
  const statusColor =
    jobStatus === "success" ? "border-cyan-500/50 text-cyan-400"
      : jobStatus === "failed" ? "border-pink-500/50 text-pink-400"
        : jobStatus === "cancelled" ? "border-gray-500/50 text-gray-400"
          : "border-yellow-500/50 text-yellow-400";

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <header className="border-b border-cyan-900/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin-dynamic" className="p-2 border border-cyan-800 text-cyan-500 hover:text-cyan-300 hover:border-cyan-500 transition-colors" title="Back to dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" /> Remote Install
              </h1>
              <p className="text-xs text-cyan-700 font-mono">
                {loadingLicense ? "Memuat data lisensi..." : license ? `${license.ip_address} · ${license.client_name}` : `IP tidak ditemukan: ${ipParam || "-"}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login"))}
            className="p-2 text-cyan-600 hover:text-cyan-300 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loadingLicense ? (
          <div className="p-8 text-center text-cyan-800 animate-pulse border border-cyan-900/20 bg-gray-950">Memuat data lisensi...</div>
        ) : !license ? (
          <div className="p-8 text-center text-pink-500 border border-pink-900/30 bg-gray-950">Licence tidak ditemukan untuk IP {ipParam || "-"}.</div>
        ) : (
          <>
            <section className="border border-cyan-900/50 bg-gray-950 p-6">
              <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-900/50 pb-2 mb-4">Informasi Target</h2>

              {formError && (
                <div className="mb-4 p-3 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}
              {jobIsActive && (
                <div className="mb-4 p-3 bg-yellow-950/20 border border-yellow-500/40 text-yellow-400 text-sm">
                  Ada instalasi aktif (Job #{job.id}). Form dinonaktifkan sampai proses selesai.
                </div>
              )}

              <form onSubmit={startInstall} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Domain</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    disabled={jobIsActive}
                    className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm disabled:opacity-50"
                    placeholder="node1.example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">SSH Port</label>
                  <input
                    type="number"
                    value={formData.ssh_port}
                    onChange={(e) => setFormData({ ...formData, ssh_port: e.target.value })}
                    disabled={jobIsActive}
                    className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Root Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={jobIsActive}
                    className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm disabled:opacity-50"
                    placeholder="••••••••"
                    required
                  />
                  <p className="text-[10px] text-cyan-800 mt-1">Password dienkripsi (AES-256-GCM) dan tidak ditampilkan di log.</p>
                </div>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={starting || jobIsActive}
                    className="w-full bg-cyan-950/50 border border-cyan-500 text-cyan-400 py-3 uppercase tracking-widest font-bold hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50"
                  >
                    {starting ? "QUEUING..." : job ? "START NEW INSTALLATION" : "START INSTALLATION"}
                  </button>
                </div>
              </form>
            </section>

            {job && (
              <section className="border border-cyan-900/50 bg-black">
                <div className="flex items-center justify-between border-b border-cyan-900/50 p-4">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Install Console — {job.ip_address}</h3>
                      <p className="text-[10px] text-cyan-700 font-mono">Job #{job.id} · {job.domain}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] uppercase tracking-wider border ${statusColor}`}>{jobStatus || job.status}</span>
                </div>
                <div className="h-80 overflow-y-auto p-4 font-mono text-xs text-cyan-300 whitespace-pre-wrap bg-black">
                  {jobLog || <span className="text-cyan-800 animate-pulse">Menunggu daemon mengambil job...</span>}
                  <div ref={logEndRef} />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
