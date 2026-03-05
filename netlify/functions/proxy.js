exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { asanaToken } = JSON.parse(event.body);
    if (!asanaToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing asanaToken' }) };
    }
    const projRes = await fetch('https://app.asana.com/api/1.0/projects?workspace=644192393389457&opt_fields=name,gid&limit=100', {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const projData = await projRes.json();
    const project = (projData.data || []).find(p => p.name === 'Annual Planning by Owner');
    if (!project) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Project "Annual Planning by Owner" not found in Asana' }) };
    }
    const secRes = await fetch(`https://app.asana.com/api/1.0/projects/${project.gid}/sections?opt_fields=name,gid`, {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const sections = (await secRes.json()).data || [];
    const sectionResults = await Promise.all(sections.map(async sec => {
      const taskRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${sec.gid}/tasks?opt_fields=name,start_on,due_on,completed,assignee.name&limit=100`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } }
      );
      const tasks = ((await taskRes.json()).data || []).map(t => ({
        name:  t.name,
        owner: t.assignee ? t.assignee.name : '—',
        start: t.start_on || '2026-01-01',
        end:   t.due_on   || '2026-12-31',
        done:  t.completed || false,
      }));
      return { name: sec.name, tasks };
    }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: project.name, sections: sectionResults }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
