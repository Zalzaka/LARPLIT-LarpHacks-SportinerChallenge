const STORAGE_KEY = 'larplete_v4';
const SESSION_KEY = 'larplete_session_v4';

// Everything lives in this browser's localStorage. There is no server and no password: sign-in is by email only (demo).
function freshState() {
  return {
    accounts: {}, // email -> { email, role, student?, coach?, recruiter?, confirmed: [coachId], inbox: [item] }
    threads: {}, // `${studentEmail}::${coachId}` -> { student, coachId, answers, briefing, messages: [{from, text}] }
    clips: [], // videos posted by students
    ui: { screen: 'auth', tab: 'coaches', openThread: null, openStudent: null, preview: null, contact: null },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const base = freshState();
      return { ...base, ...saved, ui: { ...base.ui, ...saved.ui, preview: null, contact: null } };
    }
  } catch (e) {
    console.warn('Could not read saved state, starting fresh:', e);
  }
  return freshState();
}

// Several tabs can be open at once (student, coach, recruiter), and they all share one localStorage entry.
// Each tab remembers the last copy it loaded or saved (`baseline`). On save, only the records this tab changed
// are written; everything else is taken from storage, so one tab does not wipe another tab's changes.
let baseline = null;

function snapshot(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeRecords(stored, mine, base) {
  const out = { ...stored };
  const keys = new Set([...Object.keys(mine), ...Object.keys(base)]);
  keys.forEach((key) => {
    const changedHere = JSON.stringify(mine[key]) !== JSON.stringify(base[key]);
    if (changedHere && mine[key] === undefined) delete out[key];
    else if (changedHere) out[key] = mine[key];
    // Keep this tab's own object when it matches storage, so code that is mid-way through an async reply
    // still writes to the live record and not to a stale copy.
    else if (mine[key] !== undefined && JSON.stringify(out[key]) === JSON.stringify(mine[key])) out[key] = mine[key];
  });
  return out;
}

function saveState() {
  try {
    let stored = {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
    const base = baseline || freshState();
    const merged = {
      accounts: mergeRecords(stored.accounts || {}, state.accounts, base.accounts),
      threads: mergeRecords(stored.threads || {}, state.threads, base.threads),
      clips: mergeRecords(
        Object.fromEntries((stored.clips || []).map((c) => [c.id, c])),
        Object.fromEntries(state.clips.map((c) => [c.id, c])),
        Object.fromEntries(base.clips.map((c) => [c.id, c]))
      ),
    };
    merged.clips = Object.values(merged.clips);
    state.accounts = merged.accounts;
    state.threads = merged.threads;
    state.clips = merged.clips;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accounts: state.accounts, threads: state.threads, clips: state.clips, ui: state.ui }));
    baseline = snapshot({ accounts: state.accounts, threads: state.threads, clips: state.clips });
  } catch (e) {
    console.warn('Could not save state:', e);
  }
}

// The signed-in email lives in sessionStorage, so every new visit starts at the sign-in screen.
function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch (e) {
    return null;
  }
}

function writeSession(email) {
  try {
    if (email) sessionStorage.setItem(SESSION_KEY, email);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Could not save the session:', e);
  }
  session = email || null;
}

function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear saved state:', e);
  }
  state = freshState();
  writeSession(null);
}

let state = loadState();
let session = readSession();
baseline = snapshot({ accounts: state.accounts, threads: state.threads, clips: state.clips });

function me() {
  return (session && state.accounts[session]) || null;
}

// ---------- small helpers ----------

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function skillNames(skills) {
  return skills.map((s) => SKILLS[s]).join(', ');
}

function nameOf(email) {
  const local = String(email).split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Student';
}
