let typingFor = null; // thread key whose coach reply is in flight
let certFile = null; // uploaded certificate, kept in memory only
let toastTimer = null;
let pendingRole = null; // role picked on the first sign-in screen, before the email is entered
let showClipForm = false;
const fileUrls = {}; // clip id -> object URL for an uploaded video file

const $ = (id) => document.getElementById(id);

function go(patch) {
  Object.assign(state.ui, patch);
  saveState();
  render();
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
}

function showError(id, message) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

// ---------- shared pieces ----------

function opts(list, selected) {
  return list.map((v) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join('');
}

function chipList(name, entries, selected = []) {
  return entries
    .map(([value, label]) => `<label class="chip"><input type="checkbox" name="${name}" value="${esc(value)}" ${selected.includes(value) ? 'checked' : ''}><span>${esc(label)}</span></label>`)
    .join('');
}

function checkedValues(form, name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
}

function avatar(person, size = 64, extra = '') {
  const hue = [...String(person.id)].reduce((sum, ch) => sum + ch.charCodeAt(0) * 37, 0) % 360;
  const initials = person.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const photo = COACH_PHOTOS[person.id];
  if (photo) return `<div class="avatar ${extra}" role="img" aria-label="${esc(person.name)}" style="width:${size}px;height:${size}px;background:url('${photo}') center / cover"></div>`;
  return `<div class="avatar ${extra}" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 3)}px;background:linear-gradient(135deg,hsl(${hue} 70% 45%),hsl(${(hue + 50) % 360} 70% 32%))">${esc(initials)}</div>`;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ---------- accounts, coaches and threads ----------

function stu() {
  const a = me();
  if (!a || a.role !== 'student') return {};
  a.student = a.student || {};
  return a.student;
}

const coachIdOf = (email) => 'acct:' + email;
const threadKey = (studentEmail, coachId) => studentEmail + '::' + coachId;
const myThread = (coachId) => state.threads[threadKey(session, coachId)];

function listingOf(account) {
  const c = account.coach;
  return { id: coachIdOf(account.email), name: c.name, sports: c.sports, languages: c.languages, area: c.area, pricePerHour: c.price, rating: null, specialties: c.specialties, avail: c.avail, fastTrack: !!c.fastTrack, bio: c.bio, persona: '', isAccount: true };
}

function allCoaches() {
  const registered = Object.values(state.accounts)
    .filter((a) => a.role === 'coach' && a.coach && a.coach.status === 'verified')
    .map(listingOf);
  return [...COACHES, ...registered];
}

function coachById(id) {
  return allCoaches().find((c) => c.id === id);
}

function sportLabel(coach) {
  return coach.sports.map((s) => SPORTS[s]).join(' & ');
}

function addInbox(email, item) {
  const a = state.accounts[email];
  if (!a) return;
  a.inbox = a.inbox || [];
  a.inbox.unshift({ id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), read: false, ...item });
}

// ---------- shell: header, tabs, routing ----------

function goBrand() {
  if (me()) go({ screen: 'home' });
}

function logOut() {
  writeSession(null);
  pendingRole = null;
  go({ screen: 'auth', tab: 'coaches', openThread: null, openStudent: null, openChat: null, preview: null, contact: null });
}

function renderShell() {
  const a = me();
  $('header-right').innerHTML = a ? `<span class="muted tiny who">${esc(a.email)}</span><button class="link-btn" onclick="logOut()">Log out</button>` : '';

  const tabs = $('tabs');
  if (a && a.role === 'student' && state.ui.screen === 'home') {
    tabs.classList.remove('hidden');
    tabs.innerHTML = [['coaches', '🧭', 'Coaches'], ['chat', '💬', 'Chat'], ['calendar', '📅', 'Calendar'], ['compete', '🏆', 'Compete'], ['videos', '🎬', 'Videos'], ['settings', '⚙️', 'Settings']]
      .map(([id, icon, label]) => `<button class="tab ${state.ui.tab === id ? 'active' : ''}" onclick="openTab('${id}')"><span class="ti">${icon}</span><span>${label}</span></button>`)
      .join('');
  } else {
    tabs.classList.add('hidden');
    tabs.innerHTML = '';
  }
}

// A signed-in person only ever sees the screens of their own role, and nothing past an unfinished step.
function enforceFlow() {
  const ui = state.ui;
  const a = me();
  if (!a) {
    ui.screen = 'auth';
    return;
  }
  if (a.role === 'student') {
    const s = a.student || {};
    const done = WIZARD.every((st) => s[st.key] !== undefined);
    ui.screen = !done ? 'wizard' : !s.onboarded ? 'ready' : 'home';
  } else if (a.role === 'coach') {
    const c = a.coach;
    if (!c) ui.screen = 'cprofile';
    else if (c.status === 'verified') {
      seedDemoCoach(a);
      ui.screen = ui.screen === 'cverify' ? 'cverify' : 'cpanel';
    }
    else if (c.status === 'draft') ui.screen = ui.screen === 'cprofile' ? 'cprofile' : 'ccert';
    else ui.screen = ui.screen === 'ccert' ? 'ccert' : 'cverify';
  } else {
    writeSession(null);
    ui.screen = 'auth';
  }
}

function render() {
  enforceFlow();
  renderShell();
  const views = { auth, wizard, ready, home, cprofile, ccert, cverify, cpanel };
  $('app').innerHTML = (views[state.ui.screen] || auth)();

  const box = document.querySelector('[data-scroll-end]');
  if (box) box.scrollIntoView({ block: 'end' });
}

// ---------- intro: role first, then email ----------

const ROLE_NAMES = { student: 'Student', coach: 'Coach' };

function auth() {
  return pendingRole ? emailScreen() : roleScreen();
}

function roleScreen() {
  return `
    <h1 class="h1 wz-title">Welcome to <span class="neon">LARPLIT</span></h1>
    <p class="muted mt1 wz-sub">Larp your way into tennis or pickleball. Get matched with a coach, prepare, and compete as fast as you can.</p>
    <p class="muted small mt3" style="text-align:center">Who are you?</p>
    <div class="tiles">
      <button class="tile" onclick="chooseRole('student')"><span class="tile-icon">🎓</span><span class="tile-text"><span class="tile-label">Student</span><span class="tile-desc">Find a coach and train</span></span></button>
      <button class="tile" onclick="chooseRole('coach')"><span class="tile-icon">🧑‍🏫</span><span class="tile-text"><span class="tile-label">Coach</span><span class="tile-desc">Get verified and meet students</span></span></button>
    </div>`;
}

function emailScreen() {
  return `
    <div class="wz-top">
      <button class="wz-back" onclick="backToRole()" aria-label="Back">←</button>
    </div>
    <h1 class="h1 wz-title">Sign up or log in</h1>
    <p class="muted mt1 wz-sub">Signing in as a ${ROLE_NAMES[pendingRole].toLowerCase()}. Enter your email to continue.</p>
    <form class="form mt4" onsubmit="submitEmail(event)">
      <label class="field"><span class="lbl">Email</span><input id="auth-email" type="email" class="input big" placeholder="you@example.com" autocomplete="email" required></label>
      <p id="auth-error" class="error hidden"></p>
      <button class="btn" type="submit">Continue</button>
      <p class="muted tiny" style="text-align:center">Demo only: no password is needed, and your data stays in this browser.</p>
    </form>`;
}

function chooseRole(role) {
  pendingRole = role;
  go({ screen: 'auth' });
}

function backToRole() {
  pendingRole = null;
  go({ screen: 'auth' });
}

function submitEmail(e) {
  e.preventDefault();
  const email = $('auth-email').value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('auth-error', 'Enter a valid email address.');
  const existing = state.accounts[email];
  if (existing) {
    if (existing.role !== pendingRole) return showError('auth-error', `${email} is registered as a ${ROLE_NAMES[existing.role].toLowerCase()}. Go back and choose that role.`);
    writeSession(email);
    pendingRole = null;
    toast('Welcome back');
    go({ screen: 'home', tab: 'coaches', openThread: null, openStudent: null });
  } else {
    state.accounts[email] = { email, role: pendingRole, student: null, coach: null, confirmed: [], inbox: [] };
    writeSession(email);
    pendingRole = null;
    go({ screen: 'home', tab: 'coaches', openThread: null, openStudent: null });
  }
}

// ---------- student onboarding: one full-screen question at a time ----------

const SKILL_ICONS = { serve: '🚀', forehand: '💥', backhand: '🔁', volley: '🧱', smash: '⚡', return: '🛡️', footwork: '👟' };
const LANG_ICONS = { English: '🇨🇦', French: '🇫🇷', Spanish: '🇪🇸', Mandarin: '🇨🇳', Hindi: '🇮🇳', Russian: '🇷🇺' };

// Each entry is one screen. options() returns [value, icon, label, description?]. type 'text' is a typed answer.
const WIZARD = [
  { key: 'sport', short: 'Sport', title: 'What do you want to play?', sub: 'You can change this later in Settings.', options: () => [['tennis', '🎾', 'Tennis'], ['pickleball', '🏓', 'Pickleball']] },
  { key: 'level', short: 'Your level', title: "What's your current level?", layout: 'list', options: () => LEVELS.map((l) => [l.v, levelIcon(l.v), levelName(l.v), l.desc]) },
  {
    key: 'target', short: 'Target level', title: 'Which level do you want to reach?', layout: 'list',
    options: () => {
      const current = stu().level ?? 1;
      if (current >= 5) return [[5, '💪', 'I want to continue developing my skills', 'Keep sharpening your game at the top level.']];
      const higher = LEVELS.filter((l) => l.v > current);
      return (higher.length ? higher : [LEVELS[LEVELS.length - 1]]).map((l) => [l.v, levelIcon(l.v), levelName(l.v), l.desc]);
    },
  },
  { key: 'weeks', short: 'Reach it within', title: 'By when do you want to get there?', options: () => TIMEFRAMES.map(([w, icon, label]) => [w, icon, `Within ${label}`]) },
  {
    key: 'location', short: 'Your location', type: 'text', title: 'Where are you located?', sub: 'Enter a city or postal code in the Greater Toronto Area.', placeholder: 'e.g. Toronto, or M5V 2T6',
    parse: (text) => resolveArea(text), error: "We couldn't find that place. Try a Greater Toronto Area city or postal code.",
  },
  { key: 'distance', short: 'Distance from you', title: 'How far will you travel?', options: () => DISTANCES.map((d) => [d, '📍', `Within ${d} km`]) },
  { key: 'language', short: 'Coach language', title: 'Which language should your coach speak?', options: () => LANGUAGES.map((l) => [l, LANG_ICONS[l], l]) },
  { key: 'maxPrice', short: 'Budget per hour', title: "What's your budget per hour?", options: () => [[50, '💵', 'Up to $50'], [65, '💵', 'Up to $65'], [80, '💰', 'Up to $80'], [999, '💎', 'Any price']] },
  { key: 'avail', short: 'Availability', title: 'When can you train?', options: () => [['weekdays', '🌅', 'Weekdays'], ['evenings', '🌙', 'Evenings'], ['weekends', '🏖️', 'Weekends'], ['Any', '🕒', 'Any time']] },
  { key: 'skill', short: 'Focus skill', title: 'What do you want to work on most?', options: () => [...Object.entries(SKILLS).map(([k, v]) => [k, SKILL_ICONS[k], v]), ['Any', '🤷', 'Not sure yet']] },
];

function currentStep() {
  const s = stu();
  return WIZARD.findIndex((st) => s[st.key] === undefined);
}

function optionLabel(key, value) {
  const step = WIZARD.find((st) => st.key === key);
  if (step.type === 'text') return `📍 ${value}`;
  const hit = step.options().find(([v]) => v === value);
  return hit ? `${hit[1]} ${hit[2]}` : String(value);
}

function wizard() {
  const i = currentStep();
  const st = WIZARD[i];
  const pct = Math.round(((i + 1) / (WIZARD.length + 1)) * 100);
  const top = `
    <div class="wz-top">
      <button class="wz-back" onclick="wizardBack()" aria-label="Back">←</button>
      <div class="wz-bar"><i style="width:${pct}%"></i></div>
      <span class="muted small">${i + 1}/${WIZARD.length}</span>
    </div>
    <h1 class="h1 wz-title">${esc(st.title)}</h1>
    ${st.sub ? `<p class="muted mt1 wz-sub">${esc(st.sub)}</p>` : ''}`;

  if (st.type === 'text') {
    return `${top}
      <form class="form mt4" onsubmit="answerText(event, '${st.key}')">
        <input id="wz-text" class="input big" placeholder="${esc(st.placeholder)}" autocomplete="off" required>
        <p id="wz-error" class="error hidden"></p>
        <button class="btn" type="submit">Continue</button>
      </form>`;
  }

  return `${top}
    <div class="tiles ${st.layout === 'list' ? 'list' : ''}">
      ${st.options()
        .map(([v, icon, label, desc]) => `<button class="tile" onclick="answerStep('${st.key}', ${esc(JSON.stringify(v))}, this)">
          <span class="tile-icon">${icon}</span><span class="tile-text"><span class="tile-label">${esc(label)}</span>${desc ? `<span class="tile-desc">${esc(desc)}</span>` : ''}</span></button>`)
        .join('')}
    </div>`;
}

function answerStep(key, value, el) {
  if (el) el.classList.add('picked');
  setTimeout(() => {
    stu()[key] = value;
    go({});
  }, 160);
}

function answerText(e, key) {
  e.preventDefault();
  const st = WIZARD.find((x) => x.key === key);
  const value = st.parse($('wz-text').value);
  if (value === null) return showError('wz-error', st.error);
  stu()[key] = value;
  go({});
}

function wizardBack() {
  const i = currentStep();
  if (i <= 0) return logOut();
  delete stu()[WIZARD[i - 1].key];
  go({});
}

function ready() {
  const s = stu();
  return `
    <div class="wz-top">
      <button class="wz-back" onclick="readyBack()" aria-label="Back">←</button>
      <div class="wz-bar"><i style="width:100%"></i></div>
      <span class="muted small">Done</span>
    </div>
    <div style="font-size:56px;text-align:center" class="mt3">✅</div>
    <h1 class="h1 mt2" style="text-align:center">You're ready to start.</h1>
    <p class="muted mt1" style="text-align:center">We'll show coaches that fit you. You can change any of this later in Settings.</p>
    <div class="chips mt3" style="justify-content:center;gap:8px">
      ${WIZARD.map((st) => `<span class="tag">${esc(optionLabel(st.key, s[st.key]))}</span>`).join('')}
    </div>
    <button class="btn mt4" onclick="startApp()">Start using LARPLIT</button>`;
}

function readyBack() {
  delete stu()[WIZARD[WIZARD.length - 1].key];
  go({});
}

function startApp() {
  stu().onboarded = true;
  go({ screen: 'home', tab: 'coaches', preview: null });
}

function openTab(id) {
  calPopup = false;
  go({ tab: id, preview: null, openThread: null });
}

// ---------- student home ----------

function home() {
  const tab = state.ui.tab;
  if (tab === 'chat') return chatTab();
  if (tab === 'calendar') return `<h2 class="h2">Calendar</h2><p class="muted mt1">Your sessions, drill deadlines and competitions in one place.</p>${calendarView()}`;
  if (tab === 'compete') return competeTab();
  if (tab === 'videos') return videosTab();
  if (tab === 'settings') return settingsTab();
  return orbitView();
}

// ----- coaches -----

// Hard filters: sport, language, budget and distance. Availability and skill are preferences:
// coaches that match them (and can deliver in your timeframe) glow, so the board is never empty by accident.
function isStrongMatch(c) {
  const s = stu();
  return (s.avail === 'Any' || c.avail.includes(s.avail)) && (s.skill === 'Any' || c.specialties.includes(s.skill)) && (s.weeks > 4 || c.fastTrack);
}

function kmAway(c) {
  return areaKm(stu().location, c.area);
}

const MIN_COACHES = 5;
const FEATURED_COACHES = ['t6', 't8']; // Marc Tremblay, Carlos Mendez
let exactMatchCount = 0;

// Coaches that fit every filter come first. If fewer than MIN_COACHES fit, the board is topped up with the closest
// ones (fewest filters missed; a different sport counts most), so a student never faces an empty screen.
function filteredCoaches() {
  const s = stu();
  const misses = (c) => (c.sports.includes(s.sport) ? 0 : 100) + (c.languages.includes(s.language) ? 0 : 10) + (c.pricePerHour <= s.maxPrice ? 0 : 5 + (c.pricePerHour - s.maxPrice) / 100) + Math.max(0, kmAway(c) - s.distance) / 100;
  const ranked = allCoaches().map((c) => ({ c, m: misses(c) })).sort((a, b) => a.m - b.m || (b.c.rating || 0) - (a.c.rating || 0));
  const exact = ranked.filter((x) => x.m === 0).map((x) => x.c).sort((a, b) => Number(isStrongMatch(b)) - Number(isStrongMatch(a)));
  exactMatchCount = exact.length;
  const list = exact.length >= MIN_COACHES ? exact : [...exact, ...ranked.filter((x) => x.m > 0).slice(0, MIN_COACHES - exact.length).map((x) => x.c)];
  // Marc Tremblay or Carlos Mendez is always on the board, whatever the filters: add the nearer one if neither is there.
  if (!list.some((c) => FEATURED_COACHES.includes(c.id))) {
    const featured = ranked.filter((x) => FEATURED_COACHES.includes(x.c.id)).sort((a, b) => kmAway(a.c) - kmAway(b.c))[0];
    if (featured) list.splice(Math.min(2, list.length), 0, featured.c);
  }
  return list;
}

function orbitView() {
  const s = stu();
  const list = filteredCoaches();
  const bubbles = list
    .map((c, i) => {
      const ring = i % 2;
      const angle = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      const left = 50 + Math.cos(angle) * (ring ? 0.37 : 0.3) * 100;
      const top = 50 + Math.sin(angle) * (ring ? 0.43 : 0.34) * 100;
      const dur = 5 + (i % 4);
      const delay = -(i * 0.9);
      const dx = (i % 2 ? 1 : -1) * (8 + (i % 3) * 4);
      const dy = (i % 3 ? -1 : 1) * (10 + (i % 2) * 5);
      return `<button class="bubble" style="left:${left}%;top:${top}%" onclick="previewCoach('${c.id}')" aria-label="Preview ${esc(c.name)}">
        <span class="bubble-inner" style="--d:${dur}s;--delay:${delay}s;--dx:${dx}px;--dy:${dy}px">${avatar(c, 68, isStrongMatch(c) ? 'match' : '')}<span class="bubble-name">${esc(c.name.split(' ')[0])}</span></span></button>`;
    })
    .join('');

  const wider = DISTANCES.find((d) => d > s.distance);
  const empty = `<div class="card mt3"><p class="h3">No coaches within ${s.distance} km yet.</p>
      <p class="muted mt1">Try a wider distance, a different language, or a higher budget.</p>
      ${wider ? `<button class="btn mt2" onclick="widenDistance()">Search within ${wider} km</button>` : `<button class="btn mt2" onclick="openTab('settings')">Change preferences</button>`}</div>`;

  return `
    <div class="row between mt2">
      <button class="link-btn" onclick="openTab('settings')">⚙ Preferences</button>
      <span class="muted small">📍 ${esc(s.location)} · within ${s.distance} km · ${list.length} coach${list.length === 1 ? '' : 'es'}</span>
    </div>
    ${list.length ? `<div class="orbit">${bubbles}<div class="orbit-center"><div class="h2">Choose your coach</div></div></div>
      <p class="muted tiny" style="text-align:center">Glowing coaches match your schedule, skill and timeframe.</p>
      ${exactMatchCount < MIN_COACHES ? `<p class="muted tiny" style="text-align:center">Only ${exactMatchCount} coach${exactMatchCount === 1 ? '' : 'es'} fit${exactMatchCount === 1 ? 's' : ''} every filter, so we added the closest matches.</p>` : ''}` : empty}
    ${compareBar()}
    ${state.ui.preview ? previewModal(state.ui.preview) : ''}${state.ui.showCompare ? compareModal() : ''}`;
}

function widenDistance() {
  const s = stu();
  const wider = DISTANCES.find((d) => d > s.distance);
  if (wider) s.distance = wider;
  go({});
}

function previewCoach(id) {
  go({ preview: id });
}

function previewModal(id) {
  const c = coachById(id);
  if (!c) return '';
  const confirmed = me().confirmed.includes(id);
  return `
    <div class="backdrop" onclick="if(event.target===this) go({preview:null})">
      <div class="modal" role="dialog" aria-label="${esc(c.name)}">
        <div class="row">
          ${avatar(c, 72)}
          <div>
            <h3 class="h2">${esc(c.name)}</h3>
            <p class="muted small">${sportLabel(c)} · ${esc(c.area)} · about ${kmAway(c)} km away</p>
            <div class="row mt1" style="gap:6px;flex-wrap:wrap">
              ${c.isAccount ? '<span class="pill ok">✓ Verified (demo)</span>' : '<span class="pill ok">✓ Verified</span>'}
              ${c.fastTrack ? '<span class="pill">QUICK PREP</span>' : ''}
              ${isStrongMatch(c) ? '<span class="pill">GREAT MATCH</span>' : ''}
            </div>
          </div>
        </div>
        <p class="mt2">${esc(c.bio)}</p>
        <div class="chips mt2" style="gap:6px">${c.specialties.map((s) => `<span class="tag">${SKILLS[s]}</span>`).join('')}</div>
        <p class="muted small mt2">$${c.pricePerHour}/hr · ${c.rating ? '★ ' + c.rating : 'New coach'} · ${esc(c.languages.join(', '))} · ${c.avail.map((a) => AVAIL[a]).join(', ')}</p>
        <div class="grid2 mt3">
          <button class="btn ghost" onclick="go({preview:null})">Back</button>
          <button class="btn" onclick="confirmCoach('${c.id}')">${confirmed ? 'Open chat' : 'Confirm coach'}</button>
        </div>
        <button class="btn ghost mt2" onclick="toggleCompare('${c.id}')">${compareIds().includes(c.id) ? '✓ In comparison (tap to remove)' : '⚖ Add to compare'}</button>
      </div>
    </div>`;
}

function confirmCoach(id) {
  const a = me();
  if (!a.confirmed.includes(id)) a.confirmed.push(id);
  const key = threadKey(session, id);
  if (!state.threads[key]) state.threads[key] = { student: session, coachId: id, answers: null, briefing: null, messages: [] };
  go({ tab: 'chat', openThread: id, preview: null });
}

// ----- drills: shown in the Calendar -----

function markDrillDone(id) {
  const item = (me().inbox || []).find((i) => i.id === id);
  if (!item) return;
  item.done = true;
  item.doneAt = Date.now();
  item.read = true;
  saveState();
  toast('Nice work! Your coach can see this.');
  render();
}

// ----- chat -----

function chatTab() {
  const a = me();
  if (state.ui.openThread) return threadView(state.ui.openThread);
  if (!a.confirmed.length) {
    return `<h2 class="h2">Chat</h2><div class="card mt2"><p class="h3">No coaches yet.</p><p class="muted mt1">Confirm a coach to start a conversation.</p><button class="btn mt2" onclick="openTab('coaches')">Find a coach</button></div>`;
  }
  return `<h2 class="h2">Chat</h2>${a.confirmed
    .map((id) => {
      const c = coachById(id);
      const t = myThread(id);
      if (!c || !t) return '';
      const last = t.messages[t.messages.length - 1];
      const preview = !t.answers ? 'Send your request to start' : last ? last.text : 'Request sent. Waiting for a reply.';
      return `<button class="listrow" onclick="go({openThread:'${id}'})">${avatar(c, 48)}<div class="grow"><div class="h3">${esc(c.name)}</div><div class="muted small clip">${esc(preview)}</div></div></button>`;
    })
    .join('')}`;
}

function threadHead(c) {
  return `
    <button class="link-btn" onclick="go({openThread:null})">← All chats</button>
    <div class="row mt1">${avatar(c, 48)}<div><h2 class="h3">${esc(c.name)}</h2><p class="muted small">${sportLabel(c)} · $${c.pricePerHour}/hr</p></div></div>`;
}

function studentFactsLine(s) {
  return `${SPORTS[s.sport]} · level ${levelName(s.level)} → ${Number(s.target).toFixed(1)} within ${timeframeLabel(s.weeks)} · ${esc(s.language)} · ${esc(s.location)}`;
}

function questionnaire(c) {
  const s = stu();
  return `
    <p class="muted mt2">This is your first message to ${esc(c.name.split(' ')[0])}. Answer a few questions so they know what you need. We'll turn it into a short briefing.</p>
    <form class="form mt2" onsubmit="sendRequest(event, '${c.id}')">
      <div><span class="lbl small" style="font-weight:700">Which skills do you want to develop most?</span>
        <div class="chips mt1">${chipList('qskill', Object.entries(SKILLS))}</div></div>
      <label class="field"><span class="lbl">What's your goal?</span><select name="qgoal" class="input">${opts(GOALS)}</select></label>
      <div class="grid2 stack">
        <label class="field"><span class="lbl">Sessions per week</span><select name="qsessions" class="input" onchange="limitWeekends(this.form)">${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="field"><span class="lbl">When can you train?</span><select name="qavail" class="input">${opts(['Weekdays', 'Evenings', 'Weekends', 'Flexible'])}</select></label>
      </div>
      <label class="field"><span class="lbl">Anything else? (optional)</span><textarea name="qnotes" class="input" placeholder="Injuries, preferences, questions..."></textarea></label>
      <p id="q-error" class="error hidden"></p>
      <button class="btn" type="submit">Send request to ${esc(c.name.split(' ')[0])}</button>
      <p class="muted tiny">Your coach also sees: ${studentFactsLine(s)}.</p>
    </form>`;
}

// More than two sessions a week is a weekday/evening routine: weekends can't be picked.
function limitWeekends(f) {
  const many = Number(f.qsessions.value) > 2;
  const opt = [...f.qavail.options].find((o) => o.value === 'Weekends');
  if (!opt) return;
  opt.disabled = many;
  if (many && f.qavail.value === 'Weekends') f.qavail.value = 'Weekdays';
}

function sendRequest(e, coachId) {
  e.preventDefault();
  const f = e.target;
  const skills = checkedValues(f, 'qskill');
  if (!skills.length) return showError('q-error', 'Pick at least one skill.');

  const answers = {
    skills,
    goal: f.qgoal.value,
    sessions: Number(f.qsessions.value),
    avail: f.qavail.value,
    notes: f.qnotes.value.trim(),
  };
  const thread = myThread(coachId);
  const student = { ...stu() };
  thread.answers = answers;
  thread.briefing = { text: templateBriefing(student, answers), source: 'template' };
  thread.messages = [];
  thread.createdAt = Date.now();
  saveState();
  render();

  const coach = coachById(coachId);
  summariseRequest(student, answers, coach).then((briefing) => {
    thread.briefing = briefing;
    saveState();
    render();
  });
  if (!coach.isAccount) triggerCoachReply(coachId, true, '');
}

function answersList(a) {
  const rows = [['Skills', skillNames(a.skills)], ['Goal', a.goal], ['Sessions per week', a.sessions], ['Availability', a.avail]];
  if (a.notes) rows.push(['Notes', a.notes]);
  return `<ul class="answers">${rows.map(([k, v]) => `<li><b>${k}:</b> ${esc(v)}</li>`).join('')}</ul>`;
}

function briefingCard(thread, heading) {
  const sourceLabel = thread.briefing.source === 'ai' ? 'AI briefing' : 'Template briefing (no AI key)';
  return `<div class="brief"><div class="label">${heading ? `${heading} · ` : ''}${sourceLabel}</div><p class="mt1">${esc(thread.briefing.text)}</p></div>`;
}

function payRequestHtml(m, viewer, coachId) {
  if (m.paid) return '<div class="mt1"><span class="pill ok">✓ Paid</span></div>';
  if (viewer !== 'student') return '<div class="mt1"><span class="pill dim">Waiting for payment</span></div>';
  return `<button class="btn mt2" style="width:auto" onclick="openIntroPay('${coachId}', ${m.ts})">💳 Pay $${m.payRequest.amount}</button>`;
}

function messagesHtml(thread, viewer) {
  return `<div class="msgs">${thread.messages.filter((m) => !m.payRequest).map((m) => `<div class="msg ${m.from === viewer ? 'me' : 'them'}">${m.auto ? `<span class="auto">${m.auto === 'payment' ? '💳 Payment' : '🏆 Competition update'}</span>` : ''}${esc(m.text)}${m.payRequest ? payRequestHtml(m, viewer, thread.coachId) : ''}</div>`).join('')}</div>`;
}

function threadView(coachId) {
  const c = coachById(coachId);
  const t = myThread(coachId);
  if (!c || !t) return `<p class="muted">Chat not found.</p><button class="btn mt2" onclick="go({openThread:null})">Back</button>`;
  if (!t.answers) return threadHead(c) + questionnaire(c);

  const key = threadKey(session, coachId);
  const coachReplied = t.messages.some((m) => m.from === 'coach');
  const typing = typingFor === key ? `<p class="typing mt1">${esc(c.name.split(' ')[0])} is typing…</p>` : '';
  const waiting = !coachReplied && typingFor !== key ? `<p class="muted small mt2">Waiting for ${esc(c.name.split(' ')[0])} to answer your request.</p>` : '';
  return `
    ${threadHead(c)}
    <div class="card mt2"><p class="small muted">You sent</p>${answersList(t.answers)}</div>
    ${briefingCard(t, `What ${esc(c.name.split(' ')[0])} sees`)}
    ${messagesHtml(t, 'student')}${typing}${waiting}${introPayModal()}
    <form class="chatbar" onsubmit="sendMessage(event, '${coachId}')">
      <input id="chat-input" class="input" placeholder="${coachReplied ? 'Message…' : 'Available after your coach replies'}" ${coachReplied ? '' : 'disabled'} autocomplete="off">
      <button class="btn" type="submit" ${coachReplied ? '' : 'disabled'}>Send</button>
    </form>
    <div data-scroll-end></div>`;
}

function sendMessage(e, coachId) {
  e.preventDefault();
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;
  myThread(coachId).messages.push({ from: 'student', text, ts: Date.now() });
  saveState();
  render();
  const coach = coachById(coachId);
  if (coach && !coach.isAccount) triggerCoachReply(coachId, false, text);
  const next = $('chat-input');
  if (next) next.focus();
}

async function triggerCoachReply(coachId, isFirst, lastText) {
  const coach = coachById(coachId);
  const thread = myThread(coachId);
  const email = session;
  if (!coach || !thread) return;
  const key = threadKey(email, coachId);
  typingFor = key;
  render();
  const reply = await coachReply(coach, thread, { ...state.accounts[email].student }, isFirst, lastText);
  typingFor = null;
  thread.messages.push({ from: 'coach', text: reply.text, ts: Date.now() });
  if (isFirst) {
    // A first drill (due in a week) lands in the student's Calendar.
    const skill = thread.answers.skills[0];
    addInbox(email, { kind: 'note', from: coach.name, title: 'Welcome', body: `Thanks for reaching out. ${coach.persona}` });
    addInbox(email, { kind: 'drill', from: coach.name, title: DRILLS[skill].title, body: DRILLS[skill].text, due: Date.now() + 7 * DAY, done: false });
    if (session === email) toast('New drill in your Calendar');
  }
  saveState();
  render();
}

// ----- videos: post clips of yourself playing, shared with your coaches -----

function clipUrl(c) {
  return c.hasFile ? fileUrls[c.id] || '' : c.url || '';
}

function videoBlock(c) {
  const url = clipUrl(c);
  const note = c.hasFile ? 'Loading video…' : 'No video attached';
  if (!url) return `<div class="clip-wrap failed"><div class="clip-ph">🎬 ${note}</div></div>`;
  return `<div class="clip-wrap"><video controls preload="metadata" src="${esc(url)}" onerror="this.parentNode.classList.add('failed')"></video><div class="clip-ph">🎬 Video unavailable (offline or blocked link)</div></div>`;
}

// mode: 'mine' (with delete) or 'feed' (plain)
function clipCard(c, mode) {
  const who = c.owner ? nameOf(c.owner) : c.player;
  const action =
    mode === 'mine'
      ? `<button class="link-btn" onclick="deleteClip('${c.id}')">Delete</button>`
      : '';
  return `<article class="card clip">${videoBlock(c)}
    <div class="row between mt2"><div><h3 class="h3">${esc(c.title)}</h3><p class="muted small">${esc(who)} · Level ${Number(c.level).toFixed(1)} · ${SPORTS[c.sport]}</p></div>
      ${mode === 'mine' ? `<span class="pill ${c.shared ? '' : 'dim'}">${c.shared ? 'COACHES CAN SEE' : 'PRIVATE'}</span>` : ''}</div>
    ${c.caption ? `<p class="small mt1">${esc(c.caption)}</p>` : ''}${action}</article>`;
}

function videosTab() {
  const s = stu();
  const mine = state.clips.filter((c) => c.owner === session);
  return `
    <div class="row between"><h2 class="h2">Videos</h2>
      <button class="btn small inline" onclick="toggleClipForm()">${showClipForm ? 'Cancel' : '+ Add video'}</button></div>
    <p class="muted mt1">Share videos of yourself playing. Your coaches can watch them and give feedback.</p>
    ${showClipForm ? clipForm() : ''}
    <h3 class="h3 mt3">Your videos</h3>
    <div class="clip-grid mt1">${mine.length ? mine.map((c) => clipCard(c, 'mine')).join('') : '<p class="muted">You have not added a video yet.</p>'}</div>`;
}

function clipForm() {
  return `
    <form class="card form mt2" onsubmit="postClip(event)">
      <label class="field"><span class="lbl">Title</span><input name="ctitle" class="input" placeholder="e.g. Baseline rally" required></label>
      <label class="field"><span class="lbl">Description (optional)</span><input name="ccaption" class="input" placeholder="What is happening in this video?"></label>
      <label class="field"><span class="lbl">Video file</span><input name="cfile" type="file" accept="video/*" class="input"></label>
      <label class="field"><span class="lbl">Or a video link (optional)</span><input name="curl" class="input" placeholder="https://…"></label>
      <div class="chips"><label class="chip"><input name="cshare" type="checkbox" checked><span>Let my coaches see this</span></label></div>
      <p id="clip-error" class="error hidden"></p>
      <button class="btn" type="submit">Add video</button>
    </form>`;
}

function toggleClipForm() {
  showClipForm = !showClipForm;
  render();
}

// Uploaded video files are kept in this browser (IndexedDB), because localStorage is too small for video.
function openVideoDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('larplete-videos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('videos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function videoStore(mode, run) {
  const db = await openVideoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('videos', mode);
    const request = run(tx.objectStore('videos'));
    tx.oncomplete = () => resolve(request && request.result);
    tx.onerror = () => reject(tx.error);
  });
}

