# Telegram Bot Commands Not Working – Debug Checklist

## Step 1: Verify webhook is set

```powershell
curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
```

**Expected:** `"url": "https://smartendance-api.vercel.app/api/telegram/webhook"`  
**If `"url": ""`** → Run setWebhook again (see TELEGRAM_WEBHOOK_SETUP.md)

---

## Step 2: Check if backend is reachable

Open in browser:

1. **API root:** https://smartendance-api.vercel.app/  
   - Expected: `{"ok":true,"message":"Smartendance API",...}`

2. **Webhook test:** https://smartendance-api.vercel.app/api/telegram/webhook  
   - Expected: `{"ok":true,"message":"Telegram webhook endpoint..."}`

3. **Bot status:** https://smartendance-api.vercel.app/api/telegram/status  
   - Expected: `{"ok":true,"botConfigured":true,"hasToken":true}`  
   - **If `botConfigured: false`** → TELEGRAM_BOT_TOKEN is not set in Vercel

---

## Step 3: Add TELEGRAM_BOT_TOKEN in Vercel (if missing)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **backend** project (the one for smartendance-api)
3. **Settings** → **Environment Variables**
4. Add:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** your bot token (from @BotFather)
   - **Environment:** Production (and Preview if needed)
5. **Redeploy** the project

---

## Step 4: Set webhook (if URL was empty)

```powershell
curl "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://smartendance-api.vercel.app/api/telegram/webhook"
```

Replace `YOUR_TOKEN` with your full bot token. Expected: `{"ok":true,"result":true,...}`

---

## Step 5: Check Vercel logs

1. Vercel Dashboard → Your project → **Logs**
2. Send `/start` to your bot in Telegram
3. Look for: `[Telegram webhook] Received request`
4. If you see it → webhook is reaching your app; check for other errors
5. If you don’t see it → webhook may be wrong or requests aren’t reaching your app

---

## Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `botConfigured: false` | TELEGRAM_BOT_TOKEN not in Vercel | Add env var and redeploy |
| `"url": ""` in getWebhookInfo | Webhook not set | Run setWebhook command |
| 404 on /api/telegram/webhook | Wrong deployment or URL | Confirm backend URL and routes |
| Logs show "Received request" but no reply | MongoDB or handler error | Check full logs for stack trace |
