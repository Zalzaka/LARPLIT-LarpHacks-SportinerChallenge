// ---------- competitions manager (students) ----------
// Fictional local events. Dates are offsets from today so the list always looks current.

const COMP_DEFS = [
  { id: 'k1', name: 'Lakeshore Spring Open', sport: 'tennis', area: 'Toronto', in: 21, deadline: 10, min: 2, max: 3.5, fee: 45, format: 'Singles, round robin', blurb: 'Friendly round robin for beginners and improvers.' },
  { id: 'k2', name: 'GTA Club Ladder Finals', sport: 'tennis', area: 'Mississauga', in: 35, deadline: 21, min: 3, max: 4.5, fee: 60, format: 'Singles, knockout', blurb: 'Knockout finals for the season ladder.' },
  { id: 'k3', name: 'Markham Doubles Day', sport: 'tennis', area: 'Markham', in: 14, deadline: 7, min: 2.5, max: 4.5, fee: 30, format: 'Doubles, mixed levels', blurb: 'One-day social doubles. Great first event.' },
  { id: 'k4', name: 'Oakville Summer Cup', sport: 'tennis', area: 'Oakville', in: 63, deadline: 42, min: 3.5, max: 5, fee: 80, format: 'Singles, knockout', blurb: 'Competitive weekend with prize money.' },
  { id: 'k5', name: 'Brampton Beginner Bash', sport: 'tennis', area: 'Brampton', in: 10, deadline: 5, min: 1, max: 2.5, fee: 20, format: 'Singles, short sets', blurb: 'Short matches and lots of encouragement.' },
  { id: 'k6', name: 'Kitchen Classic', sport: 'pickleball', area: 'Toronto', in: 18, deadline: 8, min: 2, max: 3.5, fee: 35, format: 'Doubles, round robin', blurb: 'Round robin, meet new partners every round.' },
  { id: 'k7', name: 'Vaughan Pickleball Open', sport: 'pickleball', area: 'Vaughan', in: 42, deadline: 28, min: 3, max: 4.5, fee: 55, format: 'Doubles, bracket', blurb: 'Brackets by level. Medals for each bracket.' },
  { id: 'k8', name: 'Third Shot Throwdown', sport: 'pickleball', area: 'Richmond Hill', in: 28, deadline: 14, min: 3.5, max: 5, fee: 65, format: 'Doubles, double elimination', blurb: 'Fast, competitive doubles for strong players.' },
  { id: 'k9', name: 'Rookie Rally', sport: 'pickleball', area: 'Mississauga', in: 12, deadline: 6, min: 1, max: 2.5, fee: 15, format: 'Doubles, social', blurb: 'Learn the format and play with friendly people.' },
  { id: 'k10', name: 'Autumn Club Challenge', sport: 'tennis', area: 'Richmond Hill', in: 84, deadline: 60, min: 2, max: 4, fee: 50, format: 'Singles, group stage', blurb: 'Group stage then playoffs. Good test before the season ends.' },
];

const COMP_STATUS = { saved: 'Saved', registered: 'Registered', played: 'Played' };
let compView = 'find'; // 'find' or 'mine'

