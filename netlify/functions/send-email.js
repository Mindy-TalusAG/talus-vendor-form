// Talus Vendor Form — Email Sender v3
// Sends HTML-formatted email with attachments via SendGrid.
// Also schedules an automatic 7-day reminder to the same recipients.

const REMINDER_DAYS = 7;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { to, cc, reply_to, subject, htmlBody, textBody, attachments = [], reminderData } = payload;

  const ccList = cc
    ? cc.split(',').map(s => s.trim()).filter(s => s.includes('@'))
    : [];

  // ── SEND MAIN EMAIL ──────────────────────────────────────────
  const mainEmail = buildEmailPayload({
    to, ccList, reply_to, subject,
    htmlBody, textBody,
    attachments,
  });

  let mainSent = false;
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mainEmail),
    });

    if (res.status !== 202) {
      const err = await res.text().catch(() => '');
      console.error(`Main email failed ${res.status}:`, err);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: `Email send failed (${res.status})` }),
      };
    }
    mainSent = true;
  } catch (err) {
    console.error('Main email error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }

  // ── SCHEDULE REMINDER EMAIL ──────────────────────────────────
  // Fires REMINDER_DAYS days after submission to same recipients.
  // SendGrid scheduled send requires Unix timestamp; max 72h on free plans.
  // On paid plans (Essentials+) there is no cap.
  // We attempt it — if it fails (e.g. free plan), main email already sent so we don't fail the whole request.
  if (reminderData && mainSent) {
    try {
      const sendAtUnix = Math.floor(Date.now() / 1000) + (REMINDER_DAYS * 24 * 60 * 60);

      const { vendorName, vendorOwnerName, vendorOwnerEmail, submissionDate } = reminderData;

      const reminderSubject = `Reminder: Vendor Setup In Progress — ${vendorName}`;

      const reminderHtml = buildReminderHtml({ vendorName, vendorOwnerName, submissionDate });
      const reminderText = buildReminderText({ vendorName, vendorOwnerName, submissionDate });

      const reminderEmail = buildEmailPayload({
        to,
        ccList,
        reply_to: vendorOwnerEmail || reply_to,
        subject: reminderSubject,
        htmlBody: reminderHtml,
        textBody: reminderText,
        attachments: [],
        sendAt: sendAtUnix,
      });

      const reminderRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reminderEmail),
      });

      if (reminderRes.status !== 202) {
        const err = await reminderRes.text().catch(() => '');
        console.warn(`Reminder scheduling failed ${reminderRes.status}:`, err);
        // Non-fatal — main email already sent
      }
    } catch (err) {
      console.warn('Reminder scheduling error (non-fatal):', err.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};

// ── HELPERS ──────────────────────────────────────────────────

function buildEmailPayload({ to, ccList, reply_to, subject, htmlBody, textBody, attachments, sendAt }) {
  const personalization = { to: [{ email: to }] };
  if (ccList && ccList.length) personalization.cc = ccList.map(e => ({ email: e }));

  const payload = {
    personalizations: [personalization],
    from: { email: 'AP@talusag.com', name: 'TalusAg Vendor Onboarding' },
    reply_to: { email: reply_to || to },
    subject,
    content: [
      { type: 'text/plain', value: textBody || '' },
      { type: 'text/html',  value: htmlBody || '' },
    ],
  };

  if (attachments && attachments.length) {
    payload.attachments = attachments.map(a => ({
      content:     a.content,
      filename:    a.filename,
      type:        a.type || 'application/octet-stream',
      disposition: 'attachment',
    }));
  }

  if (sendAt) {
    payload.send_at = sendAt;
    payload.batch_id = undefined; // not using batch cancellation
  }

  return payload;
}

function buildReminderHtml({ vendorName, vendorOwnerName, submissionDate }) {
  const ownerFirst = vendorOwnerName ? vendorOwnerName.split(' ')[0] : 'Team';
  return `
<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6;max-width:620px;margin:0 auto;padding:24px 16px;">
<p style="margin:0 0 16px;">Hi AP team,</p>
<p style="margin:0 0 16px;">This is an automated check-in. A vendor onboarding request was submitted <strong>${REMINDER_DAYS} days ago</strong> and may still need follow-up.</p>

<div style="background:#fff9e6;border-left:3px solid #f0c040;padding:12px 16px;margin:0 0 20px;border-radius:0 6px 6px 0;">
  <strong>Vendor:</strong> ${esc(vendorName)}<br/>
  <strong>Submitted by:</strong> ${esc(vendorOwnerName)}<br/>
  <strong>Submission date:</strong> ${esc(submissionDate)}
</div>

<p style="margin:0 0 12px;"><strong>What to check:</strong></p>
<ul style="margin:0 0 20px;padding-left:20px;">
  <li style="margin-bottom:6px;">Has Joanna reached out to the vendor's finance contact?</li>
  <li style="margin-bottom:6px;">Has the vendor completed Ramp's banking setup link?</li>
  <li style="margin-bottom:6px;">Are any outstanding documents still needed?</li>
</ul>

<p style="margin:0 0 16px;"><strong>${esc(ownerFirst)}</strong> — as the vendor owner, if you haven't already, now is a good time to follow up directly with your vendor contact and confirm they've received and acted on both the AP setup email and the Ramp banking link. Vendor responsiveness is the biggest driver of timeline.</p>

<p style="margin:0 0 4px;color:#909090;font-size:12px;">This reminder was automatically scheduled at the time of the original submission. If this vendor is already set up, no action is needed.</p>
</body></html>`;
}

function buildReminderText({ vendorName, vendorOwnerName, submissionDate }) {
  const ownerFirst = vendorOwnerName ? vendorOwnerName.split(' ')[0] : 'Team';
  return `Hi AP team,

This is an automated check-in. A vendor onboarding request was submitted ${REMINDER_DAYS} days ago and may still need follow-up.

Vendor: ${vendorName}
Submitted by: ${vendorOwnerName}
Submission date: ${submissionDate}

WHAT TO CHECK:
- Has Joanna reached out to the vendor's finance contact?
- Has the vendor completed Ramp's banking setup link?
- Are any outstanding documents still needed?

${ownerFirst} — as the vendor owner, if you haven't already, now is a good time to follow up directly with your vendor contact and confirm they've received and acted on both the AP setup email and the Ramp banking link.

---
This reminder was automatically scheduled at the time of the original submission. If this vendor is already set up, no action is needed.`;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
