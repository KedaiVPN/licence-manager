with open('src/app/[client_name]/monitoring/ServerMonitor.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'new EventSource(`https://${domain}/monitoring-stream`)',
    'new EventSource(`https://${domain}/api/monitoring/stream`)'
)

with open('src/app/[client_name]/monitoring/ServerMonitor.tsx', 'w') as f:
    f.write(content)