function startOfDay(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

COMP_DEFS.push(...UTR_DEFS);

function compById(id) {
  const d = COMP_DEFS.find((x) => x.id === id);
  if (!d) return null;
  if (d.real) {
    const [y, m, day] = d.dateIso.split('-').map(Number);
    const date = new Date(y, m - 1, day).getTime();
    return { ...d, date, deadlineTs: date };
  }
  return { ...d, date: startOfDay(Date.now()) + d.in * DAY, deadlineTs: startOfDay(Date.now()) + d.deadline * DAY };
}

// Events in the Greater Toronto Area first, then everything else, each group by date.
const byNearThenDate = (a, b) => AREAS.includes(b.area) - AREAS.includes(a.area) || a.date - b.date;

const feeLabel =(d) => d.feeText || '$' + d.fee;

// One list entry per competition a person has saved, registered for or played, with name and date filled in.
function compEntriesOf(email) {
  const s = state.accounts[email] && state.accounts[email].student;
  return ((s && s.comps) || []).map((e) => {
    const def = e.id ? compById(e.id) : null;
    return { ...e, key: e.id || e.cid, name: def ? def.name : e.name, date: def ? def.date : e.date, area: def ? def.area : e.area || '', fee: def ? def.fee : null, format: def ? def.format : e.format || '' };
  });
}

const compEntries = () => compEntriesOf(session);

function compEntry(key) {
  return ((stu().comps) || []).find((e) => (e.id || e.cid) === key);
}

function daysUntil(ts) {
  return Math.round((startOfDay(ts) - startOfDay(Date.now())) / DAY);
}

function countdown(ts) {
  const n = daysUntil(ts);
  return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n > 0 ? `In ${n} days` : `${-n} day${n === -1 ? '' : 's'} ago`;
}

function levelFit(def, level) {
  if (level > def.max) return ['Too easy', 'dim'];
  if (level < def.min) return ['Too hard', 'warn'];
  return ['Good fit', 'ok'];
}

function competeTab() {
  const mine = compEntries();
  const seg = `<div class="seg mt3"><button class="${compView === 'find' ? 'active' : ''}" onclick="setCompView('find')">Find events</button>
    <button class="${compView === 'mine' ? 'active' : ''}" onclick="setCompView('mine')">My events (${mine.filter((e) => e.status !== 'played').length})</button></div>`;
  return `<h2 class="h2">Competitions</h2><p class="muted mt1">Pick events that fit your level, register, prepare with your coach and track how you did.</p>${fastestEventBanner()}${seg}${compView === 'mine' ? myCompetitions() : findCompetitions()}${signupModal()}`;
}

function setCompView(v) {
  compView = v;
  render();
}

function findCompetitions() {
  const s = stu();
  const today = startOfDay(Date.now());
  const list = COMP_DEFS.filter((d) => d.sport === s.sport).map((d) => compById(d.id)).filter((d) => d.deadlineTs >= today || compEntry(d.id)).sort(byNearThenDate);
  return `
    ${list.map((d) => {
      const [fit, tone] = levelFit(d, s.level);
      const mineEntry = compEntry(d.id);
      const near = AREAS.includes(d.area);
      const km = near ? areaKm(s.location, d.area) : null;
      return `<article class="card mt2">
        <div class="row between"><h3 class="h3">${esc(d.name)}</h3><span class="pill ${tone}">${fit}</span></div>
        <p class="muted small mt1">${fmtDay(d.date)}${d.time ? ' ' + d.time : ''} (${countdown(d.date).toLowerCase()}) · ${esc(d.area)}${km ? ' · ' + km + ' km' : ''} · ${esc(feeLabel(d))}</p>
        <p class="small mt1">${esc(d.format)}. ${esc(d.blurb)}</p>
        <p class="muted tiny mt1">${d.real ? `UTR ${d.uMin.toFixed(1)} to ${d.uMax.toFixed(1)} (level ${d.min.toFixed(1)} to ${d.max.toFixed(1)})` : `Level ${d.min.toFixed(1)} to ${d.max.toFixed(1)}`} · register by ${fmtDay(d.deadlineTs)}${d.real ? ` · <a href="${esc(d.url)}" target="_blank" rel="noopener">View on UTR</a>` : ''}</p>
        ${mineEntry
          ? `<div class="row between mt2"><span class="pill ok">${COMP_STATUS[mineEntry.status]}</span><button class="link-btn" onclick="setCompView('mine')">Manage</button></div>`
          : `<div class="grid2 mt2"><button class="btn ghost" onclick="addComp('${d.id}','saved')">Save</button><button class="btn" onclick="openSignup('${d.id}')">Sign up</button></div>`}
      </article>`;
    }).join('') || '<p class="muted mt2">No events for your sport yet.</p>'}`;
}

function myCompetitions() {
  const list = compEntries().sort((a, b) => a.date - b.date);
  if (!list.length) return `<div class="card mt3"><p class="h3">No events yet.</p><p class="muted mt1">Save an event in Find events and it shows up here and in your Calendar.</p><button class="btn mt2" onclick="setCompView('find')">Find events</button></div>`;
  return list.map((e) => {
    const past = daysUntil(e.date) < 0;
    const raw = compEntry(e.key) || {};
    const coach = raw.coachNotified ? coachById(raw.coachNotified) : null;
    const prep = e.status === 'registered' && !past
      ? `<div class="brief"><div class="label">Your coach</div>${coach
          ? `<p class="mt1">✓ ${esc(coach.name)} was told automatically in Chat. ${raw.prep ? `They built your prep plan: ${raw.prep.drills} drills with due dates, in your Calendar.` : 'Their reply and prep plan will show up here and in Chat.'}</p><button class="btn ghost mt2" onclick="openTab('chat')">Open chat</button>`
          : `<p class="mt1">No coach has been told yet. Confirm a coach and send a request, then re-register to share this event.</p><button class="btn ghost mt2" onclick="openTab('coaches')">Find a coach</button>`}</div>` : '';
    return `<article class="card mt2">
      <div class="row between"><h3 class="h3">${esc(e.name)}</h3><span class="pill ${e.status === 'played' ? 'ok' : 'dim'}">${COMP_STATUS[e.status]}</span></div>
      <p class="muted small mt1">${fmtDay(e.date)} · ${countdown(e.date)}${e.area ? ' · ' + esc(e.area) : ''}</p>
      <div class="chips mt2">${Object.entries(COMP_STATUS).map(([k, label]) => `<label class="chip"><input type="radio" name="cs-${e.key}" onchange="setCompStatus('${e.key}','${k}')" ${e.status === k ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div>
      ${raw.signup ? `<p class="small mt2">✓ You signed up on ${fmtDay(raw.signup.at)} as ${esc(raw.signup.fullName)} (${esc(raw.signup.phone)}).</p>` : ''}
      ${prep}
      ${e.status === 'played' || past ? `<form class="form mt2" onsubmit="saveCompResult(event,'${e.key}')">
        <input name="result" class="input" placeholder="Result (e.g. Won 2 of 3 matches)" value="${esc(e.result || '')}">
        <textarea name="notes" class="input" placeholder="What went well? What to work on?">${esc(e.notes || '')}</textarea>
        <button class="btn ghost" type="submit">Save result</button></form>` : ''}
      <button class="link-btn mt2" onclick="removeComp('${e.key}')">Remove</button>
    </article>`;
  }).join('');
}

// The coach the student talks to most recently (and who has not declined them). Competition news goes to this chat.
function primaryCoachId() {
  const a = me();
  const live = a.confirmed.filter((id) => {
    const t = myThread(id);
    return t && t.answers && !(t.manage && t.manage.status === 'declined');
  });
  const stamp = (id) => Math.max(0, ...myThread(id).messages.map((m) => m.ts || 0));
  return live.sort((x, y) => stamp(y) - stamp(x))[0] || null;
}

// Posts an automatic message in the coach chat and, for the built-in coaches, triggers their reply.
function tellCoach(text) {
  const coachId = primaryCoachId();
  if (!coachId) return null;
  myThread(coachId).messages.push({ from: 'student', text, ts: Date.now(), auto: true });
  saveState();
  const coach = coachById(coachId);
  if (coach && !coach.isAccount) triggerCoachReply(coachId, false, text);
  return coachId;
}

function compRegisteredText(e) {
  const n = daysUntil(e.date);
  return `I just registered for ${e.name} on ${fmtDay(e.date)}${e.area ? ' in ' + e.area : ''}${e.fee ? ' ($' + e.fee + ')' : ''}. It's ${n <= 0 ? 'today' : n === 1 ? 'tomorrow' : n + ' days away'}. Can we plan my training around it?`;
}

// Called whenever an entry becomes "registered": tells the coach once.
function announceRegistration(key) {
  const entry = compEntry(key);
  if (!entry || entry.coachNotified) return;
  const full = compEntries().find((x) => x.key === key);
  const coachId = tellCoach(compRegisteredText(full));
  if (coachId) {
    entry.coachNotified = coachId;
    saveState();
    toast(`Sign-up sent. ${(coachById(coachId) || { name: 'Your coach' }).name.split(' ')[0]} was notified in Chat.`);
  } else toast('Sign-up saved. Pick a coach and send a request so they can be notified.');
}

// ----- sign up: collect details, save them with the event, tell the coach and confirm to the student -----

function openSignup(id) {
  go({ signup: { id } });
}

function signupModal() {
  const p = state.ui.signup;
  const d = p && compById(p.id);
  if (!d) return '';
  const s = stu();
  const f = (name, label, attrs = '') => `<label class="field mt2"><span class="lbl">${label}</span><input name="${name}" class="input" ${attrs}></label>`;
  return `<div class="backdrop" onclick="if(event.target===this) go({signup:null})">
    <form class="modal" role="dialog" aria-label="Sign up for ${esc(d.name)}" onsubmit="submitSignup(event,'${d.id}')" style="max-height:90vh;overflow:auto">
      <div class="row between"><h3 class="h2">Sign up</h3><button type="button" class="pop-x" onclick="go({signup:null})" aria-label="Close">✕</button></div>
      <p class="small mt1"><b>${esc(d.name)}</b></p>
      <p class="muted small">${fmtDay(d.date)}${d.time ? ' ' + d.time : ''} · ${esc(d.area)} · ${esc(feeLabel(d))}</p>
      ${f('fullName', 'Full name', `required value="${esc(nameOf(session))}"`)}
      ${f('email', 'Email', `type="email" required value="${esc(session)}"`)}
      ${f('phone', 'Phone', 'type="tel" required placeholder="e.g. 416 555 0123"')}
      ${f('dob', 'Date of birth', 'type="date" required')}
      ${f('level', 'Your level or UTR', `required value="${Number(s.level).toFixed(1)}"`)}
      ${f('emergency', 'Emergency contact (name and phone)', 'required')}
      <label class="field mt2"><span class="lbl">Notes for the organiser (optional)</span><textarea name="notes" class="input" placeholder="Partner name, injuries, anything they should know"></textarea></label>
      <label class="row mt2" style="gap:8px;align-items:flex-start"><input type="checkbox" name="agree" required> <span class="small">I agree to the event rules and fee (${esc(feeLabel(d))}).</span></label>
      <p class="tiny mt1" style="color:var(--warn)">Demo: your details are saved in LARPLIT and your coach is notified.${d.real ? ` To be entered in the real event, finish on <a href="${esc(d.url)}" target="_blank" rel="noopener">UTR</a>.` : ''}</p>
      <button class="btn mt2" type="submit">Send sign-up</button>
    </form></div>`;
}

function submitSignup(e, id) {
  e.preventDefault();
  const details = Object.fromEntries(new FormData(e.target).entries());
  delete details.agree;
  go({ signup: null });
  addComp(id, 'registered', details);
}

function addComp(id, status, signup) {
  const s = stu();
  s.comps = s.comps || [];
  const existing = s.comps.find((e) => e.id === id);
  if (!existing) s.comps.push({ id, status, ...(signup ? { signup: { ...signup, at: Date.now() } } : {}) });
  else if (signup) Object.assign(existing, { status, signup: { ...signup, at: Date.now() } });
  saveState();
  if (status === 'registered') {
    announceRegistration(id);
  } else toast('Saved to My events');
  render();
}

function setCompStatus(key, status) {
  compEntry(key).status = status;
  saveState();
  if (status === 'registered') announceRegistration(key);
  render();
}

function saveCompResult(e, key) {
  e.preventDefault();
  const entry = compEntry(key);
  entry.result = e.target.result.value.trim();
  entry.notes = e.target.notes.value.trim();
  entry.status = 'played';
  saveState();
  const full = compEntries().find((x) => x.key === key);
  const told = tellCoach(`I played ${full.name}${entry.result ? ': ' + entry.result : ''}.${entry.notes ? ' ' + entry.notes : ''} Can we go over how it went?`);
  toast(told ? 'Result saved and sent to your coach' : 'Result saved');
  render();
}

function removeComp(key) {
  const s = stu();
  s.comps = s.comps.filter((e) => (e.id || e.cid) !== key);
  saveState();
  render();
}

// ----- coach view of a student's events -----

function compsCard(email) {
  const list = compEntriesOf(email).sort((a, b) => a.date - b.date);
  return `<div class="card mt2"><span class="h3">Competitions</span>
    ${list.length ? list.map((e) => `<div class="listrow" style="margin-top:8px;cursor:default"><div class="grow"><div class="h3">${esc(e.name)}</div>
      <div class="muted small">${fmtDay(e.date)} · ${countdown(e.date)}${e.result ? ' · ' + esc(e.result) : ''}${e.notes ? ' · ' + esc(e.notes) : ''}</div></div>
      ${e.status === 'registered' && daysUntil(e.date) >= 0 ? (e.prep ? '<span class="pill ok">Plan sent</span>' : `<button class="btn" style="width:auto;padding:8px 12px" data-email="${esc(email)}" data-key="${esc(e.key)}" onclick="buildPrepPlan(this.dataset.email, this.dataset.key)">Build prep plan</button>`) : `<span class="pill ${e.status === 'played' ? 'ok' : 'dim'}">${COMP_STATUS[e.status]}</span>`}</div>`).join('') : '<p class="muted small mt1">No events yet. Suggest one in chat.</p>'}</div>`;
}

// A prep plan is a few drills spread over the weeks before the event, plus a message in chat.
function buildPrepPlan(email, key) {
  const t = coachThread(email);
  const acc = state.accounts[email];
  const entry = (acc.student.comps || []).find((x) => (x.id || x.cid) === key);
  const full = compEntriesOf(email).find((x) => x.key === key);
  if (!entry || !full) return;
  const days = daysUntil(full.date);
  const picks = [...new Set([...(t.answers.skills || []), 'return', 'footwork'])].slice(0, 3);
  const offsets = days > 21 ? [21, 14, 7] : days > 7 ? [Math.round(days * 0.7), Math.round(days * 0.4), 2] : [Math.max(1, days - 1)];
  const made = picks.slice(0, offsets.length).map((skill, i) => {
    addInbox(email, { kind: 'drill', from: me().coach.name, by: session, title: `${DRILLS[skill].title} (prep for ${full.name})`, body: DRILLS[skill].text, due: full.date - offsets[i] * DAY, done: false, comp: key });
    recordSent({ kind: 'drill', student: email, title: DRILLS[skill].title });
    return SKILLS[skill].toLowerCase();
  });
  entry.prep = { by: session, at: Date.now(), drills: made.length };
  t.messages.push({ from: 'coach', text: `I've built a prep plan for ${full.name}: ${made.join(', ')} drills spaced out before ${fmtDay(full.date)}. They're in your Calendar. Let's book a session the week before to sharpen it.`, ts: Date.now() });
  saveState();
  toast('Prep plan sent');
  render();
}
