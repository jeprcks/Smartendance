# Telegram Notifications – Implementation Suggestions

Suggestions to improve the Smartendance Telegram bot and notification system.

---

## Priority: High

### 1. Send attendance alerts to parents (not just admin)

**Current:** Only `TELEGRAM_ADMIN_CHAT_ID` receives attendance notifications.

**Suggestion:** When a student checks in/out, also send the alert to the parent's `telegramChatId` (from student record).

- **Benefit:** Parents get real-time attendance updates.
- **Implementation:** In `sendAttendanceNotification`, look up the student's parent Chat ID and call `sendMessage` to both admin and parent.

---

### 2. Inline buttons for quick actions

**Current:** Users must type commands.

**Suggestion:** Add InlineKeyboardMarkup for common actions:

- `/start` → Buttons: [Get Chat ID] [View History] [Help]
- `/history` → Buttons: [Today] [This Week] [Refresh]

- **Implementation:** Use `reply_markup` with `InlineKeyboardButton` in `sendMessage`.

---

### 3. Daily/weekly summary command

**New command:** `/summary` or `/today`

**Suggestion:** Show a compact summary of today's attendance:

- Check-in time
- Check-out time (or “Still in school”)
- Total duration
- Status (Present/Late/etc.)

---

### 4. Scheduled daily digest (e.g. end-of-day)

**Suggestion:** Send parents an automatic end-of-day message (e.g. 5:00 PM):

- “Your child [Name] was at school today from X to Y. Total: Zh Ym.”

**Implementation:** Requires a cron/scheduler (e.g. Vercel Cron, external cron service) that calls an API to trigger the digest.

---

## Priority: Medium

### 5. Language preference (Filipino/English)

**Suggestion:** Let parents set language via `/language` or stored preference.

- Store `preferredLanguage` when linking Chat ID to student.
- Localize all bot messages.

---

### 6. Opt-in/opt-out for notifications

**Suggestion:** `/notifications on` and `/notifications off` to toggle alerts per parent.

- Store `notificationsEnabled` in student/parent record.
- Skip sending if disabled.

---

### 7. Consecutive alerts to parents

**Current:** Consecutive alerts (late, absent, cutting) go only to admin.

**Suggestion:** Also send to the parent’s Chat ID when severity is high (e.g. critical).

---

### 8. School announcements via bot

**New command (admin only):** `/announce [message]` or via admin panel.

**Suggestion:** Admins can broadcast announcements to all parents with Telegram Chat IDs.

- **Security:** Verify admin Chat ID before accepting announcements.

---

### 9. Rich student info

**Current:** `/studentinfo` shows basic info.

**Suggestion:** Add:

- Emergency contact
- Photo (if available)
- Last attendance date
- Schedule (grade/section times)

---

### 10. Date range for `/history`

**Current:** Fixed to last 15 records.

**Suggestion:** Support `/history 7` (last 7 days) or `/history 2025-02-01 2025-02-15`.

---

## Priority: Low

### 11. Reply keyboards

**Suggestion:** Use `ReplyKeyboardMarkup` for common commands (e.g. [Start] [History] [Help]) so users can tap instead of typing.

---

### 12. QR code for Chat ID

**Suggestion:** When a parent uses `/mychatid`, optionally send a small QR code that encodes the Chat ID for easy admin entry.

---

### 13. Typing indicator

**Suggestion:** Use `sendChatAction(chatId, 'typing')` before heavy commands (e.g. `/history`) so users know the bot is working.

---

### 14. Rate limiting per user

**Suggestion:** Limit commands per Chat ID (e.g. max 20/hour) to avoid abuse or accidental spam.

---

### 15. Analytics / logging

**Suggestion:** Log command usage (command, chatId, timestamp) for analytics and debugging.

---

## Implementation Checklist Template

| # | Suggestion                      | Effort | Impact |
|---|---------------------------------|--------|--------|
| 1 | Parent attendance alerts        | Medium | High   |
| 2 | Inline buttons                  | Low    | Medium |
| 3 | Daily summary command           | Low    | Medium |
| 4 | Scheduled daily digest          | High   | High   |
| 5 | Language preference             | Medium | Medium |
| 6 | Opt-in/opt-out                  | Low    | Medium |
| 7 | Consecutive alerts to parents   | Low    | High   |
| 8 | School announcements            | Medium | High   |
| 9 | Rich student info               | Low    | Low    |
|10 | Date range for history          | Low    | Medium |

---

*Choose items based on user feedback and school priorities.*
