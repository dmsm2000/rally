import {
  CountryEntry,
  Destination,
  Player,
  WorldActivityItem
} from '../models';

/**
 * Static dataset acting as a stand-in for the future Supabase-backed tables.
 * Only `RallyDataService` should import this file; features must go through repositories.
 */
const IMG = 'assets';

export const ME: Player = {
  id: 'joao',
  name: 'João Silva',
  initials: 'JS',
  city: 'Porto',
  country: 'Portugal',
  flag: '🇵🇹',
  level: 'Intermediate',
  years: 6,
  frequency: 'Twice a week',
  format: 'Both',
  surface: 'Hard',
  availability: ['Weekday evenings', 'Sunday mornings'],
  distanceKm: 0,
  matchScore: 100,
  matchReason: "That's you.",
  bio: 'Play for the rally, stay for the coffee after. Always up for a hitting session in a new city — currently plotting a tennis trip through Spain.',
  stats: { wins: 67, matches: 124, courts: 23, countries: 7 },
  accent: 'lime',
  memberNumber: '000482',
  avatarSeed: 'joao',
  avatarStyle: 'lorelei'
};

export const PLAYERS: Player[] = [
  {
    id: 'maria',
    name: 'Maria Costa',
    initials: 'MC',
    city: 'Porto',
    country: 'Portugal',
    flag: '🇵🇹',
    level: 'Intermediate',
    years: 5,
    frequency: 'Twice a week',
    format: 'Singles',
    surface: 'Hard',
    availability: ['Weekday evenings'],
    distanceKm: 1.4,
    matchScore: 92,
    matchReason: 'Both play singles twice a week and prefer hard courts.',
    bio: 'Baseline grinder. Will chase every ball down until the sun goes.',
    stats: { wins: 41, matches: 78, courts: 12, countries: 3 },
    accent: 'lime',
    avatarSeed: 'maria',
    avatarStyle: 'notionists'
  },
  {
    id: 'pedro',
    name: 'Pedro Almeida',
    initials: 'PA',
    city: 'Matosinhos',
    country: 'Portugal',
    flag: '🇵🇹',
    level: 'Advanced',
    years: 11,
    frequency: '3–4 times a week',
    format: 'Both',
    surface: 'Clay',
    availability: ['Early mornings', 'Saturdays'],
    distanceKm: 6.2,
    matchScore: 84,
    matchReason: 'Similar availability, one level above — good stretch match.',
    bio: 'Ex-junior circuit. Loves clay, long points and a proper warm-up.',
    stats: { wins: 118, matches: 190, courts: 34, countries: 9 },
    accent: 'clay',
    avatarSeed: 'pedro',
    avatarStyle: 'open-peeps'
  },
  {
    id: 'ana',
    name: 'Ana Ferreira',
    initials: 'AF',
    city: 'Lisbon',
    country: 'Portugal',
    flag: '🇵🇹',
    level: 'Improver',
    years: 2,
    frequency: 'Once a week',
    format: 'Doubles',
    surface: 'Hard',
    availability: ['Weekends'],
    distanceKm: 274,
    matchScore: 71,
    matchReason: 'Doubles-first player in a city on your travel list.',
    bio: 'Doubles only. Here for the social side and the post-match pastéis.',
    stats: { wins: 12, matches: 30, courts: 6, countries: 2 },
    accent: 'cobalt',
    avatarSeed: 'ana',
    avatarStyle: 'thumbs'
  },
  {
    id: 'marc',
    name: 'Marc Puig',
    initials: 'MP',
    city: 'Barcelona',
    country: 'Spain',
    flag: '🇪🇸',
    level: 'Intermediate',
    years: 7,
    frequency: 'Twice a week',
    format: 'Both',
    surface: 'Clay',
    availability: ['Weekday evenings', 'Sunday mornings'],
    distanceKm: 1_120,
    matchScore: 88,
    matchReason: 'Same level and rhythm — he hosts visiting players every week.',
    bio: "Barcelona local. Happy to show you three courts you'd never find alone.",
    stats: { wins: 63, matches: 121, courts: 27, countries: 6 },
    accent: 'clay',
    avatarSeed: 'marc',
    avatarStyle: 'lorelei'
  },
  {
    id: 'yuki',
    name: 'Yuki Tanaka',
    initials: 'YT',
    city: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    level: 'Advanced',
    years: 14,
    frequency: '3–4 times a week',
    format: 'Singles',
    surface: 'Hard',
    availability: ['Late evenings'],
    distanceKm: 11_100,
    matchScore: 76,
    matchReason: "Hard-court singles player in a country you haven't unlocked.",
    bio: 'Night tennis under the neon in Shinjuku. Fast courts, faster points.',
    stats: { wins: 204, matches: 320, courts: 51, countries: 12 },
    accent: 'ink',
    avatarSeed: 'yuki',
    avatarStyle: 'notionists'
  },
  {
    id: 'chloe',
    name: 'Chloé Martin',
    initials: 'CM',
    city: 'Paris',
    country: 'France',
    flag: '🇫🇷',
    level: 'Intermediate',
    years: 4,
    frequency: 'Twice a week',
    format: 'Doubles',
    surface: 'Clay',
    availability: ['Weekends', 'Weekday evenings'],
    distanceKm: 1_480,
    matchScore: 81,
    matchReason: 'Overlapping evenings and a shared love of long clay rallies.',
    bio: 'Clay is the only surface, everything else is a compromise.',
    stats: { wins: 38, matches: 74, courts: 19, countries: 5 },
    accent: 'cobalt',
    avatarSeed: 'chloe',
    avatarStyle: 'open-peeps'
  },
  {
    id: 'james',
    name: 'James Okafor',
    initials: 'JO',
    city: 'London',
    country: 'UK',
    flag: '🇬🇧',
    level: 'Competitive',
    years: 16,
    frequency: 'Daily',
    format: 'Singles',
    surface: 'Grass',
    availability: ['Early mornings'],
    distanceKm: 1_290,
    matchScore: 64,
    matchReason: 'Strong step up. Great if you want a challenge match.',
    bio: 'Grass-court specialist. Serve, volley, repeat.',
    stats: { wins: 289, matches: 402, courts: 63, countries: 17 },
    accent: 'lime',
    avatarSeed: 'james',
    avatarStyle: 'thumbs'
  },
  {
    id: 'sofia',
    name: 'Sofia Rossi',
    initials: 'SR',
    city: 'Milan',
    country: 'Italy',
    flag: '🇮🇹',
    level: 'Improver',
    years: 3,
    frequency: 'Once a week',
    format: 'Both',
    surface: 'Clay',
    availability: ['Sunday mornings'],
    distanceKm: 1_760,
    matchScore: 69,
    matchReason: 'Sunday-morning player — same slot as you, different city.',
    bio: 'Started at 29, obsessed by 30. Collecting courts across Lombardy.',
    stats: { wins: 17, matches: 44, courts: 9, countries: 3 },
    accent: 'clay',
    avatarSeed: 'sofia',
    avatarStyle: 'lorelei'
  }
];

