// Fictional coaches and constants. No real people or endorsements.

const SKILLS = {
  serve: 'Serve',
  forehand: 'Forehand',
  backhand: 'Backhand',
  volley: 'Volley',
  smash: 'Smash',
  return: 'Return',
  footwork: 'Footwork',
};

// Skill levels, from complete beginner up to competitive.
const LEVELS = [
  { v: 1, label: 'Never played', desc: 'I have never held a racket, or I am just getting started.' },
  { v: 1.5, label: 'Learning the basics', desc: 'I can hit a few balls, but rallies are very short.' },
  { v: 2, label: 'Beginner', desc: 'I know the rules and can rally a little.' },
  { v: 2.5, label: 'Improving beginner', desc: 'I can keep a short rally and am working on direction.' },
  { v: 3, label: 'Intermediate', desc: 'I play regularly and can keep a rally going.' },
  { v: 3.5, label: 'Solid intermediate', desc: 'I hit with control and some power.' },
  { v: 4, label: 'Advanced', desc: 'Consistent strokes, and I play matches.' },
  { v: 4.5, label: 'Strong advanced', desc: 'I win most club matches.' },
  { v: 5, label: 'Competitive', desc: 'I compete in tournaments or leagues.' },
];

function levelInfo(v) {
  return LEVELS.find((l) => l.v === v);
}

function levelName(v) {
  const l = levelInfo(v);
  return `${Number(v).toFixed(1)} ${l ? l.label : ''}`.trim();
}

function levelIcon(v) {
  return v < 2 ? '🌱' : v < 3 ? '🙂' : v < 4 ? '🎯' : v < 5 ? '🔥' : '🏆';
}

const SPORTS = { tennis: 'Tennis', pickleball: 'Pickleball' };
const LANGUAGES = ['English', 'French', 'Spanish', 'Mandarin', 'Hindi', 'Russian'];
const AREAS = ['Toronto', 'Mississauga', 'Markham', 'Vaughan', 'Richmond Hill', 'Brampton', 'Oakville'];
const AVAIL = { weekdays: 'Weekdays', evenings: 'Evenings', weekends: 'Weekends' };
const GOALS = ['Reach my target level', 'Prepare for a tournament', 'Play more confidently', 'Stay active and enjoy the sport'];
const TIMEFRAMES = [[4, '⚡', '1 month'], [12, '📅', '3 months'], [26, '🗓️', '6 months'], [52, '🏆', '1 year']];
const DISTANCES = [5, 15, 30, 50];

function timeframeLabel(weeks) {
  const t = TIMEFRAMES.find(([w]) => w === weeks);
  return t ? t[2] : `${weeks} weeks`;
}

// ---------- locations (approximate distances between Greater Toronto Area cities, in km) ----------

const AREA_KM = {
  'Toronto|Mississauga': 25, 'Toronto|Markham': 30, 'Toronto|Vaughan': 25, 'Toronto|Richmond Hill': 30, 'Toronto|Brampton': 40, 'Toronto|Oakville': 40,
  'Mississauga|Markham': 50, 'Mississauga|Vaughan': 30, 'Mississauga|Richmond Hill': 45, 'Mississauga|Brampton': 15, 'Mississauga|Oakville': 15,
  'Markham|Vaughan': 15, 'Markham|Richmond Hill': 10, 'Markham|Brampton': 45, 'Markham|Oakville': 65,
  'Vaughan|Richmond Hill': 15, 'Vaughan|Brampton': 25, 'Vaughan|Oakville': 50,
  'Richmond Hill|Brampton': 40, 'Richmond Hill|Oakville': 60,
  'Brampton|Oakville': 25,
};

function areaKm(a, b) {
  if (a === b) return 5;
  return AREA_KM[`${a}|${b}`] ?? AREA_KM[`${b}|${a}`] ?? 99;
}

const POSTAL_PREFIXES = [
  ['M', 'Toronto'], ['L5', 'Mississauga'], ['L4Z', 'Mississauga'], ['L3R', 'Markham'], ['L3P', 'Markham'], ['L6E', 'Markham'],
  ['L4K', 'Vaughan'], ['L4L', 'Vaughan'], ['L6A', 'Vaughan'], ['L4B', 'Richmond Hill'], ['L4C', 'Richmond Hill'], ['L4E', 'Richmond Hill'], ['L4S', 'Richmond Hill'],
  ['L6P', 'Brampton'], ['L6R', 'Brampton'], ['L6S', 'Brampton'], ['L6T', 'Brampton'], ['L6V', 'Brampton'], ['L6W', 'Brampton'], ['L6X', 'Brampton'], ['L6Y', 'Brampton'], ['L6Z', 'Brampton'],
  ['L6H', 'Oakville'], ['L6J', 'Oakville'], ['L6K', 'Oakville'], ['L6L', 'Oakville'], ['L6M', 'Oakville'],
];

