// Talus Vendor Onboarding — Email Sender
// Receives form data + base64 files from the browser, sends via SendGrid with real attachments.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured. Contact your administrator.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { to, cc, reply_to, subject, body: text, attachments = [] } = payload;

  // Parse CC list — comma-separated emails from the form
  const ccList = cc
    ? cc.split(',').map(s => s.trim()).filter(s => s.includes('@'))
    : [];

  // Build SendGrid email payload
  const personalization = { to: [{ email: to }] };
  if (ccList.length) personalization.cc = ccList.map(e => ({ email: e }));

  const emailPayload = {
    personalizations: [personalization],
    from: { email: 'AP@talusag.com', name: 'Talus Vendor Onboarding' },
    reply_to: { email: reply_to || to },
    subject,
    content: [{ type: 'text/plain', value: text }],
  };

  // Add file attachments if present
  if (attachments.length) {
    emailPayload.attachments = attachments.map(a => ({
      content:     a.content,    // base64-encoded file content
      filename:    a.filename,
      type:        a.type || 'application/octet-stream',
      disposition: 'attachment',
    }));
  }

  try {
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    // SendGrid returns 202 Accepted with no body on success
    if (resp.status === 202) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // Any other status means failure — log the body for debugging
    let errorBody = '';
    try { errorBody = await resp.text(); } catch { /* empty */ }
    console.error(`SendGrid error ${resp.status}:`, errorBody);

    return {
      statusCode: resp.status,
      body: JSON.stringify({ error: `Email send failed (${resp.status})` }),
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