export const COUNTRIES: CountryEntry[] = [
  { name: 'Portugal', flag: '🇵🇹', courts: 18, visited: true, firstPlayed: 'Mar 2019', coords: { x: 43, y: 40 } },
  { name: 'Spain', flag: '🇪🇸', courts: 7, visited: true, firstPlayed: 'Jul 2021', coords: { x: 48, y: 41 } },
  { name: 'France', flag: '🇫🇷', courts: 3, visited: true, firstPlayed: 'Sep 2022', coords: { x: 50, y: 34 } },
  { name: 'Italy', flag: '🇮🇹', courts: 2, visited: true, firstPlayed: 'May 2023', coords: { x: 54, y: 38 } },
  { name: 'UK', flag: '🇬🇧', courts: 2, visited: true, firstPlayed: 'Jun 2023', coords: { x: 47, y: 28 } },
  { name: 'Morocco', flag: '🇲🇦', courts: 1, visited: true, firstPlayed: 'Feb 2024', coords: { x: 45, y: 47 } },
  { name: 'Netherlands', flag: '🇳🇱', courts: 1, visited: true, firstPlayed: 'Apr 2025', coords: { x: 51, y: 29 } },
  { name: 'Japan', flag: '🇯🇵', courts: 0, visited: false, coords: { x: 84, y: 39 } },
  { name: 'USA', flag: '🇺🇸', courts: 0, visited: false, coords: { x: 22, y: 37 } },
  { name: 'Australia', flag: '🇦🇺', courts: 0, visited: false, coords: { x: 86, y: 72 } },
  { name: 'Brazil', flag: '🇧🇷', courts: 0, visited: false, coords: { x: 32, y: 63 } },
  { name: 'Mexico', flag: '🇲🇽', courts: 0, visited: false, coords: { x: 18, y: 46 } }
];

