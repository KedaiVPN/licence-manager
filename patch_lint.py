import re

with open('src/app/[client_name]/monitoring/ServerMonitor.tsx', 'r') as f:
    content = f.read()

# Fix CustomTooltip being inside component
custom_tooltip = """const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-cyan-500/50 p-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
        <p className="text-gray-400 text-xs mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-bold font-mono" style={{ color: entry.color }}>
              {entry.value.toFixed(2)} {entry.name.includes('Mbps') ? 'Mbps' : '%'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};"""

content = content.replace("export default function ServerMonitor", custom_tooltip + "\n\nexport default function ServerMonitor")

# Remove CustomTooltip from inside ServerMonitor
search_inner_tooltip = """  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-cyan-500/50 p-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-gray-300">{entry.name}:</span>
              <span className="font-bold font-mono" style={{ color: entry.color }}>
                {entry.value.toFixed(2)} {entry.name.includes('Mbps') ? 'Mbps' : '%'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };"""

content = content.replace(search_inner_tooltip, "")

with open('src/app/[client_name]/monitoring/ServerMonitor.tsx', 'w') as f:
    f.write(content)

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

# Fix Link in page.tsx
content = content.replace("""import { Server, Activity, Users } from "lucide-react";""", """import { Server, Activity, Users } from "lucide-react";\nimport Link from "next/link";""")
content = content.replace("""<a key={i} href={`/${node.client_name}/monitoring`} className="block">""", """<Link key={i} href={`/${node.client_name}/monitoring`} className="block">""")
content = content.replace("""</a>""", """</Link>""")

with open('src/app/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/[client_name]/monitoring/page.tsx', 'r') as f:
    content = f.read()

content = content.replace("""import { notFound } from "next/navigation";""", """import { notFound } from "next/navigation";\nimport Link from "next/link";""")
content = content.replace("""<a href="/" className="inline-block border border-cyan-500""", """<Link href="/" className="inline-block border border-cyan-500""")
content = content.replace("""Return to Grid\n            </a>""", """Return to Grid\n            </Link>""")

content = content.replace("""<a href="/" className="text-xs border border-cyan-800""", """<Link href="/" className="text-xs border border-cyan-800""")
content = content.replace("""Back to Registry\n            </a>""", """Back to Registry\n            </Link>""")

with open('src/app/[client_name]/monitoring/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/admin-dynamic/page.tsx', 'r') as f:
    content = f.read()

content = content.replace("""import { useRouter } from "next/navigation";""", """import { useRouter } from "next/navigation";\nimport Link from "next/link";""")
content = content.replace("""<a href="/" className="text-xs text-cyan-500 border border-cyan-900/50""", """<Link href="/" className="text-xs text-cyan-500 border border-cyan-900/50""")
content = content.replace("""Public view\n              </a>""", """Public view\n              </Link>""")

with open('src/app/admin-dynamic/page.tsx', 'w') as f:
    f.write(content)
