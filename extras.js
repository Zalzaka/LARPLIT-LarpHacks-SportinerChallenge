// ---------- coach comparison, payments (demo) and the path to your first match ----------

// ===== coach comparison =====

// 0-100 fit: schedule, focus skill, timeframe, price headroom and distance.
function matchScore(c) {
  const s = stu();
  const avail = s.avail === 'Any' || c.avail.includes(s.avail) ? 25 : 8;
  const skill = s.skill === 'Any' || c.specialties.includes(s.skill) ? 25 : 8;
  const time = s.weeks > 4 || c.fastTrack ? 15 : 4;
  const price = s.maxPrice >= 999 ? 15 : Math.round(15 * Math.min(1, 0.6 + (s.maxPrice - c.pricePerHour) / s.maxPrice));
  const dist = Math.round(20 * Math.max(0, 1 - kmAway(c) / (s.distance * 1.5)));
  return Math.min(99, avail + skill + time + price + dist + (c.rating ? Math.round((c.rating - 4) * 5) : 0));
}

const COMPARE_MAX = 3;

function compareIds() {
  return (state.ui.compare || []).filter((id) => coachById(id));
}

function toggleCompare(id) {
  const list = compareIds();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  if (next.length > COMPARE_MAX) return toast(`Compare up to ${COMPARE_MAX} coaches`);
  go({ compare: next, preview: null });
}

function compareBar() {
  const list = compareIds();
  if (!list.length) return '';
  return `<div class="cmpbar"><span class="small">${list.map((id) => esc(coachById(id).name.split(' ')[0])).join(' · ')}</span>
    <span><button class="link-btn" onclick="go({compare:[]})">Clear</button>
    <button class="btn" style="width:auto;padding:8px 14px" onclick="${list.length > 1 ? 'go({showCompare:true})' : "toast('Pick one more coach to compare')"}">Compare (${list.length})</button></span></div>`;
}

function compareModal() {
  const coaches = compareIds().map((id) => coachById(id));
  if (coaches.length < 2) return '';
  const best = (fn, pick) => { const vals = coaches.map(fn); const target = pick(...vals); return vals.map((v) => v === target); };
  const rows = [
    ['Match', (c) => matchScore(c), (v) => v + '%', Math.max],
    ['Price per hour', (c) => c.pricePerHour, (v) => '$' + v, Math.min],
    ['Rating', (c) => c.rating || 0, (v) => (v ? '★ ' + v : 'New'), Math.max],
    ['Distance', (c) => kmAway(c), (v) => v + ' km', Math.min],
  ];
  const text = (label, fn) => `<tr><th>${label}</th>${coaches.map((c) => `<td>${fn(c)}</td>`).join('')}</tr>`;
  return `<div class="backdrop" onclick="if(event.target===this) go({showCompare:false})">
    <div class="modal" role="dialog" aria-label="Compare coaches" style="max-width:640px">
      <div class="row between"><h3 class="h2">Compare coaches</h3><button class="pop-x" onclick="go({showCompare:false})" aria-label="Close">✕</button></div>
      <div style="overflow-x:auto"><table class="cmp mt2">
        <tr><th></th>${coaches.map((c) => `<td class="cmp-head">${avatar(c, 44)}<b>${esc(c.name)}</b></td>`).join('')}</tr>
        ${rows.map(([label, fn, fmt, pick]) => { const flags = best(fn, pick); return `<tr><th>${label}</th>${coaches.map((c, i) => `<td class="${flags[i] ? 'best' : ''}">${fmt(fn(c))}${flags[i] ? ' ✓' : ''}</td>`).join('')}</tr>`; }).join('')}
        ${text('Teaches', (c) => c.specialties.map((s) => SKILLS[s]).join(', '))}
        ${text('Languages', (c) => esc(c.languages.join(', ')))}
        ${text('Available', (c) => c.avail.map((a) => AVAIL[a]).join(', '))}
        ${text('Quick prep', (c) => (c.fastTrack ? 'Yes' : 'Needs 3+ months'))}
        ${text('Sports', (c) => sportLabel(c))}
        <tr><th></th>${coaches.map((c) => `<td><button class="btn" onclick="go({showCompare:false}); previewCoach('${c.id}')">Choose</button></td>`).join('')}</tr>
      </table></div>
      <p class="muted tiny mt2">✓ marks the best value in each row.</p>
    </div></div>`;
}

