export const CAMPAIGN_START = new Date('2026-07-11T00:00:00-04:00');
export const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export const EVENTS = [
  { cycleIndex: 0, name: 'Lanzamiento', emoji: '🚀', desc: 'Registro y tutorial', game: null },
  { cycleIndex: 1, name: 'Red Light', emoji: '🚦', desc: 'Solo mueve en verde', game: 'RED_LIGHT' },
  { cycleIndex: 2, name: 'Honeycomb', emoji: '🍯', desc: 'Precisión sin romper', game: 'HONEYCOMB' },
  { cycleIndex: 3, name: 'Marbles 1v1', emoji: '🔮', desc: 'Duelo de canicas', game: 'DDAKJI' },
  { cycleIndex: 4, name: 'Glass Bridge', emoji: '🌉', desc: 'Memoria y suerte', game: 'GLASS_BRIDGE' },
  { cycleIndex: 5, name: 'Gran Final', emoji: '🏆', desc: '29 de agosto — retos en vivo', game: 'FINALE' }
] as const;

export const CHEST_CLUES = [
  'Pista 1: El premio se come 🍔',
  'Pista 2: Los que menos puntos tengan pagan más 😈',
  'Pista 3: Habrá traiciones reveladas 💀',
  'Pista 4: Mujeres vs hombres en el reto final ⚔️',
  'Pista 5: El admin elige el castigo del perdedor 👑'
];

export function getChallengeDate(): Date {
  return new Date(process.env.CHALLENGE_DATE || '2026-08-29T20:00:00-04:00');
}

export function getEventCycle(now = Date.now()) {
  const elapsed = now - CAMPAIGN_START.getTime();
  const cycleIndex = Math.max(0, Math.floor(elapsed / TEN_DAYS_MS));
  const currentEventStart = new Date(CAMPAIGN_START.getTime() + cycleIndex * TEN_DAYS_MS);
  const nextEventAt = new Date(CAMPAIGN_START.getTime() + (cycleIndex + 1) * TEN_DAYS_MS);
  const eventEndsAt = new Date(nextEventAt.getTime());
  const event = EVENTS[Math.min(cycleIndex, EVENTS.length - 1)];
  const hoursUntilNext = Math.max(0, (nextEventAt.getTime() - now) / 3600000);
  const isEventActive = now >= currentEventStart.getTime() && now < eventEndsAt.getTime();
  return {
    cycleIndex,
    currentEventStart,
    nextEventAt,
    eventEndsAt,
    event,
    challengeDate: getChallengeDate(),
    isEventActive,
    hoursUntilNext,
    daysUntilChallenge: Math.max(0, Math.ceil((getChallengeDate().getTime() - now) / 86400000))
  };
}

export function getBribeOffer(cycleIndex: number) {
  const hour = new Date().getHours();
  const tiers = [
    { minHour: 0, points: 50, penalty: 'Pierdes 1 voto' },
    { minHour: 6, points: 150, penalty: 'No puedes traicionar hoy' },
    { minHour: 12, points: 300, penalty: 'Revelas tu próximo voto' },
    { minHour: 18, points: 500, penalty: 'El grupo elige tu penalización' }
  ];
  let tier = tiers[0];
  for (const t of tiers) {
    if (hour >= t.minHour) tier = t;
  }
  return { ...tier, cycleIndex };
}
