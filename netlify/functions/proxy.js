exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { asanaToken } = JSON.parse(event.body);
    const projRes = await fetch('https://app.asana.com/api/1.0/projects?opt_fields=name,gid&limit=100', {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const projData = await projRes.json();
    const names = (projData.data || []).map(p => p.name);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: names }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
