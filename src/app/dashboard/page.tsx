"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import InstallButton from "./InstallButton";
import MonitorButton from "./MonitorButton";
import {
  LogOut,
  Plus,
  Server,
  Activity,
  AlertCircle,
  X,
} from "lucide-react";

type License = {
  ip_address: string;
  client_name: string;
  expired_date: string;
  status: "active" | "banned";
  label?: string;
  domain?: string;
  is_monitoring_enabled?: number;
};

type FormData = {
  ip_address: string;
  client_name: string;
  expired_date: string;
  label: string;
  domain: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState<string | null>(null); // ip_address or null
  const [installPassword, setInstallPassword] = useState("");
  const [installPort, setInstallPort] = useState("22");
  const [installError, setInstallError] = useState("");
  const [installLoading, setInstallLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    ip_address: "",
    client_name: "",
    expired_date: "",
    label: "",
    domain: "",
  });

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const res = await fetch("/api/client/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
      } else if (res.status === 401) {
        router.push("/auth/telegram");
      }
    } catch (error) {
      console.error("Failed to fetch licenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/telegram");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/client/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setShowForm(false);
        setFormData({
          ip_address: "",
          client_name: "",
          expired_date: "",
          label: "",
          domain: "",
        });
        fetchLicenses();
      } else {
        setFormError(data.error || "Failed to register license");
      }
    } catch (error) {
      setFormError("Network error occurred");
    } finally {
      setFormLoading(false);
    }
  };

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showInstallModal) return;
    setInstallLoading(true);
    setInstallError("");

    try {
      const res = await fetch("/api/client/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_address: showInstallModal,
          ssh_port: Number(installPort),
          password: installPassword,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setShowInstallModal(null);
        setInstallPassword("");
        setInstallPort("22");
      } else {
        setInstallError(data.error || "Failed to start installation");
      }
    } catch {
      setInstallError("Network error occurred");
    } finally {
      setInstallLoading(false);
    }
  }; 

  const openInstallModal = (ipAddress: string) => {
    setShowInstallModal(ipAddress);
    setInstallPassword("");
    setInstallPort("22");
    setInstallError("");
  }; 

  const closeInstallModal = () => {
    if (!installLoading) {
      setShowInstallModal(null);
      setInstallPassword("");
      setInstallError("");
    }
  };

  const closeForm = () => {
    if (!formLoading) {
      setShowForm(false);
      setFormError("");
    }
  }; 

  const selectedLicense = showInstallModal
    ? licenses.find((license) => license.ip_address === showInstallModal)
    : null; 

  const activeLicenses = licenses.filter((license) => license.status === "active").length; 

  const bannedLicenses = licenses.length - activeLicenses; 

  const expirySoon = licenses.filter((license) => {
    const expiry = new Date(`${license.expired_date}T23:59:59`);
    const now = new Date();
    const inThirtyDays = new Date(now);
    inThirtyDays.setDate(now.getDate() + 30);
    return expiry >= now && expiry <= inThirtyDays;
  }).length; 

  const summaryItems = [
    { label: "Total", value: licenses.length, color: "text-white" },
    { label: "Active", value: activeLicenses, color: "text-cyan-400" },
    { label: "Banned", value: bannedLicenses, color: "text-pink-400" },
    { label: "Expiring", value: expirySoon, color: "text-yellow-400" },
  ]; 

  const installModal = selectedLicense && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="ui-panel p-6 shadow-2xl w-full max-w-lg bg-[#0a0a0c] relative">
        <button
          type="button"
          onClick={closeInstallModal}
          disabled={installLoading}
          className="absolute top-4 right-4 text-cyan-500 hover:text-pink-500 disabled:opacity-50"
          aria-label="Close install dialog"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-lg font-bold text-cyan-400 mb-1 uppercase tracking-widest">
          Install Server
        </h3>
        <p className="text-sm text-gray-400 mb-5 pb-4 border-b border-cyan-950">
          <span className="text-white">{selectedLicense.client_name}</span> · {selectedLicense.ip_address}
        </p>
        {installError && (
          <div className="mb-4 p-3 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {installError}
          </div>
        )}
        <form onSubmit={handleInstall} className="space-y-4">
          <div>
            <label className="ui-label block mb-2">SSH Password *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={installPassword}
              onChange={(event) => setInstallPassword(event.target.value)}
              className="ui-input p-2 font-mono text-sm"
              required
            />
          </div>
          <div>
            <label className="ui-label block mb-2">SSH Port</label>
            <input
              type="number"
              min="1"
              max="65535"
              value={installPort}
              onChange={(event) => setInstallPort(event.target.value)}
              className="ui-input p-2 font-mono text-sm"
              required
            />
          </div>
          <p className="text-[11px] leading-relaxed text-cyan-800">
            Password dienkripsi sebelum disimpan dan hanya digunakan daemon instalasi.
          </p>
          <button
            type="submit"
            disabled={installLoading}
            className="w-full bg-cyan-950/60 border border-cyan-500 text-cyan-400 py-3 uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-colors disabled:opacity-50"
          >
            {installLoading ? "STARTING..." : "START INSTALLATION"}
          </button>
        </form>
      </div>
    </div>
  );

  const summaryGrid = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {summaryItems.map((item) => (
        <div key={item.label} className="border border-cyan-950 p-3 bg-black/30">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-700 mb-1">{item.label}</div>
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  ); 

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono selection:bg-pink-500 selection:text-white pb-12">
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      ></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-cyan-950 bg-black/90 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold tracking-widest uppercase text-white">
                <span className="text-cyan-400">CLIENT</span>
                <span className="text-pink-500">PORTAL</span>
              </h1>
              <p className="text-[10px] text-cyan-600 tracking-[0.2em] uppercase">
                License Management
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-pink-400 border border-pink-900 px-3 py-2 hover:bg-pink-950/40 transition-colors uppercase tracking-widest flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 mt-8">
          <div className="space-y-6">
            {/* Summary */}
            <div className="ui-panel p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-2">
                    Overview
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-cyan-500 text-black px-4 py-2 text-sm uppercase tracking-widest font-bold flex items-center gap-2 hover:bg-cyan-400 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Register License
                </button>
              </div>
              {summaryGrid}
            </div>

            {/* Form Modal */}
            {showForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="ui-panel p-6 shadow-2xl w-full max-w-2xl bg-[#0a0a0c] relative">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={formLoading}
                    className="absolute top-4 right-4 text-cyan-500 hover:text-pink-500 disabled:opacity-50"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <h3 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-widest border-b border-cyan-950 pb-2">
                    Register New License
                  </h3>

                  {formError && (
                    <div className="mb-4 p-3 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {formError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="ui-label block mb-2">IP Server *</label>
                      <input
                        type="text"
                        value={formData.ip_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ip_address: e.target.value,
                          })
                        }
                        className="ui-input p-2 font-mono text-sm"
                        placeholder="1.2.3.4"
                        required
                      />
                    </div>

                    <div>
                      <label className="ui-label block mb-2">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        value={formData.client_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client_name: e.target.value.replace(/\s+/g, "-"),
                          })
                        }
                        className="ui-input p-2 font-mono text-sm"
                        placeholder="Corp_Alpha"
                        required
                      />
                    </div>

                    <div>
                      <label className="ui-label block mb-2">
                        Domain *
                      </label>
                      <input
                        type="text"
                        value={formData.domain}
                        onChange={(e) =>
                          setFormData({ ...formData, domain: e.target.value })
                        }
                        className="ui-input p-2 font-mono text-sm"
                        placeholder="node1.example.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="ui-label block mb-2">Label *</label>
                        <select
                          value={formData.label}
                          onChange={(e) =>
                            setFormData({ ...formData, label: e.target.value })
                          }
                          className="ui-input p-2 font-mono text-sm bg-black"
                          required
                        >
                          <option value="">SELECT</option>
                          <option value="zivpn">ZIVPN</option>
                          <option value="tunneling">TUNNELING</option>
                        </select>
                      </div>

                      <div>
                        <label className="ui-label block mb-2">
                          Expired Date *
                        </label>
                        <input
                          type="date"
                          value={formData.expired_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              expired_date: e.target.value,
                            })
                          }
                          className="ui-input p-2 font-mono text-sm"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full bg-cyan-950/60 border border-cyan-500 text-cyan-400 py-3 uppercase tracking-widest font-bold hover:bg-cyan-400 hover:text-black transition-colors disabled:opacity-50 mt-6"
                    >
                      {formLoading ? "REGISTERING..." : "REGISTER LICENSE"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Licenses List */}
            {isLoading ? (
              <div className="ui-panel p-12 text-center text-cyan-700 animate-pulse">
                Loading licenses...
              </div>
            ) : licenses.length === 0 ? (
              <div className="ui-panel p-12 text-center text-cyan-800">
                No licenses registered yet. Click "Register License" to add
                one.
              </div>
            ) : (
              <div className="space-y-4">
                {licenses.map((license) => (
                  <div key={license.ip_address} className="ui-panel p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-white font-bold text-lg">
                          {license.client_name}
                        </div>
                        <div className="text-xs text-cyan-400 font-mono mt-0.5">
                          {license.ip_address}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs uppercase tracking-wider border ${
                          license.status === "active"
                            ? "border-cyan-500/50 text-cyan-400 bg-cyan-950/30"
                            : "border-pink-500/50 text-pink-400 bg-pink-950/30"
                        }`}
                      >
                        {license.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400 mb-4 pb-4 border-b border-cyan-950">
                      <div>
                        Exp: <span className="text-white">{license.expired_date}</span>
                      </div>
                      <div>
                        Label:{" "}
                        <span className="text-cyan-400 uppercase">
                          {license.label || "-"}
                        </span>
                      </div>
                      {license.domain && (
                        <div className="col-span-2 md:col-span-2">
                          Domain: <span className="text-gray-300 font-mono">{license.domain}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <InstallButton
                        ipAddress={license.ip_address}
                        disabled={license.status !== "active"}
                      />
                      <MonitorButton
                        clientName={license.client_name}
                        isEnabled={Boolean(license.is_monitoring_enabled)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
        {installModal}
      </div>
    </div>
  );
}
