import { Format, Level, Surface } from '../models';

/**
 * Shared question data for the registration wizard and the profile edit form —
 * both surfaces render the same fields, so the option lists live in one place.
 */

export type Hand = 'Right' | 'Left' | 'Ambidextrous';
export type Backhand = 'OneHanded' | 'TwoHanded' | 'Unknown';
export type Gender = 'Male' | 'Female' | 'NonBinary' | 'PreferNotToSay';
export type PlayStyle = 'AggressiveBaseliner' | 'Counterpuncher' | 'ServeAndVolleyer' | 'AllCourt';
export type CourtPref = 'Indoor' | 'Outdoor' | 'NoPreference';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening';
export type Frequency = 'Daily' | '3–4 times a week' | 'Twice a week' | 'Once a week' | 'A few times a month';
export type AvailabilityOption =
  | 'Early mornings'
  | 'Weekday mornings'
  | 'Weekday evenings'
  | 'Late evenings'
  | 'Saturdays'
  | 'Sunday mornings'
  | 'Weekends';

export interface ChipOption<T extends string> {
  value: T;
  emoji: string;
  key: string;
}

export interface TextOption<T extends string = string> {
  value: T;
  key: string;
}

export const LEVELS: Level[] = ['Beginner', 'Improver', 'Intermediate', 'Advanced', 'Competitive'];
export const FORMATS: Format[] = ['Singles', 'Doubles', 'Both'];
export const SURFACES: Surface[] = ['Clay', 'Hard', 'Grass', 'Carpet'];

export const FREQUENCIES: TextOption<Frequency>[] = [
  { value: 'Daily', key: 'auth.freqDaily' },
  { value: '3–4 times a week', key: 'auth.freq3to4' },
  { value: 'Twice a week', key: 'auth.freqTwice' },
  { value: 'Once a week', key: 'auth.freqOnce' },
  { value: 'A few times a month', key: 'auth.freqFewMonth' }
];

export const AVAILABILITY_OPTIONS: TextOption<AvailabilityOption>[] = [
  { value: 'Early mornings', key: 'auth.availEarlyMorning' },
  { value: 'Weekday mornings', key: 'auth.availWeekdayMorning' },
  { value: 'Weekday evenings', key: 'auth.availWeekdayEvening' },
  { value: 'Late evenings', key: 'auth.availLateEvening' },
  { value: 'Saturdays', key: 'auth.availSaturdays' },
  { value: 'Sunday mornings', key: 'auth.availSundayMorning' },
  { value: 'Weekends', key: 'auth.availWeekends' }
];

export const MAX_DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
export const MAX_YEARS = 40;


export const HANDS: ChipOption<Hand>[] = [
  { value: 'Right', emoji: '🫱', key: 'auth.handRight' },
  { value: 'Left', emoji: '🫲', key: 'auth.handLeft' },
  { value: 'Ambidextrous', emoji: '🤷', key: 'auth.handAmbi' }
];

export const BACKHANDS: ChipOption<Backhand>[] = [
  { value: 'OneHanded', emoji: '☝️', key: 'auth.backhandOne' },
  { value: 'TwoHanded', emoji: '✌️', key: 'auth.backhandTwo' },
  { value: 'Unknown', emoji: '🤷', key: 'auth.backhandUnknown' }
];

export const GENDERS: ChipOption<Gender>[] = [
  { value: 'Male', emoji: '👨', key: 'auth.genderMale' },
  { value: 'Female', emoji: '👩', key: 'auth.genderFemale' },
  { value: 'NonBinary', emoji: '🌈', key: 'auth.genderNonBinary' },
  { value: 'PreferNotToSay', emoji: '🤐', key: 'auth.genderPreferNotToSay' }
];

export const PLAY_STYLES: ChipOption<PlayStyle>[] = [
  { value: 'AggressiveBaseliner', emoji: '🔥', key: 'auth.styleAggressiveBaseliner' },
  { value: 'Counterpuncher', emoji: '🛡️', key: 'auth.styleCounterpuncher' },
  { value: 'ServeAndVolleyer', emoji: '⚡', key: 'auth.styleServeVolley' },
  { value: 'AllCourt', emoji: '🧭', key: 'auth.styleAllCourt' }
];

export const COURT_PREFS: ChipOption<CourtPref>[] = [
  { value: 'Indoor', emoji: '🏟️', key: 'enums.indoor' },
  { value: 'Outdoor', emoji: '☀️', key: 'enums.outdoor' },
  { value: 'NoPreference', emoji: '🤙', key: 'auth.noPreference' }
];

export const TIMES_OF_DAY: ChipOption<TimeOfDay>[] = [
  { value: 'Morning', emoji: '☀️', key: 'auth.morning' },
  { value: 'Afternoon', emoji: '🌤️', key: 'auth.afternoon' },
  { value: 'Evening', emoji: '🌙', key: 'auth.evening' }
];
