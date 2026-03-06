exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { asanaToken } = JSON.parse(event.body);
    if (!asanaToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing asanaToken' }) };
    }

    const PROJECT_GID = '1213203146994140'; // Annual Planning by Owner

    // 1. Fetch sections to get order and names
    const secRes = await fetch(
      `https://app.asana.com/api/1.0/projects/${PROJECT_GID}/sections?opt_fields=name,gid&limit=100`,
      { headers: { 'Authorization': `Bearer ${asanaToken}` } }
    );
    if (!secRes.ok) {
      const txt = await secRes.text();
      return { statusCode: secRes.status, body: JSON.stringify({ error: `Sections fetch failed: ${txt}` }) };
    }
    const sections = (await secRes.json()).data || [];

    // 2. Fetch ALL tasks via project endpoint - most reliable for start_on
    const taskRes = await fetch(
      `https://app.asana.com/api/1.0/tasks?project=${PROJECT_GID}&opt_fields=name,start_on,due_on,completed,assignee.name,memberships.section.gid&limit=100`,
      { headers: { 'Authorization': `Bearer ${asanaToken}` } }
    );
    if (!taskRes.ok) {
      const txt = await taskRes.text();
      return { statusCode: taskRes.status, body: JSON.stringify({ error: `Tasks fetch failed: ${txt}` }) };
    }
    const allTasks = (await taskRes.json()).data || [];

    // 3. Build section GID lookup
    const secNameMap = {};
    sections.forEach(s => { secNameMap[s.gid] = s.name; });

    // 4. Group tasks into sections
    const sectionMap = {};
    sections.forEach(s => { sectionMap[s.gid] = { name: s.name, tasks: [] }; });

    allTasks.forEach(t => {
      const membership = (t.memberships || []).find(m => m.section && secNameMap[m.section.gid]);
      if (!membership) return;
      const secGid = membership.section.gid;
      if (!sectionMap[secGid]) return;
      sectionMap[secGid].tasks.push({
        name:  t.name || '(unnamed)',
        owner: t.assignee ? t.assignee.name : '—',
        start: t.start_on || '2026-01-01',
        end:   t.due_on   || '2026-12-31',
        done:  t.completed === true,
      });
    });

    // 5. Return in section order, skip empty sections
    const sectionResults = sections
      .map(s => sectionMap[s.gid])
      .filter(s => s && s.tasks.length > 0);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Annual Planning by Owner', sections: sectionResults }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