async function restoreVideoUrls() {
  for (const c of state.clips) {
    if (!c.hasFile || fileUrls[c.id]) continue;
    try {
      const blob = await videoStore('readonly', (store) => store.get(c.id));
      if (blob) fileUrls[c.id] = URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Could not load a saved video:', err);
    }
  }
  render();
}

async function postClip(e) {
  e.preventDefault();
  const f = e.target;
  const file = f.cfile.files[0];
  const url = f.curl.value.trim();
  if (!file && !url) return showError('clip-error', 'Add a video file or a link.');
  if (file && !file.type.startsWith('video/')) return showError('clip-error', 'That file is not a video.');
  if (file && file.size > 100 * 1024 * 1024) return showError('clip-error', 'Please choose a video under 100 MB.');
  if (!file && !/^https?:\/\//i.test(url)) return showError('clip-error', 'The link must start with http:// or https://');

  const s = stu();
  const id = 'u' + Date.now().toString(36);
  const clip = { id, owner: session, player: nameOf(session), sport: s.sport, level: s.level, title: f.ctitle.value.trim(), caption: f.ccaption.value.trim(), url: file ? '' : url, hasFile: !!file, shared: f.cshare.checked, ts: Date.now() };
  if (file) {
    fileUrls[id] = URL.createObjectURL(file);
    try {
      await videoStore('readwrite', (store) => store.put(file, id));
    } catch (err) {
      console.warn('Could not save the video file:', err);
      toast('Added for this visit only: this browser could not store the file.');
    }
  }
  state.clips.unshift(clip);
  showClipForm = false;
  saveState();
  toast('Video added');
  render();
}

async function deleteClip(id) {
  if (!confirm('Delete this video?')) return;
  const clip = state.clips.find((c) => c.id === id);
  state.clips = state.clips.filter((c) => c.id !== id);
  if (clip && clip.hasFile) {
    if (fileUrls[id]) URL.revokeObjectURL(fileUrls[id]);
    delete fileUrls[id];
    try {
      await videoStore('readwrite', (store) => store.delete(id));
    } catch (err) {
      console.warn('Could not remove the stored video:', err);
    }
  }
  saveState();
  render();
}

// ---------- student settings ----------

function settingsTab() {
  const s = stu();
  return `
    <h2 class="h2">Settings</h2>
    <p class="muted mt1">Change the answers you gave when you started.</p>
    ${receiptsCard()}
    <div class="form mt3">
      ${WIZARD.map((st) =>
        st.type === 'text'
          ? `<label class="field"><span class="lbl">${esc(st.short)}</span><input class="input" data-pref="${st.key}" value="${esc(s[st.key])}" placeholder="${esc(st.placeholder)}"></label>`
          : `<label class="field"><span class="lbl">${esc(st.short)}</span>
          <select class="input" data-pref="${st.key}">
            ${st.options().map(([v, icon, label]) => `<option value="${esc(JSON.stringify(v))}" ${JSON.stringify(s[st.key]) === JSON.stringify(v) ? 'selected' : ''}>${icon} ${esc(label)}</option>`).join('')}
          </select></label>`
      ).join('')}
      <button class="btn" onclick="saveSettings()">Save preferences</button>
      <button class="btn ghost" onclick="redoOnboarding()">Redo the questions</button>
      <button class="btn ghost" onclick="logOut()">Log out</button>
      <button class="link-btn" onclick="resetDemo()">Reset all demo data</button>
    </div>`;
}

function saveSettings() {
  const next = { ...stu() };
  for (const el of document.querySelectorAll('[data-pref]')) {
    const st = WIZARD.find((x) => x.key === el.dataset.pref);
    if (st.type === 'text') {
      const value = st.parse(el.value);
      if (value === null) return toast(st.error);
      next[st.key] = value;
    } else {
      next[st.key] = JSON.parse(el.value);
    }
  }
  if (next.target <= next.level && next.level < 5) return toast('Your target level must be above your current level.');
  Object.assign(stu(), next);
  saveState();
  toast('Preferences saved');
}

function redoOnboarding() {
  me().student = {};
  go({ tab: 'coaches' });
}

function resetDemo() {
  if (!confirm('Reset all demo data (every account) and start over?')) return;
  resetState();
  typingFor = null;
  certFile = null;
  pendingRole = null;
  render();
}

// ---------- coach: profile, certificate, panel ----------

function cprofile() {
  const c = me().coach || {};
  return `
    <div class="wz-top"><div class="wz-bar"><i style="width:33%"></i></div><span class="muted small">1/3</span></div>
    <h1 class="h1 wz-title">Set up your coach profile</h1>
    <form class="form mt3" onsubmit="saveCoachProfile(event)">
      <label class="field"><span class="lbl">Your name</span><input name="cname" class="input" value="${esc(c.name || '')}" required></label>
      <div><span class="lbl small" style="font-weight:700">Sport</span>
        <div class="chips mt1">
          ${[['tennis', 'Tennis'], ['pickleball', 'Pickleball'], ['both', 'Both']]
            .map(([v, l]) => `<label class="chip"><input type="radio" name="csport" value="${v}" ${(c.sports ? (c.sports.length > 1 ? 'both' : c.sports[0]) : 'tennis') === v ? 'checked' : ''}><span>${l}</span></label>`)
            .join('')}
        </div></div>
      <div><span class="lbl small" style="font-weight:700">Languages</span><div class="chips mt1">${chipList('clang', LANGUAGES.map((l) => [l, l]), c.languages || ['English'])}</div></div>
      <div><span class="lbl small" style="font-weight:700">What you teach best</span><div class="chips mt1">${chipList('cskill', Object.entries(SKILLS), c.specialties || [])}</div></div>
      <div><span class="lbl small" style="font-weight:700">Availability</span><div class="chips mt1">${chipList('cavail', Object.entries(AVAIL), c.avail || [])}</div></div>
      <div class="grid2 stack">
        <label class="field"><span class="lbl">Where you coach</span><select name="carea" class="input">${opts(AREAS, c.area)}</select></label>
        <label class="field"><span class="lbl">Price per hour ($)</span><input name="cprice" type="number" min="10" max="300" class="input" value="${c.price || ''}" required></label>
      </div>
      <div class="chips"><label class="chip"><input type="checkbox" name="cquick" ${c.fastTrack ? 'checked' : ''}><span>I can get students ready within a month</span></label></div>
      <label class="field"><span class="lbl">Short bio</span><textarea name="cbio" class="input" placeholder="What makes your coaching different?">${esc(c.bio || '')}</textarea></label>
      <p id="c-error" class="error hidden"></p>
      <button class="btn" type="submit">Continue</button>
    </form>`;
}

function saveCoachProfile(e) {
  e.preventDefault();
  const f = e.target;
  const languages = checkedValues(f, 'clang');
  const specialties = checkedValues(f, 'cskill');
  const avail = checkedValues(f, 'cavail');
  if (!languages.length) return showError('c-error', 'Pick at least one language.');
  if (!specialties.length) return showError('c-error', 'Pick at least one skill you teach.');
  if (!avail.length) return showError('c-error', 'Pick when you are available.');

  const sportChoice = f.csport.value;
  const previous = me().coach || {};
  me().coach = {
    name: f.cname.value.trim(),
    sports: sportChoice === 'both' ? ['tennis', 'pickleball'] : [sportChoice],
    languages,
    area: f.carea.value,
    price: Number(f.cprice.value),
    avail,
    specialties,
    fastTrack: f.cquick.checked,
    bio: f.cbio.value.trim() || 'New coach on LARPLIT.',
    status: previous.status === 'verified' ? 'verified' : 'draft',
    certName: previous.certName || null,
    reason: previous.reason || '',
    source: previous.source || '',
  };
  go({ screen: previous.status === 'verified' ? 'cpanel' : 'ccert' });
}

function ccert() {
  return `
    <div class="wz-top"><div class="wz-bar"><i style="width:66%"></i></div><span class="muted small">2/3</span></div>
    <h1 class="h1 wz-title">Upload your certification</h1>
    <p class="muted mt1 wz-sub">Coaches must be verified before students can see them. Upload a photo or PDF of your coaching certificate (PNG, JPG, WebP, or PDF, up to 5 MB).</p>
    <div class="form mt4">
      <label class="drop" id="cert-drop"><input id="cert-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onchange="previewCert(this)"><span class="drop-icon">📄</span><span class="h3">Choose a file</span><span class="muted small">PNG, JPG, WebP or PDF</span></label>
      <div id="cert-preview" class="cert-preview hidden"></div>
      <p id="cert-error" class="error hidden"></p>
      <button class="btn" onclick="startVerification()">Submit for verification</button>
      <button class="link-btn" onclick="go({screen:'cprofile'})">← Back to profile</button>
    </div>`;
}

let certUrl = null;

function previewCert(input) {
  const file = input.files[0];
  const box = $('cert-preview');
  if (certUrl) URL.revokeObjectURL(certUrl);
  if (!file) {
    box.classList.add('hidden');
    $('cert-drop').classList.remove('hidden');
    return;
  }
  certUrl = URL.createObjectURL(file);
  const size = file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB';
  const view = file.type === 'application/pdf'
    ? `<object data="${certUrl}" type="application/pdf" class="cert-doc"><p class="muted small" style="padding:24px">📄 PDF selected. Preview is not available in this browser.</p></object>`
    : `<img src="${certUrl}" alt="Your certificate" class="cert-img">`;
  box.innerHTML = `${view}<div class="row between mt2"><div><div class="h3 clip">${esc(file.name)}</div><div class="muted small">${size}</div></div>
    <button class="link-btn" onclick="clearCert()">Change file</button></div>`;
  box.classList.remove('hidden');
  $('cert-drop').classList.add('hidden');
  $('cert-error').classList.add('hidden');
}

function clearCert() {
  $('cert-file').value = '';
  previewCert($('cert-file'));
}

function startVerification() {
  const file = $('cert-file').files[0];
  if (!file) return showError('cert-error', 'Choose a file first.');
  const coach = me().coach;
  certFile = file;
  coach.status = 'checking';
  coach.certName = file.name;
  go({ screen: 'cverify' });

  checkCertificate(file, coach).then((res) => {
    coach.status = res.approved ? 'verified' : 'needs_review';
    coach.reason = res.reason;
    coach.source = res.source;
    saveState();
    render();
  });
}

function cverify() {
  const c = me().coach;
  const checking = c.status === 'checking' && certFile;
  const interrupted = c.status === 'checking' && !certFile;

  if (checking) {
    return `<div class="card mt3" style="text-align:center;padding:32px 16px"><div class="spinner"></div><h2 class="h2 mt2">Checking your certificate…</h2><p class="muted mt1">${esc(c.certName)}</p></div>`;
  }
  if (c.status === 'verified') {
    const note = c.source === 'demo' ? `<p class="small mt2" style="color:var(--warn)">${esc(c.reason)}</p>` : `<p class="muted small mt2">${esc(c.reason)} (checked by AI)</p>`;
    return `
      <div class="wz-top"><div class="wz-bar"><i style="width:100%"></i></div><span class="muted small">3/3</span></div>
      <div class="card mt2" style="text-align:center;padding:32px 16px"><p style="font-size:42px">✓</p><h2 class="h2">You're verified</h2>${note}</div>
      <button class="btn mt3" onclick="go({screen:'cpanel'})">Open coach panel</button>`;
  }
  const why = interrupted ? 'The check was interrupted. Please upload the file again.' : c.reason;
  return `
    <div class="card mt3"><h2 class="h2">Needs review</h2><p class="muted mt1">${esc(why)}</p></div>
    <button class="btn mt3" onclick="go({screen:'ccert'})">Upload a different file</button>`;
}

// ---------- boot ----------

document.addEventListener('DOMContentLoaded', () => {
  render();
  restoreVideoUrls();
});