// ===== payments (demo: no real money moves, no real card is ever entered) =====

const DEMO_CARD = 'Demo card •••• 4242';

function sessionPriceFor(coachId) {
  const c = coachById(coachId);
  return c ? c.pricePerHour : 0;
}

function paymentsOf(email) {
  return (state.accounts[email] && state.accounts[email].payments) || [];
}

// Everything paid to one coach, from every student account.
function earningsOf(coachEmail) {
  const id = coachIdOf(coachEmail);
  return Object.values(state.accounts).flatMap((a) => (a.payments || []).filter((p) => p.coachId === id).map((p) => ({ ...p, student: a.email })));
}

function openPay(coachId, sessionId) {
  go({ pay: { coachId, sessionId } });
}

function payModal() {
  const p = state.ui.pay;
  if (!p) return '';
  const coach = coachById(p.coachId);
  const t = myThread(p.coachId);
  const x = t && (t.sessions || []).find((y) => y.id === p.sessionId);
  if (!coach || !x) return '';
  const price = coach.pricePerHour;
  return `<div class="backdrop" onclick="if(event.target===this) go({pay:null})">
    <div class="modal" role="dialog" aria-label="Pay ${esc(coach.name)}">
      <div class="row between"><h3 class="h2">Pay ${esc(coach.name.split(' ')[0])}</h3><button class="pop-x" onclick="go({pay:null})" aria-label="Close">✕</button></div>
      <p class="muted small mt1">Session on ${fmtTime(x.when)}${x.note ? ' · ' + esc(x.note) : ''}</p>
      <div class="card mt2"><div class="row between"><span>Session (1 hour)</span><b>$${price}</b></div>
        <label class="field mt2"><span class="lbl">Add a tip</span><select id="pay-tip" class="input" onchange="updatePayTotal(${price})"><option value="0">No tip</option><option value="5">$5</option><option value="10">$10</option></select></label>
        <div class="row between mt2"><span class="h3">Total</span><b class="h3" id="pay-total">$${price}</b></div></div>
      <label class="field mt2"><span class="lbl">Pay with</span><select class="input"><option>${DEMO_CARD}</option></select></label>
      <p class="tiny mt1" style="color:var(--warn)">Demo mode: no real money moves and no card details are collected.</p>
      <button class="btn mt2" onclick="confirmPay()">Pay $<span id="pay-total-btn">${price}</span></button>
    </div></div>`;
}

function updatePayTotal(price) {
  const total = price + Number($('pay-tip').value);
  $('pay-total').textContent = '$' + total;
  $('pay-total-btn').textContent = total;
}

function confirmPay() {
  const p = state.ui.pay;
  const coach = coachById(p.coachId);
  const t = myThread(p.coachId);
  const x = (t.sessions || []).find((y) => y.id === p.sessionId);
  if (!x || x.paid) return go({ pay: null });
  const tip = Number($('pay-tip').value);
  const amount = coach.pricePerHour + tip;
  const a = me();
  a.payments = a.payments || [];
  const id = 'pay' + Date.now().toString(36);
  a.payments.unshift({ id, ts: Date.now(), coachId: p.coachId, coachName: coach.name, amount, tip, sessionId: x.id, desc: `Session ${fmtTime(x.when)}`, method: DEMO_CARD });
  x.paid = id;
  t.messages.push({ from: 'student', text: `Paid $${amount} for our session on ${fmtTime(x.when)}${tip ? ` (includes a $${tip} tip)` : ''}. Thank you!`, ts: Date.now(), auto: 'payment' });
  saveState();
  go({ pay: null });
  toast(`Paid $${amount} to ${coach.name.split(' ')[0]}`);
}

// ----- pay from chat: a fake card form that accepts anything (demo only) -----

function openIntroPay(coachId, msgTs) {
  go({ introPay: { coachId, msgTs } });
}

