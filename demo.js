// ---------- demo workspace for new coaches ----------
// So a freshly verified coach opens a workspace that already has life in it: new requests, chats waiting for a
// reply, sessions on the calendar, drills, a competition and some earnings. All students are fictional demo accounts.
// It runs once per coach account (c.demoSeeded) and never touches data that is already there.

const DEMO_STUDENTS = [
  { first: 'Emma', last: 'Carter', level: 2, target: 3.5, weeks: 12 },
  { first: 'Noah', last: 'Kim', level: 2.5, target: 4, weeks: 12 },
  { first: 'Sofia', last: 'Ramirez', level: 3, target: 4, weeks: 26 },
  { first: 'Liam', last: 'Patel', level: 1.5, target: 3, weeks: 12 },
  { first: 'Ava', last: 'Thompson', level: 3.5, target: 4.5, weeks: 12 },
];

function seedDemoCoach(account) {
  const c = account.coach;
  if (!c || c.demoSeeded) return;
  c.demoSeeded = true;
  const coachId = coachIdOf(account.email);
  const tag = 'c' + [...account.email].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36);
  const sport = c.sports[0];
  const skills = c.specialties.length ? c.specialties : ['serve', 'forehand'];
  const skillAt = (i) => skills[i % skills.length];
  const label = (k) => SKILLS[k].toLowerCase();
  const sportName = SPORTS[sport].toLowerCase();
  const comp = COMP_DEFS.find((d) => d.sport === sport);
  const now = Date.now();
  const at = (days, hour = 18) => {
    const d = new Date(now + days * DAY);
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
  };

  const make = (i) => {
    const d = DEMO_STUDENTS[i];
    // capital surname so nameOf() reads "Emma Carter"; the domain is unique per coach so every coach gets their own students
    const email = `${d.first.toLowerCase()}.${d.last}@${tag}.demo.larplit`;
    if (state.accounts[email]) return null;
    state.accounts[email] = {
      email, role: 'student', coach: null, confirmed: [coachId], inbox: [], personal: [],
      student: {
        sport, level: d.level, target: d.target, weeks: d.weeks, location: c.area, distance: 30, language: c.languages[0],
        maxPrice: 999, avail: 'Any', skill: skillAt(i), onboarded: true,
      },
    };
    return { email, d, s: state.accounts[email].student };
  };

  const thread = (st, answers, manage, messages, sessions = [], createdDays = 2) => {
    const t = {
      student: st.email, coachId, answers,
      briefing: { text: templateBriefing(st.s, answers), source: 'template' },
      messages, sessions, createdAt: at(-createdDays, 10), manage,
    };
    state.threads[threadKey(st.email, coachId)] = t;
    return t;
  };
  const msg = (from, text, days, hour = 12) => ({ from, text, ts: at(days, hour) });
  const drill = (st, skill, dueDays, done = false, sentDays = -3) => {
    addInbox(st.email, { kind: 'drill', from: c.name, by: account.email, title: DRILLS[skill].title, body: DRILLS[skill].text, due: at(dueDays, 20), done, ts: at(sentDays, 9) });
    c.sent = c.sent || [];
    c.sent.push({ kind: 'drill', student: st.email, title: DRILLS[skill].title, ts: at(sentDays, 9) });
  };
  const pay = (st, session, price) => {
    const a = state.accounts[st.email];
    const id = 'pay' + Math.random().toString(36).slice(2, 8);
    a.payments = a.payments || [];
    a.payments.unshift({ id, ts: session.when + 3600 * 1000, coachId, coachName: c.name, amount: price, tip: 0, sessionId: session.id, desc: `Session ${fmtTime(session.when)}`, method: typeof DEMO_CARD !== 'undefined' ? DEMO_CARD : 'Demo card' });
    session.paid = id;
  };
  const session = (id, when, note, extra = {}) => ({ id, when, note, done: false, status: 'confirmed', by: 'coach', ...extra });

  // 1. Emma: a brand new request waiting to be accepted
  const emma = make(0);
  if (emma) {
    thread(emma, { skills: [skillAt(0), skillAt(1)], goal: 'Reach my target level', sessions: 2, avail: 'Evenings', notes: `I just started playing ${sportName} and want a clear plan.` }, { status: 'new' }, [], [], 0);
  }

  // 2. Noah: training, wrote to you last, upcoming session and an open drill
  const noah = make(1);
  if (noah) {
    const past = session('sd1' + Math.random().toString(36).slice(2, 5), at(-5), `${SKILLS[skillAt(0)]} basics`, { done: true });
    pay(noah, past, c.price);
    const next = session('sd2' + Math.random().toString(36).slice(2, 5), at(2), `${SKILLS[skillAt(1)]} work`);
    thread(noah, { skills: [skillAt(0)], goal: 'Prepare for a tournament', sessions: 2, avail: 'Weekdays', notes: '' },
      { status: 'training', acceptedAt: at(-12), startLevel: 2 },
      [msg('coach', `Hi Noah, welcome! Let's work toward 4.0. First up: your ${label(skillAt(0))}.`, -12),
        msg('student', 'Thanks! Practiced the drill twice this week.', -3),
        msg('coach', 'Great. Keep the same rhythm. See you on the court.', -3, 14),
        msg('student', `Quick question: should I change my ${label(skillAt(1))} grip before Thursday?`, 0, 8)],
      [past, next], 14);
    drill(noah, skillAt(1), 3);
  }

  // 3. Sofia: training, has gone quiet
  const sofia = make(2);
  if (sofia) {
    const past = session('sd3' + Math.random().toString(36).slice(2, 5), at(-18), 'First assessment', { done: true });
    pay(sofia, past, c.price);
    thread(sofia, { skills: [skillAt(2)], goal: 'Play more confidently', sessions: 1, avail: 'Evenings', notes: 'Busy at work, but I want to stay consistent.' },
      { status: 'training', acceptedAt: at(-24), startLevel: 3 },
      [msg('coach', 'Hi Sofia, great first session! Here is your first drill.', -18),
        msg('student', 'Will do, thank you!', -17),
        msg('coach', 'How is the drill going?', -10)],
      [past], 25);
    drill(sofia, skillAt(2), -6, false, -18);
  }

  // 4. Liam: training, asked for a session that needs confirming
  const liam = make(3);
  if (liam) {
    const req = session('sd4' + Math.random().toString(36).slice(2, 5), at(4, 17), `${SKILLS[skillAt(0)]} lesson`, { status: 'requested', by: 'student' });
    thread(liam, { skills: [skillAt(0), skillAt(2)], goal: 'Stay active and enjoy the sport', sessions: 1, avail: 'Weekends', notes: '' },
      { status: 'training', acceptedAt: at(-6), startLevel: 1.5 },
      [msg('coach', 'Hi Liam, glad to have you. Tell me what times work for you!', -6),
        msg('student', 'Thursday after work works best for me.', -5),
        msg('coach', 'Perfect, send me a request in the calendar and I will confirm.', -5, 15)],
      [req], 8);
    drill(liam, skillAt(0), 5, false, -4);
  }

  // 5. Ava: advanced, registered for a competition, completed drills, paid sessions
  const ava = make(4);
  if (ava) {
    const p1 = session('sd5' + Math.random().toString(36).slice(2, 5), at(-21), 'Match play', { done: true });
    const p2 = session('sd6' + Math.random().toString(36).slice(2, 5), at(-8), `${SKILLS[skillAt(1)]} patterns`, { done: true });
    pay(ava, p1, c.price);
    pay(ava, p2, c.price);
    const next = session('sd7' + Math.random().toString(36).slice(2, 5), at(6, 19), 'Tournament prep');
    thread(ava, { skills: [skillAt(1), skillAt(0)], goal: 'Prepare for a tournament', sessions: 2, avail: 'Evenings', notes: 'Want to play my first event this season.' },
      { status: 'training', acceptedAt: at(-30), startLevel: 3.5 },
      [msg('coach', 'Great progress, Ava. Your consistency is up a lot.', -8),
        msg('student', 'Thank you! I signed up for my first event.', -2),
        msg('coach', "That's fantastic. We'll build a prep plan together.", -2, 15)],
      [p1, p2, next], 32);
    drill(ava, skillAt(1), 4, false, -2);
    drill(ava, skillAt(0), -10, true, -14);
    ava.s.comps = comp ? [{ id: comp.id, status: 'registered', signup: { name: 'Ava Thompson', at: at(-2) } }] : [];
  }

  saveState();
}
