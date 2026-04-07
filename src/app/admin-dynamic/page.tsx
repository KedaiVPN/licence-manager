"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut, Shield, Server, Edit2, Trash2, Plus,
  Activity, RefreshCw, AlertTriangle, AlertCircle
} from "lucide-react";

type License = {
  ip_address: string;
  client_name: string;
  expired_date: string;
  status: "active" | "banned";
  auth_key?: string; // Hidden in UI but present in type
};

type WebhookLog = {
  id: number;
  ip_address: string;
  payload: string;
  status: string;
  error_message: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"licenses" | "webhooks">("licenses");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    ip_address: "",
    client_name: "",
    expired_date: "",
    status: "active" as "active" | "banned",
    auth_key: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "licenses") {
        const res = await fetch("/api/admin/licenses");
        if (res.ok) {
          const data = await res.json();
          setLicenses(data.licenses);
        } else if (res.status === 401) {
          router.push("/login");
        }
      } else {
        const res = await fetch("/api/admin/webhooks");
        if (res.ok) {
          const data = await res.json();
          setWebhookLogs(data.logs);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFormError("");

    try {
      const url = "/api/admin/licenses";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchData();
      } else {
        setFormError(data.error || "An error occurred");
      }
    } catch (error) {
      setFormError("Network error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (ip: string) => {
    if (!confirm(`WARNING: Are you sure you want to delete node ${ip}?`)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/licenses?ip=${ip}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete license");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const editLicense = (license: License) => {
    setFormData({
      ip_address: license.ip_address,
      client_name: license.client_name,
      expired_date: license.expired_date,
      status: license.status,
      auth_key: license.auth_key || "",
    });
    setIsEditing(true);
    setShowForm(true);
    setFormError("");
  };

  const resetForm = () => {
    setFormData({
      ip_address: "",
      client_name: "",
      expired_date: "",
      status: "active",
      auth_key: "",
    });
    setIsEditing(false);
    setFormError("");
  };

  const retryWebhook = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log_id: id }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Webhook retry successful!");
        fetchData();
      } else {
        alert(`Retry failed: ${data.message || data.error}`);
      }
    } catch (error) {
      alert("Network error during retry");
    } finally {
      setActionLoading(false);
    }
  };

  const clearWebhookLogs = async () => {
    if (!confirm("Clear all webhook logs?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/webhooks", { method: "DELETE" });
      if (res.ok) fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono selection:bg-pink-500 selection:text-white pb-12">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-10"
           style={{
             backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.2) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="relative z-10">
        {/* Top Navigation */}
        <header className="border-b border-cyan-900/50 bg-black/80 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-pink-500" />
              <div>
                <h1 className="text-xl font-bold tracking-widest uppercase text-white">SYS<span className="text-pink-500">ADMIN</span></h1>
                <p className="text-[10px] text-cyan-500 tracking-[0.2em] uppercase">Control Panel v2.0</p>
              </div>
            </div>

            <div className="flex gap-4">
              <a href="/" className="text-xs text-cyan-500 border border-cyan-900/50 px-3 py-2 hover:bg-cyan-900/30 transition-colors uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4" /> Public view
              </a>
              <button
                onClick={handleLogout}
                className="text-xs text-pink-500 border border-pink-900/50 px-3 py-2 hover:bg-pink-900/30 transition-colors uppercase tracking-widest flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Terminate Session
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 mt-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-cyan-900/30 pb-4">
            <button
              onClick={() => setActiveTab("licenses")}
              className={`flex items-center gap-2 px-4 py-2 uppercase tracking-widest text-sm transition-colors ${activeTab === 'licenses' ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500' : 'text-cyan-700 hover:text-cyan-400'}`}
            >
              <Server className="w-4 h-4" /> Node Registry
            </button>
            <button
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center gap-2 px-4 py-2 uppercase tracking-widest text-sm transition-colors ${activeTab === 'webhooks' ? 'bg-pink-900/40 text-pink-300 border border-pink-500' : 'text-pink-700 hover:text-pink-400'}`}
            >
              <AlertTriangle className="w-4 h-4" /> Webhook Fails
              {webhookLogs.length > 0 && activeTab !== 'webhooks' && (
                <span className="bg-pink-500 text-black text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{webhookLogs.length}</span>
              )}
            </button>
          </div>

          {/* Licenses View */}
          {activeTab === "licenses" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider">Node Management</h2>
                <button
                  onClick={() => { resetForm(); setShowForm(!showForm); }}
                  className="bg-cyan-500 text-black px-4 py-2 text-sm uppercase tracking-widest font-bold flex items-center gap-2 hover:bg-cyan-400 transition-colors"
                >
                  {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Node</>}
                </button>
              </div>

              {/* Form */}
              {showForm && (
                <div className="bg-gray-900/50 border border-cyan-500/50 p-6 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4 uppercase tracking-widest border-b border-cyan-900/50 pb-2">
                    {isEditing ? "Modify Node Settings" : "Initialize New Node"}
                  </h3>

                  {formError && (
                    <div className="mb-4 p-3 bg-pink-950/30 border border-pink-500/50 text-pink-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> {formError}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">IPv4 Address</label>
                      <input
                        type="text"
                        value={formData.ip_address}
                        onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none disabled:opacity-50 font-mono text-sm"
                        placeholder="192.168.1.1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Client Identifier</label>
                      <input
                        type="text"
                        value={formData.client_name}
                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                        className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                        placeholder="Corp_Alpha"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Expiration Date</label>
                      <input
                        type="date"
                        value={formData.expired_date}
                        onChange={(e) => setFormData({...formData, expired_date: e.target.value})}
                        className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Auth Key <span className="text-gray-500 lowercase">(optional)</span></label>
                      <input
                        type="text"
                        value={formData.auth_key}
                        onChange={(e) => setFormData({...formData, auth_key: e.target.value})}
                        className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                        placeholder="Leave blank for new installs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as "active" | "banned"})}
                        className="w-full bg-black border border-cyan-800 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none font-mono text-sm"
                      >
                        <option value="active">ACTIVE</option>
                        <option value="banned">BANNED</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-cyan-900/50">
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full bg-cyan-950/50 border border-cyan-500 text-cyan-400 py-3 uppercase tracking-widest font-bold hover:bg-cyan-500 hover:text-black transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? "PROCESSING..." : isEditing ? "EXECUTE UPDATE" : "DEPLOY NODE"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto border border-cyan-900/50 bg-gray-950">
                <table className="w-full text-left text-sm">
                  <thead className="bg-cyan-950/30 text-cyan-600 text-xs uppercase tracking-wider border-b border-cyan-900/50">
                    <tr>
                      <th className="p-4">IP Address</th>
                      <th className="p-4">Client Name</th>
                      <th className="p-4">Expiration</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-900/20">
                    {isLoading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-cyan-800 animate-pulse">Loading node data...</td></tr>
                    ) : licenses.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-cyan-800">No nodes found in database.</td></tr>
                    ) : (
                      licenses.map((license) => (
                        <tr key={license.ip_address} className="hover:bg-cyan-900/10 transition-colors">
                          <td className="p-4 text-cyan-300 font-mono">{license.ip_address}</td>
                          <td className="p-4 text-gray-300">{license.client_name}</td>
                          <td className="p-4 text-gray-400">{license.expired_date}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-[10px] uppercase tracking-wider border ${
                              license.status === 'active'
                                ? 'border-cyan-500/50 text-cyan-400 bg-cyan-950/30'
                                : 'border-pink-500/50 text-pink-400 bg-pink-950/30'
                            }`}>
                              {license.status}
                            </span>
                          </td>
                          <td className="p-4 flex justify-end gap-2">
                            <button
                              onClick={() => editLicense(license)}
                              className="p-2 text-cyan-600 hover:text-cyan-400 hover:bg-cyan-900/30 transition-colors border border-transparent hover:border-cyan-800"
                              title="Edit Node"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(license.ip_address)}
                              className="p-2 text-pink-700 hover:text-pink-400 hover:bg-pink-900/30 transition-colors border border-transparent hover:border-pink-800"
                              title="Delete Node"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Webhooks View */}
          {activeTab === "webhooks" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                    Webhook Diagnostics
                  </h2>
                  <p className="text-sm text-pink-600 mt-1">Logs of failed sync attempts with target VPS nodes.</p>
                </div>
                {webhookLogs.length > 0 && (
                  <button
                    onClick={clearWebhookLogs}
                    className="border border-pink-500/50 text-pink-400 px-4 py-2 text-xs uppercase tracking-widest hover:bg-pink-950/50 transition-colors"
                  >
                    Clear All Logs
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="p-8 text-center text-pink-800 animate-pulse border border-pink-900/20 bg-gray-950">
                    Scanning diagnostic logs...
                  </div>
                ) : webhookLogs.length === 0 ? (
                  <div className="p-8 text-center text-cyan-800 border border-cyan-900/20 bg-gray-950">
                    System nominal. No failed webhooks detected.
                  </div>
                ) : (
                  webhookLogs.map((log) => {
                    const payload = JSON.parse(log.payload);
                    return (
                      <div key={log.id} className="border border-pink-900/50 bg-gray-950 p-4 hover:border-pink-500/50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-pink-400 font-bold font-mono">{log.ip_address}</span>
                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-sm text-pink-600 bg-pink-950/20 p-2 border border-pink-900/30 font-mono">
                            Error: {log.error_message}
                          </div>
                          <div className="text-xs text-gray-400 flex gap-4">
                            <span>Action: <span className="text-cyan-400">{payload.action}</span></span>
                            <span>Status: <span className={payload.status === 'active' ? 'text-cyan-400' : 'text-pink-400'}>{payload.status}</span></span>
                          </div>
                        </div>

                        <button
                          onClick={() => retryWebhook(log.id)}
                          disabled={actionLoading}
                          className="w-full md:w-auto bg-transparent border border-cyan-500 text-cyan-400 px-6 py-2 uppercase tracking-widest text-sm hover:bg-cyan-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                          Execute Retry
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
