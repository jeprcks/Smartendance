# Telegram Webhook Setup (for bot commands on Vercel)

After deploying to Vercel, you must register the webhook URL with Telegram so commands like `/start`, `/mychatid`, `/history`, and `/help` work.

## 1. Set the webhook

Replace `YOUR_BOT_TOKEN` and `YOUR_DEPLOYED_URL` with your values:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://YOUR_DEPLOYED_URL/api/telegram/webhook"
```

**Example (smartendance-api.vercel.app):**
```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://smartendance-api.vercel.app/api/telegram/webhook"
```

## 2. Optional: Add secret token for security

1. Generate a random secret (e.g. `openssl rand -hex 32`)
2. Add to Vercel env: `TELEGRAM_WEBHOOK_SECRET=your_secret`
3. Set webhook with secret:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://YOUR_DEPLOYED_URL/api/telegram/webhook","secret_token":"your_secret"}'
```

## 3. Verify webhook

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

## 4. Remove webhook (switch back to polling)

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/deleteWebhook"
```

---

**Note:** You cannot use webhook and polling at the same time. With webhook set, the bot receives messages via the webhook endpoint on each deployment.
