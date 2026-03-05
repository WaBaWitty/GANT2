exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { asanaToken } = JSON.parse(event.body);
    const wsRes = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const wsData = await wsRes.json();
    const ws = (wsData.data || []).find(w => w.name.includes('waba') || w.name.includes('Waba'));
    if (!ws) return { statusCode: 200, body: JSON.stringify({ workspaces: wsData.data }) };
    
    const projRes = await fetch(`https://app.asana.com/api/1.0/projects?workspace=${ws.gid}&opt_fields=name,gid&limit=100`, {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const projData = await projRes.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ workspace: ws.name, projects: (projData.data||[]).map(p=>p.name) }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
