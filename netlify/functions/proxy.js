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
    const sections = (await secRes.json()).data || [];
    const sectionResults = await Promise.all(sections.map(async sec => {
      const taskRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${sec.gid}/tasks?opt_fields=name,start_on,due_on,completed,assignee.name&limit=100`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } }
      );
      const tasks = ((await taskRes.json()).data || []).map(t => ({
        name:  sanitize(t.name),
        owner: t.assignee ? sanitize(t.assignee.name) : '-',
        start: t.start_on || '2026-01-01',
        end:   t.due_on   || '2026-12-31',
        done:  t.completed || false,
      }));
      return { name: sanitize(sec.name), tasks };
    }));
    const payload = JSON.stringify({ 
      projectName: 'Annual Planning by Owner', 
      sections: sectionResults 
    });
    const safe = Buffer.from(payload, 'utf8').toString('utf8');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: safe,
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function sanitize(str) {
  if (!str) return '';
  return str
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/[^\x00-\x7F]/g, '');
}
