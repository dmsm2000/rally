import { Injectable, computed, inject, signal } from '@angular/core';
import { MatchesRepository } from './data/matches.repository';
import { Match, MatchFormat, SessionType } from '../../core/models';

export const SESSION_TYPES: SessionType[] = ['Training', 'HittingSession', 'PracticeMatch', 'FullMatch'];
export const DURATION_OPTIONS = [30, 60, 90, 120];
export const RADIUS_OPTIONS = [5, 10, 20, 50];

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private readonly repository = inject(MatchesRepository);

  readonly all = computed(() => this.repository.getAll());
  readonly me = computed(() => this.repository.me());
  readonly upcoming = computed(() => this.all().filter((m) => m.status === 'upcoming'));
  readonly completed = computed(() => this.all().filter((m) => m.status === 'complete'));
  readonly open = computed(() => this.all().filter((m) => m.status === 'open'));
  readonly courts = computed(() => this.repository.courts());
  readonly communityStats = computed(() => this.repository.communityStats());
  readonly openPlayersCount = computed(() => new Set(this.open().map((m) => m.playerA)).size);

  readonly sessionTypes = SESSION_TYPES;
  readonly durationOptions = DURATION_OPTIONS;
  readonly radiusOptions = RADIUS_OPTIONS;

  readonly composerSessionType = signal<SessionType>('FullMatch');
  readonly composerLocationMode = signal<'court' | 'radius'>('court');
  readonly composerCourtId = signal<string>('');
  readonly composerCity = signal('');
  readonly composerRadiusKm = signal<number>(RADIUS_OPTIONS[1]);
  readonly composerDate = signal('');
  readonly composerTime = signal('');
  readonly composerDurationMinutes = signal<number | null>(null);
  readonly composerFormat = signal<MatchFormat>('Singles');
  readonly composerNote = signal('');

  readonly canPublish = computed(() =>
    this.composerLocationMode() === 'court' ? this.composerCourtId().length > 0 : this.composerCity().trim().length > 0,
  );

  getById(id: string) {
    return this.repository.getById(id);
  }

  playerById(id: string | undefined) {
    return this.repository.playerById(id);
  }

  courtById(id: string) {
    return this.repository.courtById(id);
  }

  isMine(playerId: string): boolean {
    return playerId === this.me().id;
  }

  acceptOpenMatch(matchId: string): void {
    this.repository.acceptOpenMatch(matchId);
  }

  // Either a specific court, or "somewhere within X km of this city" when no court was picked.
  openMatchLocation(match: Match): string {
    if (match.courtId) {
      const court = this.courtById(match.courtId);
      return court ? `${court.flag} ${court.name}` : '';
    }
    return `📍 ${match.city} · ±${match.radiusKm}km`;
  }

  publishOpenMatch(): void {
    if (!this.canPublish() || !this.composerNote()) {
      return;
    }
    this.repository.createOpenMatch({
      courtId: this.composerLocationMode() === 'court' ? this.composerCourtId() : '',
      city: this.composerLocationMode() === 'radius' ? this.composerCity().trim() : undefined,
      radiusKm: this.composerLocationMode() === 'radius' ? this.composerRadiusKm() : undefined,
      date: this.composerDate() || 'Hoje',
      time: this.composerTime() || '--:--',
      format: this.composerFormat(),
      sessionType: this.composerSessionType(),
      durationMinutes: this.composerDurationMinutes() ?? undefined,
      note: this.composerNote(),
    });
    this.composerNote.set('');
    this.composerDate.set('');
    this.composerTime.set('');
    this.composerCourtId.set('');
    this.composerCity.set('');
    this.composerDurationMinutes.set(null);
    this.composerSessionType.set('FullMatch');
    this.composerLocationMode.set('court');
  }
}
