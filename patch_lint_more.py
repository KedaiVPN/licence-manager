import re

with open('src/app/[client_name]/monitoring/ServerMonitor.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    """const CustomTooltip = ({ active, payload, label }: any) => {""",
    """const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {"""
)
content = content.replace(
    """{payload.map((entry: any, index: number) => (""",
    """{payload.map((entry: { color: string, name: string, value: number }, index: number) => ("""
)

with open('src/app/[client_name]/monitoring/ServerMonitor.tsx', 'w') as f:
    f.write(content)

with open('src/app/page.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    """  let nodes: any[] = [];""",
    """  let nodes: Record<string, unknown>[] = [];"""
)
content = content.replace(
    """nodes.map((node, i) => {""",
    """nodes.map((node: any, i) => {"""
)

with open('src/app/page.tsx', 'w') as f:
    f.write(content)

with open('src/app/login/page.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    """import { Lock, User, AlertCircle, Shield, ChevronRight } from "lucide-react";""",
    """import { Lock, User, AlertCircle, Shield, ChevronRight } from "lucide-react";\nimport Link from "next/link";"""
)
content = content.replace(
    """<a href="/" className="text-cyan-600 hover:text-cyan-400 text-xs uppercase tracking-widest border-b border-cyan-900/50 hover:border-cyan-500 pb-1 transition-colors">""",
    """<Link href="/" className="text-cyan-600 hover:text-cyan-400 text-xs uppercase tracking-widest border-b border-cyan-900/50 hover:border-cyan-500 pb-1 transition-colors">"""
)
content = content.replace(
    """Return to Public View\n            </a>""",
    """Return to Public View\n            </Link>"""
)

with open('src/app/login/page.tsx', 'w') as f:
    f.write(content)
