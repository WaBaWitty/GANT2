exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { asanaToken } = JSON.parse(event.body);
    const secRes = await fetch('https://app.asana.com/api/1.0/projects/1213203146994140/sections?opt_fields=name,gid', {
      headers: { 'Authorization': `Bearer ${asanaToken}` }
    });
    const secJson = await secRes.json();
    const sections = secJson.data || [];

    const debug = await Promise.all(sections.map(async sec => {
      const taskRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${sec.gid}/tasks?opt_fields=name,start_on,due_on,completed,assignee.name&limit=100`,
        { headers: { 'Authorization': `Bearer ${asanaToken}` } }
      );
      const taskJson = await taskRes.json();
      return { 
        section: sec.name, 
        taskCount: (taskJson.data || []).length,
        firstTask: (taskJson.data || [])[0]?.name || 'none'
      };
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionCount: sections.length, debug }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
