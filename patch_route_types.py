import re

with open('src/app/api/admin/licenses/route.ts', 'r') as f:
    content = f.read()

# Fix args.push(is_monitoring_enabled ? 1 : 0) type error
search_args = """    const args: string[] = [];"""
replace_args = """    const args: (string | number)[] = [];"""
content = content.replace(search_args, replace_args)

with open('src/app/api/admin/licenses/route.ts', 'w') as f:
    f.write(content)
