# WhatsApp OTP Setup Guide

This guide explains how to enable **real-time OTP via WhatsApp** for the Secure Document Portal.

## Prerequisites

- Node.js installed
- Twilio account (free trial works): [Sign up](https://www.twilio.com/try-twilio)

---

## Step 1: Activate WhatsApp Sandbox

1. Go to [Twilio Console → Try WhatsApp](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Click **Confirm** to activate the Sandbox
3. **Join the Sandbox** from your WhatsApp:
   - Open WhatsApp on your phone
   - Send `join <your-sandbox-code>` to **+1 415 523 8886**
   - Example: If your code is `hello-world`, send: `join hello-world`
   - You'll get a confirmation message

> ⚠️ **Important**: Users can only receive WhatsApp OTP if they have joined your Sandbox. For production, you'll need to register a WhatsApp Business number.

---

## Step 2: Get Verification Template Content SID

WhatsApp requires **pre-approved message templates** for business-initiated messages. The Sandbox includes a "Verification Codes" template.

1. Go to [Twilio Content Template Builder](https://console.twilio.com/us1/develop/content/content-templates)
2. Create a new template (or use existing):
   - **Type**: Verification Code
   - **Body**: `Your {{1}} code is {{2}}`
   - Variables: `{{1}}` = App name, `{{2}}` = OTP code
3. After approval, copy the **Content SID** (starts with `HX`)

Alternatively, Twilio provides a default Verification template. Check your Content Templates list for one like "Verification Code" and copy its SID.

---

## Step 3: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```env
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   WHATSAPP_FROM=whatsapp:+6382941712
   WHATSAPP_VERIFICATION_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   COUNTRY_CODE=91
   ```

   - **Account SID** & **Auth Token**: [Twilio Console](https://console.twilio.com)
   - **WHATSAPP_FROM**: Sandbox number `whatsapp:+14155238886`
   - **WHATSAPP_VERIFICATION_CONTENT_SID**: From Step 2
   - **COUNTRY_CODE**: `91` for India, adjust as needed

---

## Step 4: Install & Run

```bash
npm install
npm start
```

Open **http://localhost:3000/user.html** and test the flow:
1. Enter name and mobile (10 digits)
2. Click "Send OTP"
3. Check WhatsApp on your phone for the OTP
4. Enter OTP and verify

---

## Fallback Behavior

- **WhatsApp fails** → Falls back to SMS (if `TWILIO_PHONE` is set)
- **Twilio not configured** → Demo mode: OTP shown on screen
- **Server not running** → Demo mode when opening `user.html` directly

---

## Production Notes

For production WhatsApp OTP:

1. **WhatsApp Business registration**: Request production access via [Twilio WhatsApp](https://www.twilio.com/docs/whatsapp)
2. **Own phone number**: Register your WhatsApp Business number
3. **Template approval**: Submit and get approved your OTP template
4. **Remove demo OTP**: Set `NODE_ENV=production` so `demoOtp` is not returned in API responses
