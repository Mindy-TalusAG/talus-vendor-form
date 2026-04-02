# Talus Vendor Onboarding Form — Deployment Guide
**Total time: ~40 minutes | No DNS changes. No IT ticket. No technical background needed.**

---

## What changed from the first guide
The previous guide used EmailJS, which doesn't support true file attachments on the free tier. This version uses **SendGrid** — a free email service that sends real, clickable attachments. When MaryJo uploads a W-9 or a contract and hits Submit, Joanna receives it as an actual attachment she can open directly from the email.

**What you need:**
- [ ] The `vendor-form` folder (attached — contains 4 files, already structured correctly)
- [ ] A web browser
- [ ] Access to the AP@talusag.com inbox to click one verification link

---

## Phase 1 — Set up SendGrid (15 min)
*SendGrid is the service that sends the email with attachments. Free tier: 100 emails/day — well above your volume.*

### Step 1 — Create your account
1. Go to **https://sendgrid.com**
2. Click **Start For Free**
3. Sign up with your Talus email address
4. Verify your email when the confirmation arrives
5. Complete their brief onboarding questions (you can skip most of them)

### Step 2 — Verify your sender email (no DNS needed)
This is how SendGrid confirms you're allowed to send from AP@talusag.com. It's just a link click — no IT, no DNS records.

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Name:** Talus Vendor Onboarding
   - **From Email:** AP@talusag.com
   - **Reply To:** AP@talusag.com
   - **Company Name:** Talus Renewables
   - Fill in address fields (use the Talus office address)
4. Click **Create**
5. SendGrid will send a verification email to AP@talusag.com
6. Open that inbox, find the email from SendGrid, and click the verification link
7. Done — AP@talusag.com is now authorized to send via SendGrid

### Step 3 — Get your API key
1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `Talus Vendor Form`
4. Choose **Restricted Access**
5. Under **Mail Send**, set to **Full Access**
6. Click **Create & View**
7. **Copy the key immediately** — SendGrid only shows it once. It looks like: `SG.xxxxxxxxxxxxxxxxxxx`

> Paste it somewhere safe (a note app is fine) — you'll use it in Phase 3.

---

## Phase 2 — Deploy to Netlify (10 min)

### Step 1 — Create a Netlify account
1. Go to **https://www.netlify.com**
2. Click **Sign Up** → use your Talus email

### Step 2 — Deploy the folder
1. Once logged in, you'll see a **Sites** dashboard
2. Look for: *"Import from Git"* or *"Deploy manually"*. You want **Deploy manually**.
3. You'll see a drag-and-drop zone. **Drag the entire `vendor-form` folder** (not a file, the whole folder) into that zone and drop it.
4. Wait about 15–20 seconds while it builds and deploys.

> If the drag-and-drop doesn't accept a folder: right-click the `vendor-form` folder → **Compress** (Mac) or **Send to → Compressed zip** (Windows) → drag the `.zip` file instead.

### Step 3 — Get your URL
1. Netlify assigns a URL automatically, like `https://amazing-panda-abc123.netlify.app`
2. To make it cleaner: go to **Site Configuration** → **Site details** → **Change site name** → type `talus-vendor` → Save
3. Your URL becomes: `https://talus-vendor.netlify.app`
4. Keep this URL — you'll share it with your team and optionally embed it in SharePoint

---

## Phase 3 — Add your API key to Netlify (5 min)
*This is how the form connects to SendGrid securely. Your API key stays on Netlify's servers — it's never visible in the form itself.*

1. In Netlify, go to your site → **Site Configuration** → **Environment Variables**
2. Click **Add a variable**
3. Enter exactly:
   - **Key:** `SENDGRID_API_KEY`
   - **Value:** paste your SendGrid API key (the `SG.xxx...` you copied earlier)
4. Click **Save**
5. Go to **Deploys** → click **Trigger deploy** → **Deploy site** (this restarts the site with the new variable active)

---

## Phase 4 — Test (10 min)
Before sharing with anyone, run a complete test yourself.

- [ ] Open your Netlify URL
- [ ] Fill out all 6 steps with test data
- [ ] Upload at least one test file (any PDF or image)
- [ ] Submit
- [ ] Check AP@talusag.com — email should arrive within 60 seconds
- [ ] Confirm the attached file opens when you click it
- [ ] Confirm all CC recipients received a copy
- [ ] Confirm the email body has the correct formatted data

**If the email doesn't arrive:**
1. Check spam/junk folder
2. In SendGrid → **Activity** → check for any error on the send attempt
3. Confirm the API key in Netlify environment variables is correct (no extra spaces)
4. Confirm the Single Sender verification for AP@talusag.com shows as **Verified** (green) in SendGrid

**File size note:** The form warns you if total uploads exceed 15 MB. Keep combined attachments under 20 MB. For typical vendor docs (W-9, contract, W-8BEN-E) this is never an issue — those files are usually under 1 MB each.

---

## Phase 5 — Share with your team

**Option A — Direct link**
Share `https://talus-vendor.netlify.app` in Teams or email. Suggested message:

> New process for vendor setup: before submitting any new vendor to AP, complete this form first → https://talus-vendor.netlify.app
> Takes about 5 minutes and gives Joanna everything she needs to start the process. Questions? Reach out to me.

**Option B — Embed in SharePoint**
1. Go to the SharePoint page where you want it to live
2. Edit the page (pencil icon, top right)
3. Click **+** to add a web part → search **Embed**
4. Paste this into the Embed web part (replace the URL with yours):
```
<iframe src="https://talus-vendor.netlify.app" width="100%" height="900" frameborder="0" style="border:none;"></iframe>
```
5. Save and publish

---

## Ongoing maintenance

| Situation | What to do |
|-----------|-----------|
| Need to update something in the form | Edit `vendor-form/public/index.html` → re-deploy to Netlify (drag folder again) |
| SendGrid free tier hits 100/day limit | Upgrade to Essentials ($19.95/mo) — unlikely at Talus's volume |
| Netlify URL changes | Update the SharePoint embed and re-share the link |
| Need to change the AP email address | Edit the `from` line in `netlify/functions/send-email.js` → re-deploy |
| AP@talusag.com email changes | Repeat the Single Sender Verification process in SendGrid for the new address |

---

## Quick reference — keep this handy

| Item | Your value |
|------|-----------|
| SendGrid API key | (from Phase 1 Step 3 — starts with SG.) |
| Netlify site URL | |
| Netlify site name | |

---

*Stuck? Bring it back to the Claude chat — I have full context and can troubleshoot any step.*
