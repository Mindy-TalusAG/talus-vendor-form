// Talus Vendor Form — Microsoft Graph user directory fetch
// Returns all active TalusAg employees for the manager dropdown.
// Requires three environment variables set in Netlify (Caleb sets these up):
//   AZURE_TENANT_ID     — Directory (tenant) ID from Azure AD app registration
//   AZURE_CLIENT_ID     — Application (client) ID from Azure AD app registration
//   AZURE_CLIENT_SECRET — Client secret value from Azure AD app registration

exports.handler = async (event) => {
  const TENANT_ID     = process.env.AZURE_TENANT_ID;
  const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
  const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

  // If credentials aren't configured yet, return empty list gracefully
  // (form falls back to manual name+email entry)
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: [], configured: false }),
    };
  }

  try {
    // Step 1 — Get an access token using client credentials flow
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'client_credentials',
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          scope:         'https://graph.microsoft.com/.default',
        }),
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token fetch failed:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Authentication failed', detail: err }),
      };
    }

    const { access_token } = await tokenRes.json();

    // Step 2 — Fetch users from Microsoft Graph
    // Only pull displayName, mail, userPrincipalName, jobTitle, accountEnabled
    // Filter out disabled accounts and shared mailboxes
    const usersRes = await fetch(
      'https://graph.microsoft.com/v1.0/users' +
      '?$select=displayName,mail,userPrincipalName,jobTitle,accountEnabled' +
      '&$filter=accountEnabled eq true' +
      '&$top=999' +
      '&$orderby=displayName',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          ConsistencyLevel: 'eventual',
        },
      }
    );

    if (!usersRes.ok) {
      const err = await usersRes.text();
      console.error('Graph users fetch failed:', err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Directory fetch failed', detail: err }),
      };
    }

    const data = await usersRes.json();

    // Clean and return — prefer .mail over .userPrincipalName
    // Filter out service accounts (no real name or external-looking UPNs)
    const users = (data.value || [])
      .map(u => ({
        name:  u.displayName || '',
        email: u.mail || u.userPrincipalName || '',
        title: u.jobTitle || '',
      }))
      .filter(u => u.name && u.email && !u.email.includes('#EXT#'))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, configured: true }),
    };

  } catch (err) {
    console.error('get-users error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
