import { Injectable, computed, inject, signal } from '@angular/core';
import { MatchesRepository } from './data/matches.repository';
import { MatchFormat } from '../../core/models';

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

  readonly composerCourtId = signal<string>('');
  readonly composerDate = signal('');
  readonly composerTime = signal('');
  readonly composerFormat = signal<MatchFormat>('Singles');
  readonly composerNote = signal('');

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

  publishOpenMatch(): void {
    if (!this.composerCourtId() || !this.composerNote()) {
      return;
    }
    this.repository.createOpenMatch({
      courtId: this.composerCourtId(),
      date: this.composerDate() || 'Hoje',
      time: this.composerTime() || '--:--',
      format: this.composerFormat(),
      note: this.composerNote(),
    });
    this.composerNote.set('');
    this.composerDate.set('');
    this.composerTime.set('');
  }
}
