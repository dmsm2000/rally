/**
 * Maps a detail route — reached from several different entry points (World, the courts list, the
 * matches list, a match's "view court" link, a feed card, ...) — to the list page it conceptually
 * belongs to. Used as the `ui-back-link`/topbar-arrow fallback target when there's no in-app
 * history to unwind back to. `/players/:id` has no list page of its own; the World grid is it.
 */
const DETAIL_ROUTES: readonly { prefix: string; fallback: string }[] = [
  { prefix: '/players/', fallback: '/world' },
  { prefix: '/courts/', fallback: '/courts' },
  { prefix: '/matches/', fallback: '/matches' }
];

export function detailRouteFallback(url: string): string | null {
  const path = url.split('?')[0].split('#')[0];
  return DETAIL_ROUTES.find((route) => path.startsWith(route.prefix) && path.length > route.prefix.length)?.fallback ?? null;
}
