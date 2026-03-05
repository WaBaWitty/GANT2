exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { asanaToken } = JSON.parse(event.body);
    if (!asanaToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing asanaToken' }) };
    }
    const secRes = await fetch('https://app.asana.com/api/1.0/projects/1213203146994140/sections?opt_fields=name,gid', {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const secJson = await secRes.json();
    if (!secJson.data) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Asana sections error', detail: JSON.stringify(secJson) }) };
    }
    const sections = secJson.data;
    const sectionResults = await Promise.all(sections.map(async sec => {
      const taskRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${sec.gid}/tasks?opt_fields=name,start_on,due_on,completed,assignee.name&limit=100`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } }
      );
      const taskJson = await taskRes.json();
      const tasks = (taskJson.data || []).map(t => ({
        name:  (t.name || '').replace(/[\u0080-\uFFFF]/g, c => `&#${c.charCodeAt(0)};`),
        owner: t.assignee ? (t.assignee.name || '').replace(/[\u0080-\uFFFF]/g, c => `&#${c.charCodeAt(0)};`) : '-',
        start: t.start_on || '2026-01-01',
        end:   t.due_on   || '2026-12-31',
        done:  t.completed || false,
      }));
      return { name: sec.name, tasks };
    }));
    const body = JSON.stringify({ projectName: 'Annual Planning by Owner', sections: sectionResults });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: Buffer.from(body).toString('latin1'),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
