// ---------- coach workspace: Today, Students, Chat ----------
// Modelled on how coaching and client-management tools work (request -> accept, a plan with due dates,
// scheduled sessions, progress against a goal, and an inbox that tells you who is waiting on you).

const DAY = 864e5;
const STUDENT_STATUSES = { new: 'Requests', training: 'Training', done: 'Ready', paused: 'Paused', declined: 'Declined' };
const QUICK_REPLIES = [
  'Great work this week. Keep it up!',
  'Can you send me a short video of your {skill}?',
  'How did the last drill feel? Anything that was hard?',
  'Let\'s book your next session. What times work for you?',
];

let coachView = 'agenda'; // 'agenda', 'students', 'calendar', 'chat' or 'earnings'
let coachSearch = '';
let coachStudentFilter = 'all';

function coachThreads() {
  const id = coachIdOf(session);
  return Object.values(state.threads).filter((t) => t.coachId === id && t.answers);
}

function coachThread(email) {
  return state.threads[threadKey(email, coachIdOf(session))];
}

function studentStatus(t) {
  return (t.manage && t.manage.status) || 'new';
}

function patchManage(t, patch) {
  t.manage = { ...(t.manage || {}), ...patch };
}

function recordSent(item) {
  const c = me().coach;
  c.sent = c.sent || [];
  c.sent.unshift({ ...item, ts: Date.now() });
}

function lastMessage(t) {
  return t.messages[t.messages.length - 1];
}

function lastActivity(t) {
  const sent = ((me().coach && me().coach.sent) || []).filter((x) => x.student === t.student).map((x) => x.ts);
  return Math.max(t.createdAt || 0, (t.manage && t.manage.acceptedAt) || 0, ...t.messages.map((m) => m.ts || 0), ...sent);
}

function needsReply(t) {
  const last = lastMessage(t);
  return studentStatus(t) !== 'declined' && !!last && last.from === 'student';
}

function isQuiet(t) {
  const at = lastActivity(t);
  return studentStatus(t) === 'training' && at > 0 && Date.now() - at > 7 * DAY;
}

function drillsFor(email) {
  return ((state.accounts[email] && state.accounts[email].inbox) || []).filter((i) => i.kind === 'drill' && i.by === session);
}

function drillState(d) {
  if (d.done) return ['✓ Done', 'ok'];
  if (d.due && d.due < Date.now()) return ['Overdue', 'warn'];
  return [d.due ? 'Due ' + fmtDay(d.due) : 'To do', 'dim'];
}

