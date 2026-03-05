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
      return { statusCode: 500, body: JSON.stringify({ error: 'Asana error', detail: JSON.stringify(secJson) }) };
    }
    const sectionResults = await Promise.all(secJson.data.map(async sec => {
      const taskRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${sec.gid}/tasks?opt_fields=name,start_on,due_on,completed,assignee.name&limit=100`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } }
      );
      const taskJson = await taskRes.json();
      const tasks = (taskJson.data || []).map(t => ({
        name:  clean(t.name),
        owner: t.assignee ? clean(t.assignee.name) : '-',
        start: t.start_on || '2026-01-01',
        end:   t.due_on   || '2026-12-31',
        done:  t.completed || false,
      }));
      return { name: sec.name, tasks };
    }));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Annual Planning by Owner', sections: sectionResults }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function clean(str) {
  if (!str) return '';
  return str
    .replace(/\u2014/g, '--').replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'").replace(/\u201C|\u201D/g, '"')
    .replace(/\u00A0/g, ' ')
    .split('').map(c => c.charCodeAt(0) > 127 ? `&#${c.charCodeAt(0)};` : c).join('');
}
