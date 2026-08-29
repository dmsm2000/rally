import { Format, Level, Surface } from '../models';

/**
 * Shared question data for the registration wizard and the profile edit form —
 * both surfaces render the same fields, so the option lists live in one place.
 */

export type Hand = 'Right' | 'Left' | 'Ambidextrous';
export type Backhand = 'OneHanded' | 'TwoHanded';
export type PlayStyle = 'AggressiveBaseliner' | 'Counterpuncher' | 'ServeAndVolleyer' | 'AllCourt';
export type CourtPref = 'Indoor' | 'Outdoor' | 'NoPreference';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening';

export interface ChipOption<T extends string> {
  value: T;
  emoji: string;
  key: string;
}

export interface TextOption {
  value: string;
  key: string;
}

export interface CountryOption {
  name: string;
  flag: string;
  cities: string[];
}

export const LEVELS: Level[] = ['Beginner', 'Improver', 'Intermediate', 'Advanced', 'Competitive'];
export const FORMATS: Format[] = ['Singles', 'Doubles', 'Both'];
export const SURFACES: Surface[] = ['Clay', 'Hard', 'Grass', 'Carpet'];

export const FREQUENCIES: TextOption[] = [
  { value: 'Daily', key: 'auth.freqDaily' },
  { value: '3–4 times a week', key: 'auth.freq3to4' },
  { value: 'Twice a week', key: 'auth.freqTwice' },
  { value: 'Once a week', key: 'auth.freqOnce' },
  { value: 'A few times a month', key: 'auth.freqFewMonth' },
];

export const AVAILABILITY_OPTIONS: TextOption[] = [
  { value: 'Early mornings', key: 'auth.availEarlyMorning' },
  { value: 'Weekday mornings', key: 'auth.availWeekdayMorning' },
  { value: 'Weekday evenings', key: 'auth.availWeekdayEvening' },
  { value: 'Late evenings', key: 'auth.availLateEvening' },
  { value: 'Saturdays', key: 'auth.availSaturdays' },
  { value: 'Sunday mornings', key: 'auth.availSundayMorning' },
  { value: 'Weekends', key: 'auth.availWeekends' },
];

export const MAX_DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
export const MAX_YEARS = 40;

// Mirrors the countries/cities that already exist across the app's dataset.
export const COUNTRIES: CountryOption[] = [
  { name: 'Portugal', flag: '🇵🇹', cities: ['Porto', 'Lisbon', 'Matosinhos'] },
  { name: 'Spain', flag: '🇪🇸', cities: ['Barcelona', 'Madrid'] },
  { name: 'France', flag: '🇫🇷', cities: ['Paris'] },
  { name: 'Italy', flag: '🇮🇹', cities: ['Milan'] },
  { name: 'UK', flag: '🇬🇧', cities: ['London', 'Surrey'] },
  { name: 'Netherlands', flag: '🇳🇱', cities: ['Amsterdam'] },
  { name: 'Morocco', flag: '🇲🇦', cities: ['Casablanca'] },
  { name: 'Japan', flag: '🇯🇵', cities: ['Tokyo'] },
  { name: 'USA', flag: '🇺🇸', cities: ['New York'] },
  { name: 'Australia', flag: '🇦🇺', cities: ['Sydney'] },
  { name: 'Brazil', flag: '🇧🇷', cities: ['São Paulo'] },
  { name: 'Mexico', flag: '🇲🇽', cities: ['Mexico City'] },
];

export const HANDS: ChipOption<Hand>[] = [
  { value: 'Right', emoji: '🫱', key: 'auth.handRight' },
  { value: 'Left', emoji: '🫲', key: 'auth.handLeft' },
  { value: 'Ambidextrous', emoji: '🤷', key: 'auth.handAmbi' },
];

export const BACKHANDS: ChipOption<Backhand>[] = [
  { value: 'OneHanded', emoji: '☝️', key: 'auth.backhandOne' },
  { value: 'TwoHanded', emoji: '✌️', key: 'auth.backhandTwo' },
];

export const PLAY_STYLES: ChipOption<PlayStyle>[] = [
  { value: 'AggressiveBaseliner', emoji: '🔥', key: 'auth.styleAggressiveBaseliner' },
  { value: 'Counterpuncher', emoji: '🛡️', key: 'auth.styleCounterpuncher' },
  { value: 'ServeAndVolleyer', emoji: '⚡', key: 'auth.styleServeVolley' },
  { value: 'AllCourt', emoji: '🧭', key: 'auth.styleAllCourt' },
];

export const COURT_PREFS: ChipOption<CourtPref>[] = [
  { value: 'Indoor', emoji: '🏟️', key: 'enums.indoor' },
  { value: 'Outdoor', emoji: '☀️', key: 'enums.outdoor' },
  { value: 'NoPreference', emoji: '🤙', key: 'auth.noPreference' },
];

export const TIMES_OF_DAY: ChipOption<TimeOfDay>[] = [
  { value: 'Morning', emoji: '☀️', key: 'auth.morning' },
  { value: 'Afternoon', emoji: '🌤️', key: 'auth.afternoon' },
  { value: 'Evening', emoji: '🌙', key: 'auth.evening' },
];
