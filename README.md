# Dynamic License Manager

A modern, event-driven REST API and dashboard for managing software licenses across VPS nodes. Built with Next.js, Tailwind CSS, and Turso (libSQL).

## Features

- **Cyberpunk UI**: Aesthetic, dark-themed dashboard and admin panel.
- **Event-Driven Architecture**: Automatically sends webhooks to target VPS nodes when licenses are created, updated, or deleted.
- **Fail-safe Syncing**: Records failed webhooks for manual retry and provides a fallback `/api/check` endpoint.
- **Lightweight Database**: Uses Turso (libSQL/SQLite) with automatic table migration.
- **Secure Admin Panel**: Protected by JWT authentication and Next.js middleware using environment variables.

## Prerequisites

- Node.js 18.x or later
- A [Turso](https://turso.tech/) account
- A [Vercel](https://vercel.com/) account (for deployment)

## Setup & Deployment

### 1. Database Setup (Turso)

1. Sign up/log in to [Turso](https://turso.tech/).
2. Install the Turso CLI: \`curl -sSfL https://get.tur.so/install.sh | bash\`
3. Authenticate: \`turso auth login\`
4. Create a database: \`turso db create license-db\`
5. Get the connection URL: \`turso db show license-db --url\`
6. Create an auth token: \`turso db tokens create license-db\`

*(Note: The application will automatically create the required \`licenses\` and \`webhook_logs\` tables upon first connection)*

### 2. Environment Variables

Create a \`.env.local\` file for local development, or set these up in your Vercel project settings:

\`\`\`env
# Turso Database
TURSO_DATABASE_URL=libsql://your-db-url.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Admin Authentication
ADMIN_EMAIL=admin@system.local
ADMIN_PASSWORD=your_secure_password

# Security
JWT_SECRET=generate_a_random_secure_string
CRON_SECRET=your_cron_secret

# Telegram Notifications
BOT_API_KEY=your_telegram_bot_token_here
ADMIN_TELE_ID=your_admin_telegram_user_id
```

### Setup Telegram Webhook

To receive `/start` commands from Telegram users, you must register your Vercel deployment URL with Telegram:

```bash
node scripts/setup-webhook.js <YOUR_BOT_API_KEY> <YOUR_VERCEL_DOMAIN>
\`\`\`

### Setup Hourly Cron Jobs (For Free Vercel Accounts)
Vercel Hobby (Free) only allows 1 cron execution per day. To make expiration notifications work hourly as intended, we have provided a script `cron.js` which can be run using `pm2` on your VPS.

1. Transfer the `cron.js` file to your server.
2. (Optional) If you use `CRON_SECRET` in your Vercel Environment Variables, edit `cron.js` or export the environment variable on your server before starting the script.
3. Run the script using pm2:
   ```bash
   npm install -g pm2
   pm2 start cron.js --name cron
   pm2 save
   ```
This script will ping your Vercel app every hour to trigger the telegram notification logic securely.

### 3. Local Development

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploy to Vercel

1. Push your repository to GitHub.
2. Log in to Vercel and click **Add New > Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add all the variables listed in step 2.
5. Click **Deploy**.

## Webhook Architecture

When a license is manipulated via the Admin Panel, the Vercel API will send a \`POST\` request to the target VPS:

**Target URL:** \`http://<IP_ADDRESS>:5888/callback/licence?auth=<AUTH_KEY>\`

**Payload format:**
\`\`\`json
{
  "action": "update", // or "delete"
  "client_name": "Client Name",
  "expired_date": "YYYY-MM-DD",
  "status": "active" // or "banned"
}
\`\`\`
*Note: On deletion or banning, \`expired_date\` is automatically sent as \`"2000-01-01"\` to instantly block the VPS.*

## Fallback Endpoint

If a VPS misses a webhook (e.g., during restart), it can query its status directly via:

\`GET /api/check?ip=<IP_ADDRESS>\`

This returns the same payload structure as the webhook.
