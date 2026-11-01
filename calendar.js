// ---------- calendar: one month view for coaches and students ----------
// Sessions, drill due dates, competitions and personal practice all land on the same grid.
// A student asks for a session, the coach confirms it. Coaches can also book directly.

const KIND_ICON = { session: '🎾', drill: '📝', comp: '🏆', practice: '💪' };
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
let calSel = dayKey(Date.now());
let calPopup = false; // the day sheet that opens when you tap a date
let calAdd = null; // which form the day sheet shows: session or practice
let calOrigin = null; // where the tap happened, so the sheet can grow out of it

function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtClock(ts) {
  return new Date(ts).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' });
}

// ----- events -----

function studentCalEvents() {
  const a = me();
  const out = [];
  Object.values(state.threads).filter((t) => t.student === session && t.coachId).forEach((t) => {
    const c = coachById(t.coachId);
    (t.sessions || []).forEach((s) => out.push({ kind: 'session', ts: s.when, id: s.id, key: t.coachId, title: `Session with ${c ? c.name : 'your coach'}`, sub: s.note || '', status: s.status || 'confirmed', done: s.done, paid: s.paid, price: c ? c.pricePerHour : 0 }));
  });
  (a.inbox || []).filter((i) => i.kind === 'drill' && i.due && !i.done).forEach((i) => out.push({ kind: 'drill', ts: i.due, allDay: true, id: i.id, title: i.title, sub: `Drill from ${i.from}` }));
  compEntries().filter((e) => e.status !== 'played').forEach((e) => out.push({ kind: 'comp', ts: e.date, allDay: true, id: e.key, title: e.name, sub: `Competition · ${COMP_STATUS[e.status].toLowerCase()}` }));
  (a.personal || []).forEach((p) => out.push({ kind: 'practice', ts: p.when, id: p.id, title: p.title, sub: 'My practice' }));
  return out;
}

function coachCalEvents() {
  const out = [];
  coachThreads().forEach((t) => {
    const name = nameOf(t.student);
    (t.sessions || []).forEach((s) => out.push({ kind: 'session', ts: s.when, id: s.id, email: t.student, title: `${name}`, sub: s.note || 'Session', status: s.status || 'confirmed', done: s.done, paid: s.paid }));
    drillsFor(t.student).filter((d) => !d.done && d.due).forEach((d) => out.push({ kind: 'drill', ts: d.due, allDay: true, id: d.id, email: t.student, title: `${name}: ${d.title}`, sub: 'Drill due' }));
    compEntriesOf(t.student).filter((e) => e.status !== 'played').forEach((e) => out.push({ kind: 'comp', ts: e.date, allDay: true, id: e.key, email: t.student, title: `${name}: ${e.name}`, sub: `Competition · ${COMP_STATUS[e.status].toLowerCase()}` }));
  });
  return out;
}

const calEvents = () => (me().role === 'coach' ? coachCalEvents() : studentCalEvents());

// ----- grid -----

function calNav(delta) {
  const d = new Date(calMonth);
  calMonth = new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime();
  render();
}

function calToday() {
  calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  calSel = dayKey(Date.now());
  render();
}

function calPick(key, ev) {
  calSel = key;
  calAdd = null;
  calPopup = true;
  calOrigin = ev ? { x: ev.clientX, y: ev.clientY } : null;
  render();
  const pop = document.querySelector('.pop');
  if (!pop) return;
  if (calOrigin) {
    const r = pop.getBoundingClientRect();
    pop.style.transformOrigin = `${calOrigin.x - r.left}px ${calOrigin.y - r.top}px`;
  }
  pop.classList.add('animate');
}

function calClose() {
  calPopup = false;
  render();
}