// A city name or a postal code in the Greater Toronto Area -> one of AREAS, or null.
function resolveArea(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const byName = AREAS.find((a) => t.toLowerCase().includes(a.toLowerCase()));
  if (byName) return byName;
  const postal = t.toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]\d[A-Z]/.test(postal)) return null;
  const hit = POSTAL_PREFIXES.find(([prefix]) => postal.startsWith(prefix));
  return hit ? hit[1] : null;
}

// ---------- coaches ----------

const COACHES = [
  { id: 't1', name: 'Maya Torres', sports: ['tennis'], languages: ['English', 'Spanish'], area: 'Toronto', pricePerHour: 65, rating: 4.9, specialties: ['serve', 'forehand'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Former college player. I turn a shaky serve into a reliable one in a few weeks.', persona: 'I like to make the serve automatic first, then build points around it.' },
  { id: 't2', name: 'Dev Patel', sports: ['tennis'], languages: ['English', 'Hindi'], area: 'Mississauga', pricePerHour: 55, rating: 4.7, specialties: ['backhand', 'return', 'footwork'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Footwork specialist. I build court movement from zero.', persona: 'Movement first. Good footwork fixes half of your strokes.' },
  { id: 't3', name: 'Lena Park', sports: ['tennis'], languages: ['English', 'Mandarin'], area: 'Markham', pricePerHour: 80, rating: 4.8, specialties: ['volley', 'smash'], avail: ['weekends'], fastTrack: false, bio: 'Net game and doubles. Works best with a longer timeline.', persona: 'I teach players to finish points at the net with confidence.' },
  { id: 't4', name: 'Sam Okafor', sports: ['tennis'], languages: ['English', 'French'], area: 'Toronto', pricePerHour: 45, rating: 4.5, specialties: ['footwork', 'forehand', 'return'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Budget-friendly and available most weekdays. Good for quick progress.', persona: 'Short, focused sessions. We fix one thing at a time.' },
  { id: 'p1', name: 'Jordan Reyes', sports: ['pickleball'], languages: ['English', 'Spanish'], area: 'Vaughan', pricePerHour: 50, rating: 4.8, specialties: ['serve', 'return'], avail: ['weekdays', 'weekends'], fastTrack: true, bio: 'Serve and return practice that wins points early in games.', persona: 'Win the first three shots of every rally. That is where games are decided.' },
  { id: 'p2', name: 'Chloe Nguyen', sports: ['pickleball'], languages: ['English', 'French'], area: 'Toronto', pricePerHour: 60, rating: 4.9, specialties: ['volley', 'smash', 'footwork'], avail: ['evenings'], fastTrack: true, bio: 'Kitchen-line play and overhead control for competitive doubles.', persona: 'Own the kitchen line and the rest of the game gets easier.' },
  { id: 'p3', name: 'Ravi Shah', sports: ['pickleball'], languages: ['English', 'Hindi'], area: 'Richmond Hill', pricePerHour: 40, rating: 4.4, specialties: ['backhand', 'forehand'], avail: ['weekends'], fastTrack: true, bio: 'Affordable weekend sessions. Great for first-timers.', persona: 'Relaxed and patient. We build clean, repeatable strokes.' },
  { id: 'p4', name: 'Hana Mori', sports: ['pickleball'], languages: ['English', 'Mandarin'], area: 'Mississauga', pricePerHour: 75, rating: 4.7, specialties: ['serve', 'smash', 'volley'], avail: ['weekdays'], fastTrack: false, bio: 'Tournament-level preparation. Works best with at least a few months.', persona: 'Good routines, patterns, and staying calm under pressure.' },
  { id: 'b1', name: 'Alex Kim', sports: ['tennis', 'pickleball'], languages: ['English', 'Russian'], area: 'Toronto', pricePerHour: 70, rating: 4.6, specialties: ['serve', 'volley', 'footwork'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Coaches both sports. Ideal if you play both or want to switch.', persona: 'Racket skills transfer. I show you what carries over between sports.' },
  { id: 't5', name: 'Priya Nair', sports: ['tennis'], languages: ['English', 'Hindi'], area: 'Brampton', pricePerHour: 48, rating: 4.6, specialties: ['forehand', 'backhand'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Patient with beginners. We build a reliable rally in a month.', persona: 'Rally first, power later. Consistency wins early matches.' },
  { id: 't6', name: 'Marc Tremblay', sports: ['tennis'], languages: ['English', 'French'], area: 'Oakville', pricePerHour: 72, rating: 4.8, specialties: ['serve', 'smash'], avail: ['weekdays', 'weekends'], fastTrack: false, bio: 'Ex-provincial competitor. Big serve, clean overheads.', persona: 'We train the serve like a routine: same toss, same breath, every time.' },
  { id: 't7', name: 'Elena Volkova', sports: ['tennis'], languages: ['English', 'Russian'], area: 'Toronto', pricePerHour: 85, rating: 4.9, specialties: ['backhand', 'return', 'footwork'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'High-performance junior and adult coach. Matchplay focused.', persona: 'Patterns and tactics. I teach you to read the point before it happens.' },
  { id: 't8', name: 'Carlos Mendez', sports: ['tennis'], languages: ['English', 'Spanish'], area: 'Vaughan', pricePerHour: 52, rating: 4.5, specialties: ['forehand', 'volley'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Fun, high-energy sessions for adults returning to the sport.', persona: 'Enjoy the game first. Fitness and technique follow.' },
  { id: 't9', name: 'Wei Zhang', sports: ['tennis'], languages: ['English', 'Mandarin'], area: 'Richmond Hill', pricePerHour: 60, rating: 4.7, specialties: ['serve', 'return', 'footwork'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Technical coach. Video analysis of every stroke.', persona: 'Small technical fixes beat big changes. We film, review and repeat.' },
  { id: 't10', name: 'Aisha Khan', sports: ['tennis'], languages: ['English', 'Hindi'], area: 'Markham', pricePerHour: 42, rating: 4.4, specialties: ['forehand', 'footwork'], avail: ['weekends', 'evenings'], fastTrack: true, bio: 'Affordable lessons for students and new players.', persona: 'Simple drills, lots of reps, clear goals each week.' },
  { id: 't11', name: 'Julien Roy', sports: ['tennis'], languages: ['English', 'French'], area: 'Mississauga', pricePerHour: 68, rating: 4.7, specialties: ['volley', 'smash', 'serve'], avail: ['weekdays'], fastTrack: false, bio: 'Doubles specialist. Net play and communication.', persona: 'Own the net and your partner will love you.' },
  { id: 't12', name: 'Sofia Alvarez', sports: ['tennis'], languages: ['English', 'Spanish'], area: 'Toronto', pricePerHour: 58, rating: 4.6, specialties: ['backhand', 'forehand'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Clay-court style. Heavy topspin and patience.', persona: 'Topspin gives you margin. Margin gives you confidence.' },
  { id: 't13', name: 'Daniel Cho', sports: ['tennis'], languages: ['English', 'Mandarin'], area: 'Brampton', pricePerHour: 75, rating: 4.8, specialties: ['serve', 'forehand', 'return'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Former university captain. Preps players for league and tournaments.', persona: 'Compete the way you train. We rehearse pressure points.' },
  { id: 't14', name: 'Natasha Petrov', sports: ['tennis'], languages: ['English', 'Russian'], area: 'Mississauga', pricePerHour: 65, rating: 4.5, specialties: ['footwork', 'backhand'], avail: ['weekdays', 'weekends'], fastTrack: true, bio: 'Movement and fitness for tennis. Great for beginners to intermediate.', persona: 'Good movement turns hard shots into easy ones.' },
  { id: 't15', name: 'Omar Haddad', sports: ['tennis'], languages: ['English', 'French'], area: 'Markham', pricePerHour: 50, rating: 4.4, specialties: ['serve', 'forehand'], avail: ['evenings'], fastTrack: true, bio: 'Friendly coach with a focus on confident serving.', persona: 'Slow down, breathe, and trust the motion.' },
  { id: 't16', name: 'Grace Lee', sports: ['tennis'], languages: ['English', 'Mandarin'], area: 'Oakville', pricePerHour: 78, rating: 4.9, specialties: ['volley', 'smash', 'return'], avail: ['weekends'], fastTrack: false, bio: 'Adult league coach. Strategy for 3.5 to 4.5 players.', persona: 'Smart tennis: where to hit, and why.' },
  { id: 'p5', name: 'Luis Ortega', sports: ['pickleball'], languages: ['English', 'Spanish'], area: 'Toronto', pricePerHour: 45, rating: 4.6, specialties: ['serve', 'return'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Beginner friendly. Get game-ready in a few sessions.', persona: 'Learn the rules, the kitchen, and the third-shot drop quickly.' },
  { id: 'p6', name: 'Mei Chen', sports: ['pickleball'], languages: ['English', 'Mandarin'], area: 'Markham', pricePerHour: 58, rating: 4.8, specialties: ['volley', 'smash', 'footwork'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Doubles strategy and dinking. Top local 4.0 player.', persona: 'Soft hands at the kitchen win more points than power.' },
  { id: 'p7', name: 'Arjun Mehta', sports: ['pickleball'], languages: ['English', 'Hindi'], area: 'Brampton', pricePerHour: 38, rating: 4.3, specialties: ['forehand', 'backhand'], avail: ['weekends'], fastTrack: true, bio: 'Budget lessons and group-friendly drills.', persona: 'Fun reps and friendly games every session.' },
  { id: 'p8', name: 'Camille Dubois', sports: ['pickleball'], languages: ['English', 'French'], area: 'Oakville', pricePerHour: 66, rating: 4.7, specialties: ['return', 'volley', 'serve'], avail: ['weekdays', 'weekends'], fastTrack: false, bio: 'Tournament preparation for 3.5+ players.', persona: 'Consistency under pressure. We practice the points that decide games.' },
  { id: 'p9', name: 'Ivan Sokolov', sports: ['pickleball'], languages: ['English', 'Russian'], area: 'Vaughan', pricePerHour: 55, rating: 4.5, specialties: ['smash', 'footwork'], avail: ['evenings'], fastTrack: true, bio: 'Athletic coach. Overheads, speed-ups and court coverage.', persona: 'Be ready, be balanced, then be aggressive.' },
  { id: 'p10', name: 'Isabella Cruz', sports: ['pickleball'], languages: ['English', 'Spanish'], area: 'Mississauga', pricePerHour: 48, rating: 4.6, specialties: ['serve', 'volley'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Warm, structured lessons for new and returning players.', persona: 'Build good habits early. They save you hours later.' },
  { id: 'p11', name: 'Kevin Wu', sports: ['pickleball'], languages: ['English', 'Mandarin'], area: 'Richmond Hill', pricePerHour: 62, rating: 4.7, specialties: ['backhand', 'return', 'volley'], avail: ['weekends', 'evenings'], fastTrack: true, bio: 'Third-shot drop and reset specialist.', persona: 'Control the pace. Make the other team make the mistakes.' },
  { id: 'p12', name: 'Anita Desai', sports: ['pickleball'], languages: ['English', 'Hindi'], area: 'Toronto', pricePerHour: 52, rating: 4.5, specialties: ['forehand', 'serve'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Great with older beginners and social players.', persona: 'Relaxed, clear, and no pressure. Just better pickleball.' },
  { id: 'b2', name: 'Nina Fischer', sports: ['tennis', 'pickleball'], languages: ['English', 'French'], area: 'Vaughan', pricePerHour: 64, rating: 4.6, specialties: ['serve', 'volley', 'return'], avail: ['evenings', 'weekends'], fastTrack: true, bio: 'Coaches both sports. Helps tennis players switch to pickleball.', persona: 'Your tennis habits help and hurt. I show you which is which.' },
  { id: 'b3', name: 'Tomas Rivera', sports: ['tennis', 'pickleball'], languages: ['English', 'Spanish'], area: 'Mississauga', pricePerHour: 56, rating: 4.5, specialties: ['forehand', 'footwork', 'smash'], avail: ['weekdays', 'evenings'], fastTrack: true, bio: 'Racket sports all-rounder. Fitness and fundamentals.', persona: 'Fundamentals transfer. Learn once, use everywhere.' },
  { id: 'b4', name: 'Yuki Tanaka', sports: ['tennis', 'pickleball'], languages: ['English', 'Mandarin'], area: 'Markham', pricePerHour: 70, rating: 4.8, specialties: ['backhand', 'serve', 'return'], avail: ['weekends', 'weekdays'], fastTrack: false, bio: 'Technique coach for both sports. Filmed feedback after each session.', persona: 'Clean mechanics make everything else easier.' },
];

// ---------- practice drills ----------


const DRILLS = {
  serve: { title: 'Serve placement', text: 'Hit 50 serves into the service box, aiming at the corners. Keep the same toss every time.' },
  forehand: { title: 'Forehand consistency', text: 'Rally 20 balls cross-court with a partner, then add one down-the-line shot.' },
  backhand: { title: 'Backhand technique', text: 'Do 30 slow backhand feeds, focusing on turning your shoulders. Then rally 20 cross-court.' },
  volley: { title: 'Volley control', text: 'Hit 40 volleys against a wall, keeping the ball low and controlled.' },
  smash: { title: 'Overhead placement', text: 'After a lob, hit 10 overheads to the deep corners and 10 to the middle.' },
  return: { title: 'Return depth', text: 'Return 15 serves deep to the baseline and 15 short, towards the net.' },
  footwork: { title: 'Court movement', text: 'Move from the center to each corner and back to ready position in two steps. 10 times each side.' },
};
