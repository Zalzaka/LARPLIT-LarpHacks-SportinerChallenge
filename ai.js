// AI helpers. Each one works without an API key by falling back to a template or demo mode.

const AI_MODEL = 'claude-haiku-5-5';

function aiKey() {
  return (window.LARPLETE_CONFIG && window.LARPLETE_CONFIG.anthropicApiKey) || '';
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callClaude({ system, messages, maxTokens = 300 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': aiKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return data.content.map((b) => b.text || '').join('').trim();
}

// ---------- request briefing for the coach ----------

function studentFacts(student) {
  return `Sport: ${SPORTS[student.sport]}. Current level: ${levelName(student.level)}. Target: level ${Number(student.target).toFixed(1)} within ${timeframeLabel(student.weeks)}. Language: ${student.language}. Location: ${student.location}.`;
}

function answersToText(answers) {
  const lines = [
    `Skills to develop: ${skillNames(answers.skills)}`,
    `Goal: ${answers.goal}`,
    `Sessions per week: ${answers.sessions}`,
    `Availability: ${answers.avail}`,
  ];
  if (answers.notes) lines.push(`Notes: ${answers.notes}`);
  return lines.join('\n');
}

function urgencyOf(weeks) {
  return weeks <= 4 ? 'high' : weeks <= 12 ? 'medium' : 'low';
}

function templateBriefing(student, answers) {
  return `${levelName(student.level)} ${SPORTS[student.sport].toLowerCase()} player aiming for level ${Number(student.target).toFixed(1)} within ${timeframeLabel(student.weeks)}. Wants to work on ${skillNames(answers.skills).toLowerCase()}. Goal: ${answers.goal.toLowerCase()}. Would like ${answers.sessions} session${answers.sessions === 1 ? '' : 's'} a week, ${answers.avail.toLowerCase()}. Urgency: ${urgencyOf(student.weeks)}.`;
}

async function summariseRequest(student, answers, coach) {
  if (!aiKey()) return { text: templateBriefing(student, answers), source: 'template' };
  try {
    const text = await callClaude({
      system: 'You write short briefings for sports coaches about a new student request. Write 3 sentences, plain text, concrete and useful. Mention current level, target level and timeframe, what to work on, and the schedule.',
      messages: [{ role: 'user', content: `Coach: ${coach.name} (${coach.sports.join('/')}).\n${studentFacts(student)}\n${answersToText(answers)}` }],
      maxTokens: 220,
    });
    return { text, source: 'ai' };
  } catch (err) {
    console.warn('AI briefing failed, using template:', err);
    return { text: templateBriefing(student, answers), source: 'template' };
  }
}

// ---------- seeded coach replies ----------

const SKILL_CUES = {
  serve: 'Keep your toss in the same spot every time and finish the swing tall. Aim for the corners before you add pace.',
  forehand: 'Turn your shoulders early, brush up the back of the ball, and finish over your opposite shoulder.',
  backhand: 'Turn your shoulders sooner than feels natural, and let the racket do the work through contact.',
  volley: 'Short punch, firm wrist, and take the ball in front of you. Move your feet to the ball instead of reaching.',
  smash: 'Point at the ball with your free hand, turn sideways, and hit up and through it.',
  return: 'Split-step as the server hits, take a shorter backswing, and aim for depth in the middle of the court.',
  footwork: 'Small adjusting steps near the ball and a split-step before each shot. Recover to the middle after every hit.',
};
const SKILL_WORDS = { serve: /serve|serving|toss/, forehand: /forehand/, backhand: /backhand/, volley: /volley|net play|dink/, smash: /smash|overhead/, return: /return/, footwork: /footwork|movement|moving|speed|fitness/ };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function nextWeekdayLabel(name) {
  const target = WEEKDAYS.indexOf(name);
  const d = new Date();
  d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
  return d.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' });
}

function coachFree(coach, dayName) {
  const weekend = dayName === 'saturday' || dayName === 'sunday';
  return weekend ? coach.avail.includes('weekends') : coach.avail.includes('weekdays') || coach.avail.includes('evenings');
}

// Rule-based fallback when there is no API key. It reads what the student actually wrote (topic, day, time, skill)
// and answers that, but it is much less flexible than the AI version.
function scriptedReply(coach, thread, student, isFirst, lastStudentText) {
  const first = coach.name.split(' ')[0];
  const mainSkill = SKILLS[thread.answers.skills[0]].toLowerCase();
  if (isFirst) {
    const timing = student.weeks <= 12 ? ` Since you want to reach level ${Number(student.target).toFixed(1)} in ${timeframeLabel(student.weeks)}, we should start soon.` : '';
    return `Hi, I'm ${first}! Thanks for the details. ${coach.persona} I'd begin with your ${mainSkill}.${timing} I can do ${thread.answers.avail.toLowerCase()}. I've put a first drill in your Calendar. Here's what we'll work on together: ${skillNames(thread.answers.skills).toLowerCase()}, one thing at a time.`;
  }
  const raw = (lastStudentText || '').trim();
  const text = raw.toLowerCase();
  const availText = coach.avail.map((a) => AVAIL[a].toLowerCase()).join(' and ');
  const skillKey = Object.keys(SKILL_WORDS).find((k) => SKILL_WORDS[k].test(text));
  const day = WEEKDAYS.find((d) => text.includes(d) || text.includes(d.slice(0, 3) + ' ') || text.endsWith(d.slice(0, 3)));
  const time = (text.match(/\b(\d{1,2})(:\d\d)?\s?(am|pm)\b/) || [])[0] || (/morning/.test(text) ? 'in the morning' : /afternoon/.test(text) ? 'in the afternoon' : /evening|night/.test(text) ? 'in the evening' : '');

  if (/injur|pain|hurt|sore|sprain|strain|knee|shoulder|elbow|wrist|ankle|\bback\b/.test(text)) return `Sorry to hear that. Don't push through pain. Rest it, and if it lasts more than a couple of days, see a physio before we train. When you're ready, we'll start with a light session and build up slowly.`;
  if (/just registered for|i signed up for/.test(text)) return `Great news, thanks for telling me! I've got the date. I'll plan your next sessions backwards from it so your serve and footwork are sharp on the day. Want to book a session this week?`;
  if (/price|cost|rate|\$|pay|how much|fee|expensive|cheap|discount/.test(text)) return `My rate is $${coach.pricePerHour} per hour. If you want to try me out, we can do a shorter first session and see if the fit is right.`;
  if (/cancel|reschedule|can't make|cant make|postpone/.test(text)) return `No problem, thanks for the heads up. Send me a couple of new times that work, or request another slot in your Calendar, and I'll fit you in.`;
  if (/book|schedule|session|lesson|available|availability|when can|free on|meet|next week|this week|tomorrow|today/.test(text) || (day && time)) {
    if (day) {
      const label = nextWeekdayLabel(day);
      return coachFree(coach, day)
        ? `${label} ${time} should work. Request it in your Calendar so it's locked in, and tell me what you want to focus on.`
        : `I'm not usually free on ${day.charAt(0).toUpperCase() + day.slice(1)}s. I coach ${availText}. Could you do one of those? Request a slot in your Calendar and I'll confirm.`;
    }
    return `I coach ${availText}. Tell me a day and time that suits you, or request a slot in your Calendar and I'll confirm it.`;
  }
  if (/racket|racquet|paddle|shoes|string|grip|equipment|gear|balls?\b/.test(text)) return `For your level, a mid-weight, forgiving ${thread.answers.skills.length && student.sport === 'pickleball' ? 'paddle' : 'racket'} is plenty. Good court shoes matter more than gear. Bring what you have to the first session and I'll check the fit.`;
  if (/tournament|competition|compete|league|match|event/.test(text)) return `Love that. Add it to Competitions in your app so we can plan backwards from the date. I'll build the last few weeks around the shots you'll need most.`;
  if (/video|film|record|footage|send you/.test(text)) return `Yes, please. Upload it under Videos and tick "Let my coaches see this". I'll watch it and give you one or two things to fix first.`;
  if (/level|progress|improv|how am i|getting better|ready/.test(text)) return `You're working toward ${Number(student.target).toFixed(1)}, and the biggest gains will come from consistent practice on your ${mainSkill}. I'll update your level as soon as I see it in a session.`;
  if (skillKey) return `${SKILL_CUES[skillKey]} ${DRILLS[skillKey].text} Want me to add it to your plan?`;
  if (/thank|thanks|great|perfect|sounds good|awesome|cool|\bok(ay)?\b/.test(text)) return `Anytime! See you on court. Bring water and your usual ${student.sport === 'pickleball' ? 'paddle' : 'racket'}.`;
  if (/^(hi|hello|hey|yo)\b/.test(text)) return `Hi! Good to hear from you. What would you like to work on, or do you want to book a session?`;
  const snippet = raw.split(/\s+/).slice(0, 8).join(' ');
  return `On "${snippet}${raw.split(/\s+/).length > 8 ? '…' : ''}": good question. Short answer, it depends on your ${mainSkill} right now. Send me a short video and I'll give you a clear answer, or ask me to book a session and we'll cover it on court.`;
}

function mergeRoles(list) {
  const out = [];
  list.forEach((m) => {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n' + m.content;
    else out.push({ ...m });
  });
  return out;
}

// What the coach knows about this student right now, so replies can refer to the real plan, sessions and events.
function coachContext(coach, thread, student) {
  const acc = state.accounts[thread.student] || {};
  const day = (ts) => new Date(ts).toLocaleString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const drills = (acc.inbox || []).filter((i) => i.kind === 'drill').slice(0, 6).map((i) => `${i.title} (${i.done ? 'done' : i.due ? 'due ' + day(i.due) : 'to do'})`);
  const sessions = (thread.sessions || []).filter((x) => !x.done && x.when > Date.now()).map((x) => `${day(x.when)}${x.status === 'requested' ? ' (requested, not yet confirmed)' : ''}`);
  const comps = (student.comps || []).filter((c) => c.status !== 'played').map((c) => (typeof compById === 'function' && compById(c.id) ? compById(c.id).name : c.name) + ' (' + c.status + ')');
  return [
    `Today is ${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
    `Student: ${nameOf(thread.student)}. ${studentFacts(student)}`,
    `Their request:\n${answersToText(thread.answers)}`,
    `Your availability: ${coach.avail.map((a) => AVAIL[a]).join(', ')}. Your rate: $${coach.pricePerHour}/hr. You teach: ${coach.specialties.map((k) => SKILLS[k]).join(', ')}.`,
    `Their drills so far: ${drills.length ? drills.join('; ') : 'none yet'}.`,
    `Upcoming sessions with you: ${sessions.length ? sessions.join('; ') : 'none booked'}.`,
    `Their competitions: ${comps.length ? comps.join('; ') : 'none'}.`,
  ].join('\n');
}

// Local development only: on localhost, questions can be answered by a person (or by Claude Code) through dev/server.py.
// If nobody is listening, this returns null straight away and the normal path below runs.
async function coachViaBridge(coach, thread, student, isFirst, lastStudentText) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return null;
  try {
    const status = await fetch('/api/bridge-status').then((r) => r.json());
    if (!status.listening) return null;
    const id = 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await fetch('/api/coach-request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id, isFirst, last: lastStudentText || '(new request: see the briefing)',
        coach: { name: coach.name, persona: coach.persona },
        context: coachContext(coach, thread, student),
        history: thread.messages.map((m) => ({ from: m.from, text: m.text })),
      }),
    });
    for (let i = 0; i < 120; i++) {
      await wait(1500);
      const res = await fetch('/api/coach-reply?id=' + id);
      if (res.status === 200) return (await res.json()).text;
    }
  } catch (err) {
    console.warn('Reply bridge unavailable:', err);
  }
  return null;
}

async function coachReply(coach, thread, student, isFirst, lastStudentText) {
  if (!aiKey()) {
    const viaBridge = await coachViaBridge(coach, thread, student, isFirst, lastStudentText);
    if (viaBridge) return { text: viaBridge, source: 'bridge' };
    await wait(1200);
    return { text: scriptedReply(coach, thread, student, isFirst, lastStudentText), source: 'scripted' };
  }
  try {
    const history = [
      { role: 'user', content: `[New student request]\nBriefing: ${thread.briefing ? thread.briefing.text : ''}` },
      ...thread.messages.map((m) => ({ role: m.from === 'coach' ? 'assistant' : 'user', content: m.text })),
    ];
    const text = await callClaude({
      system: `You are ${coach.name}, a ${coach.sports.join(' and ')} coach in the Greater Toronto Area. Your style: ${coach.persona}

Facts you know:
${coachContext(coach, thread, student)}

How to reply:
- Read the student's LAST message carefully and answer exactly what they asked, in your first sentence.
- Use only the facts above. Never invent prices, times outside your availability, results or credentials.
- If they want to book, suggest 2 specific days within your availability and tell them to request the slot in the Calendar tab so you can confirm it.
- If they ask a technical question, give one or two concrete coaching cues, tied to their level.
- If they mention pain or injury, tell them to rest and see a professional before training.
- If they mention a competition, help them plan backwards from its date.
- If this is your first reply to a new request, say what the two of you will work on (based on their skills and goal). The app adds a pay-here button right after your message, so do not ask them to book.
- 1 to 4 friendly sentences, plain text, no lists or markdown. Never say you are an AI.`,
      messages: mergeRoles(history),
      maxTokens: 300,
    });
    return { text, source: 'ai' };
  } catch (err) {
    console.warn('AI coach reply failed, using script:', err);
    await wait(800);
    return { text: scriptedReply(coach, thread, student, isFirst, lastStudentText), source: 'scripted' };
  }
}

// ---------- certificate check ----------

const CERT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const CERT_MAX_BYTES = 5 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function checkCertificate(file, coach) {
  if (!CERT_TYPES.includes(file.type)) return { approved: false, reason: 'Please upload a PNG, JPG, WebP, or PDF file.', source: 'validation' };
  if (file.size > CERT_MAX_BYTES) return { approved: false, reason: 'That file is over 5 MB. Please upload a smaller one.', source: 'validation' };

  const demo = async () => {
    await wait(3000);
    return { approved: true, reason: 'Demo mode: the file was accepted but not actually verified.', source: 'demo' };
  };
  if (!aiKey()) return demo();

  try {
    const data = await fileToBase64(file);
    const block = file.type === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: file.type, data } }
      : { type: 'image', source: { type: 'base64', media_type: file.type, data } };
    const raw = await callClaude({
      system: 'You review uploaded coaching certificates for a tennis and pickleball coaching marketplace. Reply with JSON only.',
      messages: [{
        role: 'user',
        content: [
          block,
          { type: 'text', text: `Is this a plausible tennis or pickleball coaching certification (for example Tennis Canada, PTR, USPTA, IPTPA, or PPR) for a coach named "${coach.name}"? Reply ONLY with JSON: {"verdict":"approved" or "needs_review","reason":"one short sentence"}.` },
        ],
      }],
      maxTokens: 150,
    });
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return { approved: parsed.verdict === 'approved', reason: parsed.reason || '', source: 'ai' };
  } catch (err) {
    console.warn('AI certificate check failed, using demo mode:', err);
    return demo();
  }
}