function calendarView() {
  const isCoach = me().role === 'coach';
  const events = calEvents();
  const byDay = {};
  events.forEach((e) => (byDay[dayKey(e.ts)] = byDay[dayKey(e.ts)] || []).push(e));

  const first = new Date(calMonth);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const todayKey = dayKey(Date.now());
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cal-cell empty"></span>');
  for (let n = 1; n <= daysInMonth; n++) {
    const key = dayKey(new Date(first.getFullYear(), first.getMonth(), n).getTime());
    const dots = [...new Set((byDay[key] || []).map((e) => e.kind))].slice(0, 4);
    cells.push(`<button class="cal-cell ${key === calSel ? 'sel' : ''} ${key === todayKey ? 'today' : ''}" onclick="calPick('${key}', event)"><b>${n}</b><span class="cal-dots">${dots.map((k) => `<i class="d-${k}"></i>`).join('')}</span></button>`);
  }

  const dayEvents = (byDay[calSel] || []).sort((a, b) => (a.allDay ? 1 : 0) - (b.allDay ? 1 : 0) || a.ts - b.ts);
  const selDate = new Date(calSel + 'T12:00');
  const past = calSel < todayKey;
  const upcoming = events.filter((e) => e.ts >= startOfDay(Date.now())).sort((x, y) => x.ts - y.ts).slice(0, 5);

  return `
    <div class="row between mt3"><button class="link-btn" onclick="calNav(-1)">◀</button>
      <h2 class="h2">${first.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}</h2>
      <span><button class="link-btn" onclick="calToday()">Today</button> <button class="link-btn" onclick="calNav(1)">▶</button></span></div>
    <div class="cal mt2">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => `<span class="cal-h">${d}</span>`).join('')}${cells.join('')}</div>
    <p class="cal-legend muted tiny mt1"><i class="d-session"></i> Session <i class="d-drill"></i> Drill due <i class="d-comp"></i> Competition ${isCoach ? '' : '<i class="d-practice"></i> My practice'}</p>
    <h3 class="h3 mt3">Next up</h3>
    ${upcoming.length ? upcoming.map((e) => eventRow(e, isCoach, true)).join('') : '<p class="muted small mt1">Nothing coming up. Tap a date to add something.</p>'}
    ${calPopup ? daySheet(selDate, dayEvents, past, isCoach) : ''}${isCoach ? '' : payModal()}`;
}

function daySheet(selDate, dayEvents, past, isCoach) {
  return `<div class="pop-backdrop" onclick="if(event.target===this) calClose()">
    <div class="pop" role="dialog" aria-label="${selDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}">
      <div class="row between"><h3 class="h2">${selDate.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}</h3><button class="pop-x" onclick="calClose()" aria-label="Close">✕</button></div>
      ${dayEvents.length ? dayEvents.map((e) => eventRow(e, isCoach)).join('') : '<p class="muted small mt1">Nothing planned this day.</p>'}
      ${past ? '<p class="muted small mt2">This day has passed, so you can\'t add anything to it.</p>' : isCoach ? coachBookForm() : studentCalForms()}
    </div></div>`;
}

function eventRow(e, isCoach, withDate) {
  const pending = e.status === 'requested';
  const when = (withDate ? fmtDay(e.ts) + ' · ' : '') + (e.allDay ? 'All day' : fmtClock(e.ts));
  const pill = pending ? '<span class="pill warn">Requested</span>' : e.kind === 'session' && e.paid ? '<span class="pill ok">Paid</span>' : e.kind === 'session' && e.done ? '<span class="pill ok">✓ Done</span>' : '';
  let actions = '';
  if (e.kind === 'session' && !e.done) {
    if (isCoach) {
      actions = pending
        ? `<button class="link-btn" data-email="${esc(e.email)}" data-id="${e.id}" onclick="confirmSession(this.dataset.email, this.dataset.id)">Confirm</button><button class="link-btn" data-email="${esc(e.email)}" data-id="${e.id}" onclick="declineSession(this.dataset.email, this.dataset.id)">Decline</button>`
        : `<button class="link-btn" data-email="${esc(e.email)}" data-id="${e.id}" onclick="finishSession(this.dataset.email, this.dataset.id)">Done</button><button class="link-btn" data-email="${esc(e.email)}" data-id="${e.id}" onclick="cancelSession(this.dataset.email, this.dataset.id)">Cancel</button>`;
    } else actions = `${!pending && !e.paid ? `<button class="btn" style="width:auto;padding:6px 12px" data-key="${esc(e.key)}" data-id="${e.id}" onclick="openPay(this.dataset.key, this.dataset.id)">Pay $${e.price}</button>` : ''}<button class="link-btn" data-key="${esc(e.key)}" data-id="${e.id}" onclick="cancelMySession(this.dataset.key, this.dataset.id)">Cancel</button>`;
  } else if (e.kind === 'drill' && !isCoach) actions = `<button class="link-btn" onclick="markDrillDone('${e.id}')">Mark done</button>`;
  else if (e.kind === 'practice') actions = `<button class="link-btn" onclick="deletePractice('${e.id}')">Delete</button>`;
  else if (e.kind === 'comp' && !isCoach) actions = `<button class="link-btn" onclick="calPopup=false; compView='mine'; go({tab:'compete'})">Open</button>`;
  else if (isCoach && e.email) actions = `<button class="link-btn" data-email="${esc(e.email)}" onclick="openStudent(this.dataset.email)">Profile</button>`;
  return `<div class="listrow ev-${e.kind}" style="cursor:default"><span class="tile-icon">${KIND_ICON[e.kind]}</span>
    <div class="grow"><div class="h3">${esc(e.title)}</div><div class="muted small">${when}${e.sub ? ' · ' + esc(e.sub) : ''}</div></div>${pill}<span class="ev-actions">${actions}</span></div>`;
}

