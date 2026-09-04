import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CountryDataService } from '../../core/data/country-data.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { Match, MatchFormat, SessionType, courtLabel } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { PostsRepository } from '../feed/data/posts.repository';
import { CourtsService } from '../courts/courts.service';
import { CreateMatchInput, MatchesRepository } from './data/matches.repository';

export const SESSION_TYPES: SessionType[] = ['FullMatch', 'Training', 'HittingSession', 'PracticeMatch'];
export const DURATION_OPTIONS = [30, 60, 90, 120];
export const RADIUS_OPTIONS = [5, 10, 20, 50];
export const DOUBLES_CAPACITY = 4;

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private readonly repository = inject(MatchesRepository);
  private readonly posts = inject(PostsRepository);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly translation = inject(TranslationService);
  private readonly countryData = inject(CountryDataService);
  private readonly courtsService = inject(CourtsService);

  readonly myId = this.auth.currentUserId;

  private readonly myMatchesRaw = signal<Match[]>([]);
  private readonly openNearbyRaw = signal<Match[]>([]);
  // Open matches to browse/accept aren't restricted to my exact city (same reasoning as trip host
  // requests — a match a country over is still worth seeing), and can be widened further to every
  // open match anywhere, matching what the feed's "In the world" tab already surfaces.
  readonly openScope = signal<'country' | 'world'>('country');
  // Only true until the first load resolves — later reload()s (after my own actions, or a
  // realtime event) refresh the lists in place without flashing a skeleton back over them.
  readonly loading = signal(true);
  // Latest match to arrive over Realtime, regardless of whether it triggered a full list reload —
  // MatchDetailPageComponent watches this to live-update whichever single match is open, even one
  // that wouldn't otherwise be "mine" or "nearby" (e.g. an open match I reached via a direct link).
  readonly lastRealtimeMatch = signal<Match | null>(null);

  readonly upcoming = computed(() => this.myMatchesRaw().filter(m => m.status === 'upcoming'));
  readonly completed = computed(() => this.myMatchesRaw().filter(m => m.status === 'complete'));
  readonly pendingReceived = computed(() => this.myMatchesRaw().filter(m => m.status === 'pending' && m.playerB === this.myId()));
  readonly pendingSent = computed(() => this.myMatchesRaw().filter(m => m.status === 'pending' && m.playerA === this.myId()));
  private readonly myOpen = computed(() => this.myMatchesRaw().filter(m => m.status === 'open'));

  // My own open listings plus everyone else's near me, deduplicated.
  readonly open = computed(() => {
    const mine = this.myOpen();
    const mineIds = new Set(mine.map(m => m.id));
    return [...mine, ...this.openNearbyRaw().filter(m => !mineIds.has(m.id))];
  });

  // Courts the player can pick from when scheduling: real, public, and — since captures are what
  // make a place worth knowing — their own captured ones first.
  readonly courts = computed(() => this.repository.courtCatalogue());
  readonly courtOptions = computed(() =>
    [...this.courts()].sort((a, b) => Number(!!b.capturedByMe) - Number(!!a.capturedByMe))
  );
  readonly courtOptionLabels = computed(() => this.courtOptions().map(c => courtLabel(c)));
  readonly matchesThisWeek = signal(0);
  readonly openPlayersCount = computed(() => new Set(this.open().map(m => m.playerA)).size);

  readonly sessionTypes = SESSION_TYPES;
  readonly durationOptions = DURATION_OPTIONS;
  readonly radiusOptions = RADIUS_OPTIONS;
  readonly doublesCapacity = DOUBLES_CAPACITY;

  readonly composerSessionType = signal<SessionType>('FullMatch');
  // Both modes are real now that courts are: 'court' pins an actual registered court (which also
  // means completing the match captures it — see 0028_matches_court_fk.sql), 'radius' stays the
  // "somewhere around this city" option for a place that isn't registered yet.
  readonly composerLocationMode = signal<'court' | 'radius'>('radius');
  readonly composerCourtId = signal<string>('');
  readonly composerCity = signal('');
  readonly composerRadiusKm = signal<number>(RADIUS_OPTIONS[1]);
  readonly composerDate = signal('');
  readonly composerTime = signal('');
  // Optional: leave empty for a single fixed time, or set to offer a flexible window instead
  // ("anytime between composerTime and this works").
  readonly composerTimeEnd = signal('');
  // undefined = not chosen yet (blocks publishing); null = explicitly "not sure"; number = minutes.
  // Defaults to 60 — a reasonable guess the player can change rather than an empty, blocking field.
  readonly composerDurationMinutes = signal<number | null | undefined>(60);
  readonly composerFormat = signal<MatchFormat>('Singles');
  readonly composerNote = signal('');
  readonly publishing = signal(false);
  readonly composerOpen = signal(false);

  readonly todayIso = new Date().toISOString().slice(0, 10);
  // ui-date-picker defaults its `max` to today (right for a birth date) — matches need the
  // opposite: any day from today up to a year out.
  readonly maxMatchDateIso = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  })();

  // Every field is mandatory before publishing/inviting, except the note — duration must be
  // actively chosen too (including "not sure"), not just left at its initial unset state. The end
  // time is optional, but if given it must actually be later than the start time.
  readonly canPublish = computed(
    () =>
      (this.composerLocationMode() === 'court' ? this.composerCourtId().length > 0 : this.composerCity().trim().length > 0) &&
      this.composerDate().length > 0 &&
      this.composerTime().length > 0 &&
      (!this.composerTimeEnd() || this.composerTimeEnd() > this.composerTime()) &&
      this.composerDurationMinutes() !== undefined
  );

  // Direct-invite dialog, opened from a player's profile — reuses the same composer signals above.
  readonly inviteDialogOpen = signal(false);
  readonly invitePlayerId = signal<string | null>(null);

  // Defaults to the signed-in player's own country when publishing an open match (still freely
  // changeable, e.g. to plan a match somewhere else) — pinned to the invitee's country instead
  // while inviting them directly (see openInviteDialog()), where it isn't shown as a choice.
  readonly composerCountry = signal('');
  readonly composerCityOptions = signal<string[]>([]);
  readonly countryNames = computed(() => this.countryData.countries().map(c => c.name));
  readonly countryFlags = computed(() => Object.fromEntries(this.countryData.countries().map(c => [c.name, c.flag])));

  // Re-derives only when the resolved home country/city actually change value (not on every
  // unrelated profile-signal update) — reloads once real profile data (rather than the mock
  // bridge's defaults) is available, same pattern as WorldService/FeedService.
  private readonly myLocationKey = computed(() => {
    const me = this.auth.currentPlayer();
    return `${me.country ?? ''}::${me.city ?? ''}`;
  });

  constructor() {
    this.countryData.loadCountries();
    // The composer's court picker reads from the shared catalogue signal, so it has to be warm.
    void this.repository.ensureCourts();
    void this.repository.countMatchesThisWeek().then(count => this.matchesThisWeek.set(count));

    // Registering a court from inside the composer should leave it selected — otherwise the player
    // is dropped back into a list to hunt for the thing they just created.
    effect(() => {
      const courtId = this.courtsService.lastRegisteredCourtId();
      untracked(() => {
        if (courtId && this.composerOpen() && this.composerLocationMode() === 'court') {
          this.composerCourtId.set(courtId);
        }
      });
    });

    // Tracks both signals (not just isAuthenticated()) so switching between two real accounts
    // without an intervening logged-out tick still re-fires this effect and reloads. Observers
    // have no uid but must still load open matches — see 0022_matches_public_select.sql, which
    // makes those visible to anon — so the gate is "signed in OR observer", not "has a real uid".
    effect(() => {
      const uid = this.auth.currentUserId();
      const isObserver = this.auth.isObserver();
      untracked(() => {
        if (uid || isObserver) {
          void this.reload().then(() => this.loading.set(false));
          this.repository.subscribeToMatchEvents(match => this.handleRealtimeMatch(match));
        } else {
          this.myMatchesRaw.set([]);
          this.openNearbyRaw.set([]);
          this.loading.set(true);
          this.repository.unsubscribeFromMatchEvents();
        }
      });
    });

    effect(() => {
      const countryName = this.composerCountry();
      const match = countryName ? this.countryData.countries().find(c => c.name === countryName) : undefined;
      if (!match) {
        this.composerCityOptions.set([]);
        return;
      }
      void this.countryData.citiesFor(match.iso2).then(cities => this.composerCityOptions.set(cities));
    });

    // Pre-fills the open-match composer with home turf as soon as it's known — only while the
    // composer is still pristine, so this never clobbers a manual pick or the invite-dialog override.
    effect(() => {
      this.myLocationKey();
      untracked(() => {
        if (!this.composerCountry()) {
          const me = this.auth.currentPlayer();
          this.composerCountry.set(me.country ?? '');
          this.composerCity.set(me.city ?? '');
        }
      });
    });
  }

  setOpenScope(scope: 'country' | 'world'): void {
    if (this.openScope() === scope) {
      return;
    }
    this.openScope.set(scope);
    void this.reload();
  }

  openComposer(): void {
    this.composerOpen.set(true);
  }

  closeComposer(): void {
    this.composerOpen.set(false);
  }

  setComposerCountry(name: string): void {
    this.composerCountry.set(name);
    this.composerCity.set('');
  }

  // Clears a now-earlier-or-equal end time so the availability window never shows a stale,
  // invalid state after moving the start time later.
  setComposerTime(value: string): void {
    this.composerTime.set(value);
    if (this.composerTimeEnd() && this.composerTimeEnd() <= value) {
      this.composerTimeEnd.set('');
    }
  }

  async reload(): Promise<void> {
    const me = this.auth.currentPlayer();
    // Observers have no home country (see PRODUCT.md) — fall back to world scope for them
    // regardless of the toggle, rather than showing a silently empty list.
    const openMatches =
      this.openScope() === 'world' || !me.country ? this.repository.allOpenMatches() : this.repository.openMatchesNear(me.country);
    const [mine, open] = await Promise.all([this.repository.myMatches(), openMatches]);
    this.myMatchesRaw.set(mine);
    this.openNearbyRaw.set(open);
  }

  // Refreshes the list views whenever a change is actually relevant to them: a match I'm part of
  // (an invite response, a cancellation, someone joining my open post, ...), or an open match
  // within whatever scope I'm currently browsing (my country, or anywhere while "In the world").
  private handleRealtimeMatch(match: Match): void {
    this.lastRealtimeMatch.set(match);
    const me = this.auth.currentPlayer();
    // Needs a real uid before comparing: playerB is undefined on every doubles/open match, and an
    // observer's myId() is undefined too, so a bare === made every such event look like "mine" and
    // triggered a reload on every match change anywhere in the world.
    const uid = this.myId();
    const isMine = !!uid && (match.playerA === uid || match.playerB === uid || !!match.participantIds?.includes(uid));
    const isRelevantOpen = match.kind === 'open' && (this.openScope() === 'world' || match.country === me.country);
    if (isMine || isRelevantOpen) {
      void this.reload();
    }
  }

  async getById(id: string): Promise<Match | null> {
    return this.repository.getById(id);
  }

  /** For a public player-detail page's match-history tabs — see MatchesRepository.matchesForPlayer(). */
  async matchesForPlayer(playerId: string): Promise<Match[]> {
    return this.repository.matchesForPlayer(playerId);
  }

  playerById(id: string | undefined) {
    return this.repository.playerById(id);
  }

  courtById(id: string | undefined) {
    return this.repository.courtById(id);
  }

  /** Resolves the court picked in the composer's autocomplete, which works off labels. */
  setComposerCourtLabel(label: string): void {
    const court = this.courtOptions().find(c => courtLabel(c) === label);
    this.composerCourtId.set(court?.id ?? '');
  }

  composerCourtLabel(): string {
    const court = this.courtById(this.composerCourtId());
    return court ? courtLabel(court) : '';
  }

  isMine(playerId: string | undefined): boolean {
    return !!playerId && playerId === this.myId();
  }

  /**
   * Either a specific court, or "somewhere within X km of this city" when no court was picked.
   * Returns plain text with no leading icon: every caller already renders its own 📍 span, so a
   * pin here would double up.
   */
  openMatchLocation(match: Match): string {
    if (match.courtId) {
      const court = this.courtById(match.courtId);
      // A court that isn't in the public catalogue (an unconfirmed draft) still has a location —
      // fall through to the match's own city rather than rendering an empty line.
      if (court) {
        return courtLabel(court);
      }
    }
    // A direct invite's city is a concrete arrangement, not "anyone within X km" — only open
    // matches published in radius mode actually carry a radiusKm.
    if (match.radiusKm) {
      return `${match.city} · ±${match.radiusKm}km`;
    }
    return match.city;
  }

  formatMatchDateTime(match: Match): string {
    const [year, month, day] = match.matchDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dateLabel = new Intl.DateTimeFormat(this.translation.locale(), { day: 'numeric', month: 'short' }).format(date);
    const timeLabel = match.matchTimeEnd
      ? `${match.matchTime.slice(0, 5)}–${match.matchTimeEnd.slice(0, 5)}`
      : match.matchTime.slice(0, 5);
    return `${dateLabel} · ${timeLabel}`;
  }

  openInviteDialog(playerId: string): void {
    this.resetComposer();
    this.invitePlayerId.set(playerId);
    const invitee = this.playerById(playerId);
    this.composerCountry.set(invitee?.country ?? '');
    this.composerCity.set(invitee?.city ?? '');
    this.inviteDialogOpen.set(true);
  }

  closeInviteDialog(): void {
    this.inviteDialogOpen.set(false);
    this.invitePlayerId.set(null);
  }

  async sendInvite(): Promise<void> {
    const playerId = this.invitePlayerId();
    const input = this.buildComposerInput();
    if (!playerId || !input) {
      return;
    }
    // A direct invite is always exactly two named players — doubles isn't offered as a choice.
    input.format = 'Singles';
    this.publishing.set(true);
    const matchId = await this.repository.createDirectInvite(playerId, input);
    this.publishing.set(false);
    if (!matchId) {
      this.toast.error(this.translation.t('matches.inviteFailed'));
      return;
    }
    this.resetComposer();
    this.closeInviteDialog();
    this.toast.success(this.translation.t('matches.inviteSent'));
    void this.reload();
  }

  async publishOpenMatch(): Promise<void> {
    const input = this.buildComposerInput();
    if (!input) {
      return;
    }
    this.publishing.set(true);
    const matchId = await this.repository.createOpenMatch(input);
    this.publishing.set(false);
    if (!matchId) {
      this.toast.error(this.translation.t('matches.publishFailed'));
      return;
    }
    // Best-effort: the match itself already published successfully (it still shows up on
    // /matches either way), so a failure here is logged by PostsRepository but not surfaced.
    void this.posts.createMatchAnnouncement(matchId);
    this.resetComposer();
    this.closeComposer();
    this.toast.success(this.translation.t('matches.publishSuccess'));
    void this.reload();
  }

  async acceptOpenMatch(matchId: string): Promise<void> {
    const result = await this.repository.acceptOpenMatch(matchId);
    if (!result) {
      this.toast.error(this.translation.t('matches.joinFailed'));
    }
    void this.reload();
  }

  // Roster helpers for doubles matches — participantIds is only ever populated for format
  // 'Doubles' (see MatchesRepository.toMatch()); Singles matches render through playerA/playerB
  // as before and never call these.
  participantsFor(match: Match) {
    return (match.participantIds ?? []).map(id => this.playerById(id));
  }

  emptyDoublesSlots(match: Match): number[] {
    const filled = match.participantIds?.length ?? 0;
    return Array.from({ length: Math.max(0, this.doublesCapacity - filled) }, (_, i) => i);
  }

  hasJoined(match: Match): boolean {
    return !!match.participantIds?.includes(this.myId() ?? '');
  }

  async joinDoublesMatch(matchId: string): Promise<void> {
    const result = await this.repository.joinDoublesMatch(matchId);
    if (!result) {
      this.toast.error(this.translation.t('matches.joinFailed'));
    }
    void this.reload();
  }

  async leaveDoublesMatch(matchId: string): Promise<void> {
    const result = await this.repository.leaveDoublesMatch(matchId);
    if (!result) {
      this.toast.error(this.translation.t('matches.leaveFailed'));
    }
    void this.reload();
  }

  async respondToInvite(matchId: string, accept: boolean): Promise<void> {
    const result = await this.repository.respondToInvite(matchId, accept);
    if (!result) {
      this.toast.error(this.translation.t('matches.respondFailed'));
    }
    void this.reload();
  }

  async cancelMatch(matchId: string): Promise<void> {
    const result = await this.repository.cancelMatch(matchId);
    if (!result) {
      this.toast.error(this.translation.t('matches.cancelFailed'));
    }
    void this.reload();
  }

  async completeMatch(matchId: string, winnerId: string | null): Promise<void> {
    const result = await this.repository.completeMatch(matchId, winnerId);
    if (!result) {
      this.toast.error(this.translation.t('matches.completeFailed'));
    }
    void this.reload();
  }

  async deleteMatch(matchId: string): Promise<void> {
    const success = await this.repository.deleteMatch(matchId);
    if (!success) {
      this.toast.error(this.translation.t('matches.deleteFailed'));
      return;
    }
    void this.reload();
  }

  private buildComposerInput(): CreateMatchInput | null {
    if (!this.canPublish()) {
      return null;
    }
    let city: string;
    let country: string;
    let courtId: string | undefined;
    let radiusKm: number | undefined;
    if (this.composerLocationMode() === 'court') {
      const court = this.courtById(this.composerCourtId());
      if (!court) {
        return null;
      }
      // Still denormalized off the court, exactly as it was off the mock one — feed scoping and the
      // match_open_nearby fan-out need city/country populated whichever mode was used.
      city = court.venue.city;
      country = court.venue.country;
      courtId = court.id;
    } else {
      city = this.composerCity().trim();
      country = this.composerCountry();
      if (!country) {
        return null;
      }
      radiusKm = this.composerRadiusKm();
    }
    return {
      format: this.composerFormat(),
      sessionType: this.composerSessionType(),
      courtId,
      city,
      country,
      radiusKm,
      matchDate: this.composerDate(),
      matchTime: this.composerTime(),
      matchTimeEnd: this.composerTimeEnd() || undefined,
      durationMinutes: this.composerDurationMinutes() ?? undefined,
      note: this.composerNote().trim() || undefined
    };
  }

  private resetComposer(): void {
    this.composerNote.set('');
    this.composerDate.set('');
    this.composerTime.set('');
    this.composerTimeEnd.set('');
    this.composerCourtId.set('');
    const me = this.auth.currentPlayer();
    this.composerCountry.set(me.country ?? '');
    this.composerCity.set(me.city ?? '');
    this.composerDurationMinutes.set(60);
    this.composerSessionType.set('FullMatch');
    this.composerLocationMode.set('radius');
    this.composerFormat.set('Singles');
  }
}
