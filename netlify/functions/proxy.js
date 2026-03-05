exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { asanaToken } = JSON.parse(event.body);
    const secRes = await fetch('https://app.asana.com/api/1.0/projects/1213203146994140/sections?opt_fields=name,gid', {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const sections = (await secRes.json()).data || [];
    const firstSec = sections[0];
    const taskRes = await fetch(
      `https://app.asana.com/api/1.0/sections/${firstSec.gid}/tasks?opt_fields=name,start_on,due_on,completed,assignee.name&limit=5`,
      { headers: { 'Authorization': `Bearer ${asanaToken}` } }
    );
    const tasks = (await taskRes.json()).data || [];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: firstSec.name, tasks: tasks.map(t => ({ name: t.name, start_on: t.start_on, due_on: t.due_on })) }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
