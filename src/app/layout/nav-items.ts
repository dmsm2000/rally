export type NavIcon = 'home' | 'world' | 'courts' | 'matches' | 'passport';

export interface NavItem {
  path: string;
  label: string;
  icon: NavIcon;
  /** Only the home route needs exact matching — everything else should stay active on nested/detail pages. */
  exact?: boolean;
  /**
   * Extra route prefixes that should also count as this item being active, for pages reached from
   * it but not nested under its own path — e.g. a player's public profile is at `/players/:id`,
   * not `/world/players/:id`, but it's still reached from — and conceptually part of — World.
   */
  matchPrefixes?: string[];
}

/** Single source of truth for both the topbar and the mobile bottom nav, so the two never drift apart. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'nav.home', icon: 'home', exact: true },
  { path: '/world', label: 'nav.world', icon: 'world', matchPrefixes: ['/players'] },
  { path: '/matches', label: 'nav.matches', icon: 'matches' },
  { path: '/courts', label: 'nav.courts', icon: 'courts' },
  { path: '/passport', label: 'nav.passport', icon: 'passport' }
];

/** Strips query/fragment, then checks the item's own path and its `matchPrefixes` for a prefix match. */
export function isNavItemActive(url: string, item: NavItem): boolean {
  const path = url.split('?')[0].split('#')[0];
  const matchesBase = (base: string) => path === base || path.startsWith(base === '/' ? '/' : `${base}/`);
  if (item.exact) {
    return path === item.path;
  }
  return matchesBase(item.path) || (item.matchPrefixes?.some(matchesBase) ?? false);
}
