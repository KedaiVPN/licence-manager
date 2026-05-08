import re

with open('src/app/admin-dynamic/page.tsx', 'r') as f:
    content = f.read()

# Update License type
content = content.replace(
    """  tele_id?: string | null;
  label?: string;
};""",
    """  tele_id?: string | null;
  label?: string;
  domain?: string | null;
  is_monitoring_enabled?: number;
};"""
)

# Update formData state
content = content.replace(
    """    auth_key: "",
    tele_id: "",
    label: "",
  });""",
    """    auth_key: "",
    tele_id: "",
    label: "",
    domain: "",
    is_monitoring_enabled: false,
  });"""
)

# Update editLicense
content = content.replace(
    """      auth_key: license.auth_key || "",
      tele_id: license.tele_id || "",
      label: license.label || "",
    });""",
    """      auth_key: license.auth_key || "",
      tele_id: license.tele_id || "",
      label: license.label || "",
      domain: license.domain || "",
      is_monitoring_enabled: Boolean(license.is_monitoring_enabled),
    });"""
)

# Update resetForm
content = content.replace(
    """      auth_key: "",
      tele_id: "",
      label: "",
    });
    setIsEditing(false);""",
    """      auth_key: "",
      tele_id: "",
      label: "",
      domain: "",
      is_monitoring_enabled: false,
    });
    setIsEditing(false);"""
)

# Replace client_name onchange logic
client_name_replace = """                        onChange={(e) => {
                          const val = e.target.value.replace(/\\s+/g, '-');
                          setFormData({...formData, client_name: val});
                        }}"""
content = content.replace(
    """                        onChange={(e) => setFormData({...formData, client_name: e.target.value})}""",
    client_name_replace,
    1 # Only the first one which is the input
)


# Add new inputs to the form
new_inputs = """
                    <div className="md:col-span-2 flex items-center mt-2 mb-2 bg-black border border-cyan-800 p-3 rounded">
                      <input
                        type="checkbox"
                        id="monitoringToggle"
                        checked={formData.is_monitoring_enabled}
                        onChange={(e) => setFormData({...formData, is_monitoring_enabled: e.target.checked})}
                        className="w-5 h-5 accent-cyan-500 mr-3 cursor-pointer"
                      />
                      <label htmlFor="monitoringToggle" className="text-sm font-bold uppercase tracking-wider text-cyan-400 cursor-pointer">
                        Aktifkan Monitoring Publik
                      </label>
                    </div>

                    {formData.is_monitoring_enabled && (
                      <div className="md:col-span-2">
                        <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Domain Server <span className="text-pink-500">*</span></label>
                        <input
                          type="text"
                          value={formData.domain}
                          onChange={(e) => setFormData({...formData, domain: e.target.value})}
                          className="w-full bg-black border border-pink-500/50 p-2 text-cyan-300 focus:border-pink-400 focus:outline-none font-mono text-sm shadow-[0_0_10px_rgba(236,72,153,0.1)]"
                          placeholder="node1.example.com"
                          required={formData.is_monitoring_enabled}
                        />
                      </div>
                    )}
"""

# Insert before "<div>\n                      <label className=\"block text-xs uppercase tracking-wider text-cyan-600 mb-2\">Status</label>"
status_div_search = """                    <div>
                      <label className="block text-xs uppercase tracking-wider text-cyan-600 mb-2">Status</label>"""
content = content.replace(status_div_search, new_inputs + "\n" + status_div_search)

with open('src/app/admin-dynamic/page.tsx', 'w') as f:
    f.write(content)