export const DESTINATIONS: Destination[] = [
  {
    id: 'barcelona',
    city: 'Barcelona',
    country: 'Spain',
    flag: '🇪🇸',
    players: 12,
    courts: 7,
    image: `${IMG}/court-hard.jpg`,
    coords: { x: 48, y: 41 },
    note: 'Clay-loving crowd, plays late. Marina Bay Courts is the local favourite.'
  },
  {
    id: 'paris',
    city: 'Paris',
    country: 'France',
    flag: '🇫🇷',
    players: 9,
    courts: 5,
    image: `${IMG}/court-indoor.jpg`,
    coords: { x: 50, y: 34 },
    note: 'Indoor season all year at Hangar. Great for winter trips.'
  },
  {
    id: 'london',
    city: 'London',
    country: 'UK',
    flag: '🇬🇧',
    players: 14,
    courts: 6,
    image: `${IMG}/court-grass.jpg`,
    coords: { x: 47, y: 28 },
    note: 'Grass season in summer. Hedgerow is worth the trip alone.'
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    country: 'Japan',
    flag: '🇯🇵',
    players: 6,
    courts: 3,
    image: `${IMG}/court-urban.jpg`,
    coords: { x: 84, y: 39 },
    note: 'Night tennis culture. Shinjuku courts run past midnight.'
  }
];

export const LEVELS = ['Beginner', 'Improver', 'Intermediate', 'Advanced', 'Competitive'] as const;
export const SURFACES = ['Clay', 'Hard', 'Grass', 'Carpet'] as const;
export const HERO_IMAGE = `${IMG}/hero-rally.jpg`;

export const WORLD_ACTIVITY: WorldActivityItem[] = [
  {
    id: 'wa1',
    city: 'Barcelona',
    flag: '🇪🇸',
    kind: 'capture',
    text: 'Marc captured a new court at Marina Bay Courts.',
    time: '12m ago',
    coords: { x: 48, y: 41 }
  },
  {
    id: 'wa2',
    city: 'Tokyo',
    flag: '🇯🇵',
    kind: 'challenge',
    text: 'Yuki posted "Fancy hitting some balls tonight?" nearby.',
    time: '40m ago',
    coords: { x: 84, y: 39 }
  },
  {
    id: 'wa3',
    city: 'London',
    flag: '🇬🇧',
    kind: 'match',
    text: 'Two players just finished a match at Hedgerow Lawn Club.',
    time: '1h ago',
    coords: { x: 47, y: 28 }
  },
  {
    id: 'wa4',
    city: 'Casablanca',
    flag: '🇲🇦',
    kind: 'capture',
    text: 'A new court was captured in Morocco — first one this month.',
    time: '3h ago',
    coords: { x: 45, y: 47 }
  },
  {
    id: 'wa5',
    city: 'Paris',
    flag: '🇫🇷',
    kind: 'challenge',
    text: 'Someone in Paris wants to discover a new city to play in.',
    time: '5h ago',
    coords: { x: 50, y: 34 }
  }
];