function fmtDay(ts) {
  return new Date(ts).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function sessionRequests(threads) {
  const out = [];
  threads.forEach((t) => (t.sessions || []).forEach((s) => { if (s.status === 'requested' && s.when > Date.now()) out.push({ ...s, student: t.student }); }));
  return out.sort((a, b) => a.when - b.when);
}

function upcomingSessions(threads) {
  const out = [];
  threads.forEach((t) => (t.sessions || []).forEach((s) => { if (!s.done && s.status !== 'requested' && s.when > Date.now() - 3600 * 1000) out.push({ ...s, student: t.student }); }));
  return out.sort((a, b) => a.when - b.when);
}

// ----- shell -----

function cpanel() {
  const a = me();
  const c = a.coach;
  const threads = coachThreads();
  const head = `<div class="row">${avatar({ id: a.email, name: c.name }, 48)}<div><h2 class="h3">${esc(c.name)}</h2>
      <p class="muted small"><span class="pill ok">✓ Verified</span> ${esc(c.area)} · $${c.price}/hr</p></div></div>`;
  if (state.ui.openStudent) return `${head}${studentDetail(state.ui.openStudent)}`;
  if (state.ui.openChat) return `${head}${coachChat(state.ui.openChat)}`;

  const waiting = threads.filter(needsReply).length;
  const pending = threads.filter((t) => studentStatus(t) === 'new').length;
  const tabs = [['agenda', 'On the agenda', pending + waiting + sessionRequests(threads).length], ['students', `Students (${threads.length})`, 0], ['calendar', 'Calendar', 0], ['chat', 'Chat', waiting], ['earnings', 'Earnings', 0]];
  const body = coachView === 'students' ? coachStudentsSection(threads) : coachView === 'chat' ? coachChatList(threads) : coachView === 'calendar' ? calendarView() : coachView === 'earnings' ? coachEarnings() : coachToday(threads);
  return `${head}
    <div class="seg sticky mt3">${tabs.map(([v, label, n]) => `<button class="${coachView === v ? 'active' : ''}" onclick="setCoachView('${v}')">${label}${n ? `<i class="dot">${n}</i>` : ''}</button>`).join('')}</div>
    ${body}`;
}

function setCoachView(view) {
  coachView = view;
  calPopup = false;
  go({ openStudent: null, openChat: null });
}

function rowOf(t, sub, extra = '') {
  return `<div class="listrow" role="button" tabindex="0" data-email="${esc(t.student)}" onclick="openStudent(this.dataset.email)">${avatar({ id: t.student, name: nameOf(t.student) }, 44)}
    <div class="grow"><div class="h3">${esc(nameOf(t.student))}</div><div class="muted small clip">${esc(sub)}</div></div>${extra}
    <button class="fchip" data-email="${esc(t.student)}" onclick="event.stopPropagation(); openCoachChat(this.dataset.email)" aria-label="Message">💬</button></div>`;
}

// ----- Today: what needs you right now -----

function coachToday(threads) {
  const requests = threads.filter((t) => studentStatus(t) === 'new');
  const waiting = threads.filter(needsReply);
  const quiet = threads.filter(isQuiet);
  const sessions = upcomingSessions(threads).filter((s) => s.when < Date.now() + 7 * DAY);
  const requested = sessionRequests(threads);
  const comps = threads.flatMap((t) => compEntriesOf(t.student).filter((e) => e.status !== 'played' && daysUntil(e.date) >= 0 && daysUntil(e.date) <= 30).map((e) => ({ ...e, student: t.student }))).sort((a, b) => a.date - b.date);
  const openDrills = threads.reduce((n, t) => n + drillsFor(t.student).filter((d) => !d.done).length, 0);
  const stat = (label, n) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`;

  const block = (title, items) => (items.length ? `<h3 class="h3 mt3">${title} <span class="muted small">${items.length}</span></h3>${items.join('')}` : '');
  const requestRows = requests.map((t) => {
    const s = (state.accounts[t.student] || {}).student || {};
    return `<div class="card mt2"><div class="row">${avatar({ id: t.student, name: nameOf(t.student) }, 44)}<div class="grow"><div class="h3">${esc(nameOf(t.student))}</div>
        <div class="muted small">${s.sport ? studentFactsLine(s) : 'New request'}</div></div></div>
      <p class="small mt1">${esc(t.briefing ? t.briefing.text : '')}</p>
      <div class="grid2 mt2"><button class="btn ghost" data-email="${esc(t.student)}" onclick="declineStudent(this.dataset.email)">Decline</button>
        <button class="btn" data-email="${esc(t.student)}" onclick="acceptStudent(this.dataset.email)">Accept</button></div></div>`;
  });
  const waitingRows = waiting.map((t) => rowOf(t, lastMessage(t).text, '<span class="pill">Reply</span>'));
  const quietRows = quiet.map((t) => `<div class="card mt2"><div class="row">${avatar({ id: t.student, name: nameOf(t.student) }, 40)}<div class="grow"><div class="h3">${esc(nameOf(t.student))}</div>
      <div class="muted small">No contact for ${Math.floor((Date.now() - lastActivity(t)) / DAY)} days</div></div>
      <button class="btn ghost" style="width:auto" data-email="${esc(t.student)}" onclick="nudgeStudent(this.dataset.email)">Check in</button></div></div>`);
  const sessionRows = sessions.map((s) => `<button class="listrow" data-email="${esc(s.student)}" onclick="openStudent(this.dataset.email)"><span class="tile-icon">📅</span>
      <div class="grow"><div class="h3">${esc(nameOf(s.student))}</div><div class="muted small">${fmtTime(s.when)}${s.note ? ' · ' + esc(s.note) : ''}</div></div></button>`);

  const sessionReqRows = requested.map((s) => `<div class="card mt2"><div class="row">${avatar({ id: s.student, name: nameOf(s.student) }, 40)}<div class="grow"><div class="h3">${esc(nameOf(s.student))}</div>
      <div class="muted small">${fmtTime(s.when)}${s.note ? ' · ' + esc(s.note) : ''}</div></div></div>
      <div class="grid2 mt2"><button class="btn ghost" data-email="${esc(s.student)}" data-id="${s.id}" onclick="declineSession(this.dataset.email, this.dataset.id)">Decline</button><button class="btn" data-email="${esc(s.student)}" data-id="${s.id}" onclick="confirmSession(this.dataset.email, this.dataset.id)">Confirm</button></div></div>`);
  const compRows = comps.map((e) => `<button class="listrow" data-email="${esc(e.student)}" onclick="openStudent(this.dataset.email)"><span class="tile-icon">🏆</span><div class="grow"><div class="h3">${esc(nameOf(e.student))}: ${esc(e.name)}</div><div class="muted small">${fmtDay(e.date)} · ${countdown(e.date)} · ${COMP_STATUS[e.status].toLowerCase()}</div></div></button>`);
  const todo = requests.length + requested.length + waiting.length + quiet.length;
  const allClear = !todo && !sessions.length && !comps.length;
  return `
    <div class="stats mt3">${stat('Training', threads.filter((t) => studentStatus(t) === 'training').length)}${stat('Need reply', waiting.length)}${stat('Open drills', openDrills)}${stat('Sessions (7d)', sessions.length)}</div>
    <div class="card mt3 agenda-head"><span class="h3">${todo ? `${todo} thing${todo > 1 ? 's' : ''} need${todo > 1 ? '' : 's'} you` : 'You are all caught up ✓'}</span>
      <p class="muted small mt1">${todo ? 'Handle these first, most urgent at the top.' : 'No requests, no replies waiting. New ones will appear here.'}</p></div>
    ${block('New requests', requestRows)}
    ${block('Session requests', sessionReqRows)}
    ${block('Waiting for your reply', waitingRows)}
    ${block('Going quiet', quietRows)}
    ${block('Coming up this week', sessionRows)}
    ${block('Competitions in the next 30 days', compRows)}
    ${allClear ? `<p class="muted small mt3">Tip: open the Calendar to book sessions, or Students to assign drills.</p>` : ''}`;
}

// ----- Students list -----

function coachStudentsSection(threads) {
  if (!threads.length) return `<div class="card mt3"><p class="h3">No students yet.</p><p class="muted mt1">When a student confirms you and sends a request, it shows up here. To try it, log out and sign up as a student with another email.</p></div>`;
  const counts = Object.fromEntries(Object.keys(STUDENT_STATUSES).map((k) => [k, threads.filter((t) => studentStatus(t) === k).length]));
  const filters = [['all', 'All', threads.length], ...Object.entries(STUDENT_STATUSES).filter(([k]) => counts[k]).map(([k, label]) => [k, label, counts[k]])];
  const q = coachSearch.trim().toLowerCase();
  const shown = (coachStudentFilter === 'all' ? threads : threads.filter((t) => studentStatus(t) === coachStudentFilter))
    .filter((t) => !q || nameOf(t.student).toLowerCase().includes(q) || t.student.toLowerCase().includes(q))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
  return `
    <input class="input mt3" type="search" placeholder="Search students" value="${esc(coachSearch)}" oninput="setCoachSearch(this.value)" id="coach-search">
    <div class="filters mt2">${filters.map(([k, label, n]) => `<button class="fchip ${coachStudentFilter === k ? 'active' : ''}" onclick="setCoachFilter('${k}')">${label} ${n}</button>`).join('')}</div>
    ${shown.length ? shown.map((t) => {
      const s = (state.accounts[t.student] || {}).student;
      const st = studentStatus(t);
      const p = s ? progressOf(t, s) : null;
      const open = drillsFor(t.student).filter((d) => !d.done).length;
      const sub = s ? `${levelName(s.level)} → ${Number(s.target).toFixed(1)}${p ? ` · ${p.pct}%` : ''}${open ? ` · ${open} drill${open > 1 ? 's' : ''} open` : ''}` : 'New request';
      return rowOf(t, sub, `${needsReply(t) ? '<span class="pill">Reply</span>' : ''}<span class="pill ${st === 'done' ? 'ok' : st === 'new' ? '' : 'dim'}">${STUDENT_STATUSES[st]}</span>`);
    }).join('') : '<p class="muted mt2">No students in this group.</p>'}`;
}

function setCoachSearch(value) {
  coachSearch = value;
  render();
  const el = $('coach-search');
  if (el) { el.focus(); el.setSelectionRange(value.length, value.length); }
}

function setCoachFilter(filter) {
  coachStudentFilter = filter;
  render();
}

function openStudent(email) {
  go({ openStudent: email, openChat: null });
}

// ----- Student profile: progress, plan, sessions, notes -----

function progressOf(t, s) {
  const m = t.manage || {};
  const start = m.startLevel ?? s.level;
  const span = s.target - start;
  const pct = span <= 0 || s.level >= s.target ? 100 : Math.max(0, Math.min(100, Math.round(((s.level - start) / span) * 100)));
  const t0 = m.acceptedAt || t.createdAt;
  if (!t0 || !s.weeks) return { pct, weeksLeft: null, pace: pct >= 100 ? 'Goal reached' : '' };
  const total = s.weeks * 7 * DAY;
  const elapsed = Date.now() - t0;
  const expected = Math.min(100, Math.round((elapsed / total) * 100));
  return { pct, weeksLeft: Math.max(0, Math.ceil((total - elapsed) / (7 * DAY))), pace: pct >= 100 ? 'Goal reached' : pct >= expected - 10 ? 'On track' : 'Behind pace' };
}

function studentDetail(email) {
  const t = coachThread(email);
  const acc = state.accounts[email];
  const back = `<button class="link-btn mt3" onclick="go({openStudent:null})">← Back</button>`;
  if (!t || !acc || !acc.student) return `${back}<p class="muted mt2">Student not found.</p>`;
  const s = acc.student;
  const st = studentStatus(t);
  const first = nameOf(email).split(' ')[0];
  const p = progressOf(t, s);
  const m = t.manage || {};
  const drills = drillsFor(email);
  const sessions = [...(t.sessions || [])].sort((x, y) => x.when - y.when);

  const request = st === 'new' ? `<div class="card mt2" style="border-color:var(--neon)"><p class="h3">New request</p><p class="muted small mt1">Accept to start coaching ${esc(first)}, or decline politely. Either way they get a message.</p>
      <div class="grid2 mt2"><button class="btn ghost" data-email="${esc(email)}" onclick="declineStudent(this.dataset.email)">Decline</button><button class="btn" data-email="${esc(email)}" onclick="acceptStudent(this.dataset.email)">Accept</button></div></div>` : '';

  const progress = `<div class="card mt2">
      <div class="row between"><span class="h3">Progress</span><span class="pill ${p.pace === 'Behind pace' ? 'warn' : p.pace ? 'ok' : 'dim'}">${p.pace || 'Not started'}</span></div>
      <div class="bar mt2"><i style="width:${p.pct}%"></i></div>
      <p class="muted small mt1">${esc(levelName(s.level))} → ${Number(s.target).toFixed(1)} · ${p.pct}%${p.weeksLeft !== null ? ` · ${p.weeksLeft} week${p.weeksLeft === 1 ? '' : 's'} left of ${timeframeLabel(s.weeks)}` : ''}</p>
      <label class="field mt2"><span class="lbl">Update their level</span>
        <select class="input" data-email="${esc(email)}" onchange="updateLevel(this.dataset.email, this.value)">${LEVELS.map((l) => `<option value="${l.v}" ${l.v === s.level ? 'selected' : ''}>${esc(levelName(l.v))}</option>`).join('')}</select></label>
    </div>`;

  const plan = `<div class="card mt2"><span class="h3">Training plan</span>
      ${drills.length ? drills.map((d) => { const [label, tone] = drillState(d); return `<div class="listrow" style="margin-top:8px;cursor:default"><div class="grow"><div class="h3">${esc(d.title)}</div><div class="muted small">Sent ${fmtDay(d.ts)}</div></div><span class="pill ${tone}">${label}</span></div>`; }).join('') : `<p class="muted small mt1">No drills yet. Assign one and ${esc(first)} can tick it off.</p>`}
      <form class="form mt2" data-email="${esc(email)}" onsubmit="assignDrill(event, this.dataset.email)">
        <div class="grid2"><label class="field"><span class="lbl">Drill</span><select name="skill" class="input">${Object.entries(SKILLS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field"><span class="lbl">Due in</span><select name="days" class="input"><option value="3">3 days</option><option value="7" selected>1 week</option><option value="14">2 weeks</option><option value="0">No date</option></select></label></div>
        <input name="tip" class="input" placeholder="Optional tip for ${esc(first)}">
        <button class="btn ghost" type="submit">Assign drill</button>
      </form></div>`;

  const sess = `<div class="card mt2"><span class="h3">Sessions</span>
      ${sessions.length ? sessions.map((x) => `<div class="listrow" style="margin-top:8px;cursor:default"><div class="grow"><div class="h3">${fmtTime(x.when)}</div><div class="muted small">${esc(x.note || 'Session')}</div></div>
        ${x.done ? '<span class="pill ok">✓ Done</span>' : x.status === 'requested' ? `<span class="pill warn">Requested</span><button class="link-btn" data-email="${esc(email)}" data-id="${x.id}" onclick="confirmSession(this.dataset.email, this.dataset.id)">Confirm</button><button class="link-btn" data-email="${esc(email)}" data-id="${x.id}" onclick="declineSession(this.dataset.email, this.dataset.id)">Decline</button>` : `<button class="link-btn" data-email="${esc(email)}" data-id="${x.id}" onclick="finishSession(this.dataset.email, this.dataset.id)">Done</button><button class="link-btn" data-email="${esc(email)}" data-id="${x.id}" onclick="cancelSession(this.dataset.email, this.dataset.id)">Cancel</button>`}</div>`).join('') : `<p class="muted small mt1">Nothing booked yet.</p>`}
      <form class="form mt2" data-email="${esc(email)}" onsubmit="bookSession(event, this.dataset.email)">
        <div class="grid2"><label class="field"><span class="lbl">When</span><input name="when" type="datetime-local" class="input" required></label>
          <label class="field"><span class="lbl">Focus</span><input name="note" class="input" placeholder="e.g. Serve toss"></label></div>
        <button class="btn ghost" type="submit">Book session</button>
      </form></div>`;

  const notes = `<div class="card mt2"><span class="h3">Private notes</span><p class="muted small mt1">Only you see these.</p>
      <form class="form mt1" data-email="${esc(email)}" onsubmit="saveStudentNotes(event, this.dataset.email)">
        <textarea id="s-notes" class="input" placeholder="Strengths, injuries, what to work on next…">${esc(m.notes || '')}</textarea>
        <button class="btn ghost" type="submit">Save notes</button></form></div>`;

  const statusRow = st === 'new' || st === 'declined' ? '' : `<div class="card mt2"><span class="h3">Status</span><div class="chips mt1">${['training', 'paused', 'done'].map((k) => `<label class="chip"><input type="radio" name="sstatus" data-email="${esc(email)}" onchange="setStudentStatus(this.dataset.email, '${k}')" ${st === k ? 'checked' : ''}><span>${STUDENT_STATUSES[k]}</span></label>`).join('')}</div></div>`;

  return `
    ${back}
    <div class="row between mt1"><h2 class="h2">${esc(nameOf(email))}</h2><button class="btn" style="width:auto" data-email="${esc(email)}" onclick="openCoachChat(this.dataset.email)">💬 Message</button></div>
    <p class="muted small mt1">${studentFactsLine(s)}</p>
    ${request}${st === 'declined' ? '' : progress}${st === 'new' || st === 'declined' ? '' : plan + sess}
    ${compsCard(email)}${clipsCard(email)}
    ${statusRow}${notes}
    <details class="card mt2"><summary class="h3">Their request</summary>${briefingCard(t, '')}${answersList(t.answers)}</details>`;
}

function clipsCard(email) {
  const clips = state.clips.filter((c) => c.owner === email && c.shared);
  return `<div class="card mt2"><span class="h3">Videos</span>${clips.length ? `<div class="clip-grid mt1">${clips.map((c) => clipCard(c, 'feed')).join('')}</div>` : '<p class="muted small mt1">No shared videos yet. Ask them to upload one in chat.</p>'}</div>`;
}

function acceptStudent(email) {
  const t = coachThread(email);
  const s = state.accounts[email].student;
  const first = nameOf(email).split(' ')[0];
  patchManage(t, { status: 'training', acceptedAt: Date.now(), startLevel: s.level });
  t.messages.push({ from: 'coach', text: `Hi ${first}, I've accepted your request. Let's work toward ${Number(s.target).toFixed(1)}. I'll send your first drill soon, and tell me what times work best for you.`, ts: Date.now() });
  addInbox(email, { kind: 'note', from: me().coach.name, title: 'Request accepted', body: `${me().coach.name} accepted you as a student.` });
  saveState();
  toast(`${first} is now a student`);
  render();
}

function declineStudent(email) {
  const t = coachThread(email);
  const first = nameOf(email).split(' ')[0];
  if (!confirm(`Decline ${first}'s request?`)) return;
  patchManage(t, { status: 'declined' });
  t.messages.push({ from: 'coach', text: `Hi ${first}, thanks for reaching out. I'm not able to take new students right now, but I wish you the best. You can choose another coach on LARPLIT.`, ts: Date.now() });
  addInbox(email, { kind: 'note', from: me().coach.name, title: 'Request declined', body: `${me().coach.name} can't take new students right now. Try another coach.` });
  saveState();
  render();
}

function setStudentStatus(email, status) {
  patchManage(coachThread(email), { status });
  saveState();
  render();
}

function updateLevel(email, value) {
  const s = state.accounts[email].student;
  const level = Number(value);
  if (level === s.level) return;
  const t = coachThread(email);
  const up = level > s.level;
  s.level = level;
  const reached = level >= s.target;
  if (reached) patchManage(t, { status: 'done' });
  addInbox(email, { kind: 'note', from: me().coach.name, title: up ? 'You levelled up' : 'Level updated', body: reached ? `You're now ${levelName(level)}. You reached your goal!` : `${me().coach.name} set your level to ${levelName(level)}.` });
  saveState();
  toast(reached ? 'Goal reached 🎉' : 'Level updated');
  render();
}

function assignDrill(e, email) {
  e.preventDefault();
  const f = e.target;
  const skill = f.skill.value;
  const days = Number(f.days.value);
  const tip = f.tip.value.trim();
  addInbox(email, { kind: 'drill', from: me().coach.name, by: session, title: DRILLS[skill].title, body: DRILLS[skill].text + (tip ? ` Tip: ${tip}` : ''), due: Date.now() + (days || 7) * DAY, done: false });
  recordSent({ kind: 'drill', student: email, title: DRILLS[skill].title });
  saveState();
  toast('Drill assigned');
  render();
}

function bookSession(e, email) {
  e.preventDefault();
  const f = e.target;
  const when = new Date(f.when.value).getTime();
  if (!when || when < Date.now()) return toast('Pick a time in the future');
  if (clashes(coachCalEvents(), when)) return toast('You already have a session around that time');
  addSession(email, when, f.note.value.trim());
  toast('Session booked');
  render();
}

function finishSession(email, id) {
  const x = (coachThread(email).sessions || []).find((y) => y.id === id);
  if (x) x.done = true;
  saveState();
  render();
}

function cancelSession(email, id) {
  const t = coachThread(email);
  const x = (t.sessions || []).find((y) => y.id === id);
  if (!x) return;
  t.sessions = t.sessions.filter((y) => y.id !== id);
  addInbox(email, { kind: 'note', from: me().coach.name, title: 'Session cancelled', body: `Your session on ${fmtTime(x.when)} was cancelled.` });
  saveState();
  render();
}

function saveStudentNotes(e, email) {
  e.preventDefault();
  patchManage(coachThread(email), { notes: $('s-notes').value.trim() });
  saveState();
  toast('Notes saved');
}

// ----- Chat -----

function coachChatList(threads) {
  const open = threads.filter((t) => studentStatus(t) !== 'declined').sort((a, b) => lastActivity(b) - lastActivity(a));
  if (!open.length) return `<div class="card mt3"><p class="h3">No conversations yet.</p><p class="muted mt1">Messages from students show up here.</p></div>`;
  return open.map((t) => {
    const last = lastMessage(t);
    return `<button class="listrow" data-email="${esc(t.student)}" onclick="openCoachChat(this.dataset.email)">${avatar({ id: t.student, name: nameOf(t.student) }, 48)}
      <div class="grow"><div class="row between"><div class="h3">${esc(nameOf(t.student))}</div>${last && last.ts ? `<span class="muted tiny">${fmtDay(last.ts)}</span>` : ''}</div>
      <div class="muted small clip">${last ? (last.from === 'coach' ? 'You: ' : '') + esc(last.text) : 'Request received. Say hello.'}</div></div>${needsReply(t) ? '<span class="pill">Reply</span>' : ''}</button>`;
  }).join('');
}

function openCoachChat(email) {
  go({ openChat: email, openStudent: null });
}

function coachChat(email) {
  const t = coachThread(email);
  const back = `<button class="link-btn mt3" onclick="go({openChat:null})">← All chats</button>`;
  if (!t) return `${back}<p class="muted mt2">Chat not found.</p>`;
  const first = nameOf(email).split(' ')[0];
  const skill = t.answers && t.answers.skills && t.answers.skills[0] ? SKILLS[t.answers.skills[0]].toLowerCase() : 'game';
  return `
    ${back}
    <div class="row between mt1"><div class="row">${avatar({ id: email, name: nameOf(email) }, 44)}<h2 class="h3">${esc(nameOf(email))}</h2></div>
      <button class="link-btn" data-email="${esc(email)}" onclick="openStudent(this.dataset.email)">View profile</button></div>
    ${t.briefing ? briefingCard(t, '') : ''}
    ${t.messages.length ? messagesHtml(t, 'coach') : `<p class="muted small mt2">No messages yet. Say hello to ${esc(first)}.</p>`}
    <div class="quick mt2">${QUICK_REPLIES.map((q) => q.replace('{skill}', skill)).map((q) => `<button type="button" class="fchip" data-t="${esc(q)}" onclick="$('coach-input').value=this.dataset.t;$('coach-input').focus()">${esc(q)}</button>`).join('')}</div>
    <form class="chatbar" data-email="${esc(email)}" onsubmit="sendCoachMessage(event, this.dataset.email)">
      <input id="coach-input" class="input" placeholder="Message ${esc(first)}…" autocomplete="off">
      <button class="btn" type="submit">Send</button>
    </form>
    <div data-scroll-end></div>`;
}

function sendChat(email, text) {
  coachThread(email).messages.push({ from: 'coach', text, ts: Date.now() });
  saveState();
  render();
}

function sendCoachMessage(e, email) {
  e.preventDefault();
  const text = $('coach-input').value.trim();
  if (!text) return;
  sendChat(email, text);
  const next = $('coach-input');
  if (next) next.focus();
}

function nudgeStudent(email) {
  const first = nameOf(email).split(' ')[0];
  sendChat(email, `Hi ${first}, haven't heard from you in a while. How is training going? Send me a quick update or a short video.`);
  toast('Check-in sent');
}