function introPayModal() {
  const p = state.ui.introPay;
  if (!p) return '';
  const coach = coachById(p.coachId);
  const m = (myThread(p.coachId).messages || []).find((x) => x.ts === p.msgTs);
  if (!coach || !m) return '';
  return `<div class="backdrop" onclick="if(event.target===this) go({introPay:null})">
    <form class="modal" role="dialog" aria-label="Pay ${esc(coach.name)}" onsubmit="confirmIntroPay(event)">
      <div class="row between"><h3 class="h2">Pay ${esc(coach.name.split(' ')[0])}</h3><button type="button" class="pop-x" onclick="go({introPay:null})" aria-label="Close">✕</button></div>
      <div class="card mt2"><div class="row between"><span>${esc(m.payRequest.desc)}</span><b class="h3">$${m.payRequest.amount}</b></div></div>
      <label class="field mt2"><span class="lbl">Card number</span><input name="card" class="input" inputmode="numeric" autocomplete="off" placeholder="1234"></label>
      <label class="field mt2"><span class="lbl">PIN</span><input name="pin" class="input" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Any 4 digits"></label>
      <p class="tiny mt1" style="color:var(--warn)">Demo mode: type 1234 for the card and any 4 digits for the PIN. Nothing is checked and no real money moves.</p>
      <button class="btn mt2" type="submit">Pay $${m.payRequest.amount}</button>
    </form></div>`;
}

function confirmIntroPay(e) {
  e.preventDefault();
  const p = state.ui.introPay;
  const coach = coachById(p.coachId);
  const t = myThread(p.coachId);
  const m = t.messages.find((x) => x.ts === p.msgTs);
  if (!m || m.paid) return go({ introPay: null });
  const amount = m.payRequest.amount;
  const a = me();
  a.payments = a.payments || [];
  const id = 'pay' + Date.now().toString(36);
  a.payments.unshift({ id, ts: Date.now(), coachId: p.coachId, coachName: coach.name, amount, tip: 0, desc: m.payRequest.desc, method: 'Demo card' });
  m.paid = id;
  t.messages.push({ from: 'student', text: `Paid $${amount} for our first session. Thank you!`, ts: Date.now(), auto: 'payment' });
  saveState();
  go({ introPay: null });
  toast(`Paid $${amount} to ${coach.name.split(' ')[0]}`);
}

function receiptsCard() {
  const list = paymentsOf(session);
  const total = list.reduce((n, p) => n + p.amount, 0);
  return `<div class="card mt3"><div class="row between"><span class="h3">Payments</span><span class="muted small">Total $${total}</span></div>
    ${list.length ? list.map((p) => `<div class="row between mt2"><div><div class="small"><b>${esc(p.coachName)}</b></div><div class="muted tiny">${esc(p.desc)} · ${fmtDay(p.ts)}</div></div><b>$${p.amount}</b></div>`).join('') : '<p class="muted small mt1">No payments yet. Pay for a confirmed session from your Calendar.</p>'}
    <p class="muted tiny mt2">Demo mode: no real money moves.</p></div>`;
}

// ----- coach: earnings and payout -----

function coachEarnings() {
  const c = me().coach;
  const list = earningsOf(session).sort((x, y) => y.ts - x.ts);
  const earned = list.reduce((n, p) => n + p.amount, 0);
  const paidOut = (c.payouts || []).reduce((n, p) => n + p.amount, 0);
  const balance = earned - paidOut;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const month = list.filter((p) => p.ts >= monthStart).reduce((n, p) => n + p.amount, 0);
  const unpaid = coachThreads().flatMap((t) => (t.sessions || []).filter((s) => s.done && !s.paid)).length;
  const stat = (label, v) => `<div class="stat"><b>${v}</b><span>${label}</span></div>`;
  return `
    <div class="stats mt3" style="grid-template-columns:repeat(3,1fr)">${stat('Balance', '$' + balance)}${stat('This month', '$' + month)}${stat('Unpaid done', unpaid)}</div>
    <button class="btn mt2" ${balance > 0 ? '' : 'disabled'} onclick="withdraw(${balance})">Transfer $${balance} to my bank (demo)</button>
    <h3 class="h3 mt3">Payments received</h3>
    ${list.length ? list.map((p) => `<div class="listrow" style="cursor:default">${avatar({ id: p.student, name: nameOf(p.student) }, 40)}<div class="grow"><div class="h3">${esc(nameOf(p.student))}</div><div class="muted small">${esc(p.desc)} · ${fmtDay(p.ts)}${p.tip ? ` · includes $${p.tip} tip` : ''}</div></div><b>$${p.amount}</b></div>`).join('') : '<p class="muted small mt1">Nothing yet. Students pay from their calendar once you confirm a session.</p>'}
    ${(c.payouts || []).length ? `<h3 class="h3 mt3">Transfers to your bank</h3>${c.payouts.map((p) => `<div class="row between mt2"><span class="small">${fmtDay(p.ts)}</span><b>−$${p.amount}</b></div>`).join('')}` : ''}
    <p class="muted tiny mt3">Demo mode: no real money moves.</p>`;
}