// ----- clashes -----

function clashes(events, when, ignoreKind) {
  return events.some((e) => e.kind === 'session' && e.status !== 'declined' && !e.done && Math.abs(e.ts - when) < 3600 * 1000 && e.kind !== ignoreKind);
}

function whenFrom(form) {
  return new Date(`${calSel}T${form.time.value || '18:00'}`).getTime();
}

// ----- student: request a session, add practice -----

function calChoose(kind) {
  calAdd = kind;
  render();
}

function studentCalForms() {
  const a = me();
  const coaches = a.confirmed.filter((id) => myThread(id) && myThread(id).answers).map((id) => coachById(id)).filter(Boolean);
  const kind = calAdd || (coaches.length ? 'session' : 'practice');
  const picker = `<span class="lbl small mt3" style="display:block;font-weight:700">What do you want to add?</span>
    <div class="seg mt1"><button class="${kind === 'session' ? 'active' : ''}" onclick="calChoose('session')">🎾 Coach session</button><button class="${kind === 'practice' ? 'active' : ''}" onclick="calChoose('practice')">🏃 My own practice</button></div>`;
  if (kind === 'practice') return `${picker}
    <form class="card form mt2" onsubmit="addPractice(event)"><span class="h3">Add my own practice</span>
      <div class="grid2"><input name="title" class="input" placeholder="e.g. Wall practice" required><input name="time" type="time" value="18:00" class="input" required></div>
      <button class="btn" type="submit">Add to calendar</button></form>`;
  return `${picker}
    <div class="card form mt2"><span class="h3">Request a session</span>
      ${coaches.length ? `<form class="form" onsubmit="requestSession(event)">
        <label class="field"><span class="lbl">Coach</span><select name="coach" class="input">${coaches.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
        <div class="grid2"><label class="field"><span class="lbl">Time</span><input name="time" type="time" value="18:00" class="input" required></label>
          <label class="field"><span class="lbl">Focus</span><input name="note" class="input" placeholder="e.g. Second serve"></label></div>
        <button class="btn" type="submit">Request session</button></form>` : '<p class="muted small">Send a request to a coach first, then you can book sessions here.</p>'}</div>`;
}

function requestSession(e) {
  e.preventDefault();
  const f = e.target;
  const when = whenFrom(f);
  if (when < Date.now()) return toast('Pick a time in the future');
  if (clashes(studentCalEvents(), when)) return toast('You already have a session around that time');
  const coachId = f.coach.value;
  const thread = myThread(coachId);
  const coach = coachById(coachId);
  const id = 's' + Date.now().toString(36);
  const note = f.note.value.trim();
  thread.sessions = thread.sessions || [];
  thread.sessions.push({ id, when, note, done: false, status: 'requested', by: 'student' });
  saveState();
  calPopup = false;
  render();
  if (coach && !coach.isAccount) {
    // Seeded coaches answer on their own after a moment.
    setTimeout(() => {
      const x = (thread.sessions || []).find((y) => y.id === id);
      if (!x || x.status !== 'requested') return;
      x.status = 'confirmed';
      thread.messages.push({ from: 'coach', text: `Confirmed: ${fmtTime(when)}${note ? ' for ' + note.toLowerCase() : ''}. See you on court!`, ts: Date.now() });
      addInbox(session, { kind: 'session', from: coach.name, title: 'Session confirmed', body: `${fmtTime(when)} with ${coach.name}` });
      saveState();
      toast(`${coach.name.split(' ')[0]} confirmed your session`);
      render();
    }, 1500);
    toast('Request sent');
  } else toast('Request sent. Waiting for your coach.');
}

function cancelMySession(coachId, id) {
  const t = myThread(coachId);
  t.sessions = (t.sessions || []).filter((x) => x.id !== id);
  saveState();
  render();
}

function addPractice(e) {
  e.preventDefault();
  const f = e.target;
  const a = me();
  a.personal = a.personal || [];
  a.personal.push({ id: 'p' + Date.now().toString(36), when: whenFrom(f), title: f.title.value.trim() });
  saveState();
  toast('Added');
  calPopup = false;
  render();
}

function deletePractice(id) {
  const a = me();
  a.personal = (a.personal || []).filter((p) => p.id !== id);
  saveState();
  render();
}

// ----- coach: book directly, confirm requests -----

function coachBookForm() {
  const students = coachThreads().filter((t) => studentStatus(t) === 'training');
  if (!students.length) return `<p class="muted small mt3">Accept a student to start booking sessions.</p>`;
  return `<form class="card form mt3" onsubmit="bookFromCalendar(event)"><span class="h3">Book a session</span>
      <label class="field"><span class="lbl">Student</span><select name="student" class="input">${students.map((t) => `<option value="${esc(t.student)}">${esc(nameOf(t.student))}</option>`).join('')}</select></label>
      <div class="grid2"><label class="field"><span class="lbl">Time</span><input name="time" type="time" value="18:00" class="input" required></label>
        <label class="field"><span class="lbl">Focus</span><input name="note" class="input" placeholder="e.g. Serve toss"></label></div>
      <button class="btn" type="submit">Book session</button></form>`;
}

function bookFromCalendar(e) {
  e.preventDefault();
  const f = e.target;
  const when = whenFrom(f);
  if (when < Date.now()) return toast('Pick a time in the future');
  if (clashes(coachCalEvents(), when)) return toast('You already have a session around that time');
  addSession(f.student.value, when, f.note.value.trim());
  toast('Session booked');
  calPopup = false;
  render();
}

// Shared by the calendar and the student profile. The student is told by inbox.
function addSession(email, when, note) {
  const t = coachThread(email);
  t.sessions = t.sessions || [];
  t.sessions.push({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), when, note, done: false, status: 'confirmed', by: 'coach' });
  addInbox(email, { kind: 'session', from: me().coach.name, by: session, title: 'Session booked', body: `${fmtTime(when)}${note ? ' · ' + note : ''}` });
  saveState();
}

function confirmSession(email, id) {
  const x = (coachThread(email).sessions || []).find((y) => y.id === id);
  if (!x) return;
  x.status = 'confirmed';
  addInbox(email, { kind: 'session', from: me().coach.name, by: session, title: 'Session confirmed', body: `${fmtTime(x.when)} with ${me().coach.name}` });
  saveState();
  toast('Session confirmed');
  render();
}

function declineSession(email, id) {
  const t = coachThread(email);
  const x = (t.sessions || []).find((y) => y.id === id);
  if (!x) return;
  t.sessions = t.sessions.filter((y) => y.id !== id);
  addInbox(email, { kind: 'note', from: me().coach.name, title: 'Session request declined', body: `${me().coach.name} can't do ${fmtTime(x.when)}. Try another time in your Calendar.` });
  saveState();
  render();
}
