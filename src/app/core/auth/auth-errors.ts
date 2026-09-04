/**
 * Maps a handful of known Supabase Auth error messages to a translation key, so the login toast
 * reads in the app's language instead of GoTrue's raw English (see docs/flows/login.md, Fluxo 2).
 * Anything not in this deliberately short list passes through unchanged — `TranslationService.t()`
 * already falls back to returning an unrecognised key verbatim, which is what kept this readable
 * before this mapping existed, and still covers errors we haven't seen enough of to name here.
 */
const KNOWN_AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'auth.errorInvalidCredentials',
  'Email not confirmed': 'auth.errorEmailNotConfirmed'
};

export function authErrorKey(message: string): string {
  return KNOWN_AUTH_ERRORS[message] ?? message;
}