function withdraw(amount) {
  const c = me().coach;
  c.payouts = c.payouts || [];
  c.payouts.unshift({ ts: Date.now(), amount });
  saveState();
  toast(`$${amount} sent to your bank (demo)`);
  render();
}

// ===== path to your first match (the point of the app) =====

function pathSteps() {
  const a = me();
  const threads = Object.values(state.threads).filter((t) => t.student === session && t.coachId);
  const sessions = threads.flatMap((t) => t.sessions || []);
  const comps = (stu().comps || []);
  return [
    ['Pick a coach', a.confirmed.length > 0, "openTab('coaches')", 'Find a coach'],
    ['Send your request', threads.some((t) => t.answers), "openTab('chat')", 'Open chat'],
    ['Book your first session', sessions.length > 0, "openTab('calendar')", 'Open calendar'],
    ['Finish your first drill', (a.inbox || []).some((i) => i.kind === 'drill' && i.done), "openTab('calendar')", 'Open calendar'],
    ['Register for an event', comps.some((e) => e.status === 'registered' || e.status === 'played'), "compView='find'; openTab('compete')", 'Find an event'],
    ['Play your first match', comps.some((e) => e.status === 'played'), "compView='mine'; openTab('compete')", 'My events'],
  ];
}

function pathCard() {
  const steps = pathSteps();
  const done = steps.filter((s) => s[1]).length;
  const next = steps.find((s) => !s[1]);
  return `<div class="card path"><div class="row between"><span class="h3">Your path to your first match</span><span class="muted small">${done}/${steps.length}</span></div>
    <div class="bar mt2"><i style="width:${Math.round((done / steps.length) * 100)}%"></i></div>
    <ol class="steps mt2">${steps.map(([label, ok]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${label}</li>`).join('')}</ol>
    ${next ? `<button class="btn mt2" onclick="${next[2]}">${next[3]}</button>` : '<p class="mt2"><b>You made it. Time to compete! 🏆</b></p>'}</div>`;
}

// The soonest event that suits the student's level and still accepts registrations.
function fastestEventBanner() {
  const s = stu();
  const taken = new Set((s.comps || []).map((e) => e.id));
  const pick = COMP_DEFS.filter((d) => d.sport === s.sport && !taken.has(d.id)).map((d) => compById(d.id))
    .filter((d) => d.deadlineTs >= startOfDay(Date.now()) && levelFit(d, s.level)[0] !== 'Too easy')
    .sort(byNearThenDate)[0];
  if (!pick) return '';
  const [fit] = levelFit(pick, s.level);
  return `<div class="brief mt3"><div class="label">Fastest way to compete</div>
    <p class="mt1"><b>${esc(pick.name)}</b> · ${fmtDay(pick.date)} (${countdown(pick.date).toLowerCase()}) · ${esc(pick.area)} · ${fit.toLowerCase()} for you</p>
    <p class="muted small mt1">Register by ${fmtDay(pick.deadlineTs)}. Your coach is told automatically and builds your prep plan.</p>
    <button class="btn mt2" onclick="openSignup('${pick.id}')">Sign up for this event</button></div>`;
}
