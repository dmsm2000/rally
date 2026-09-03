import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { MatchesService } from '../../matches.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { Match } from '../../../../core/models';
import { AvatarComponent } from '../../../../shared/ui';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

// Same gender-badge mapping as the public player detail page — the tennis ball stays the fallback
// when no public gender is available (see CLAUDE.md "Player Detail Conventions").
const GENDER_CLASSES: Record<string, string> = {
  Male: 'bg-cobalt text-white',
  Female: 'bg-pink-400 text-ink',
  NonBinary: 'bg-lime text-ink'
};
const GENDER_ICONS: Record<string, 'gender-male' | 'gender-female' | 'gender-nonbinary'> = {
  Male: 'gender-male',
  Female: 'gender-female',
  NonBinary: 'gender-nonbinary'
};

@Component({
  selector: 'rally-match-detail-page',
  imports: [RouterLink, AvatarComponent, TranslatePipe],
  templateUrl: './match-detail-page.component.html',
  styleUrl: './match-detail-page.component.scss',
})
export class MatchDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly matches = inject(MatchesService);
  protected readonly auth = inject(AuthService);

  private readonly matchId = toSignal(this.route.paramMap.pipe(map((params) => params.get('matchId') ?? '')), { initialValue: '' });

  // undefined = still loading, null = not found/no access.
  private readonly matchRaw = signal<Match | null | undefined>(undefined);

  protected readonly match = computed(() => this.matchRaw());
  protected readonly loading = computed(() => this.matchRaw() === undefined);
  protected readonly playerA = computed(() => this.match() && this.matches.playerById(this.match()!.playerA));
  protected readonly playerB = computed(() => this.match() && this.matches.playerById(this.match()!.playerB));
  // Doubles roster — see MatchesService.participantsFor(). Empty for Singles matches.
  protected readonly participants = computed(() => (this.match() ? this.matches.participantsFor(this.match()!) : []));
  protected readonly emptyDoublesSlots = computed(() => (this.match() ? this.matches.emptyDoublesSlots(this.match()!) : []));
  // Own profile has no /players/:id entry — route there instead when a slot is me.
  protected readonly playerALink = computed(() =>
    this.match()?.playerA === this.myId() ? '/profile' : `/players/${this.match()?.playerA}`
  );
  protected readonly playerBLink = computed(() =>
    this.match()?.playerB === this.myId() ? '/profile' : `/players/${this.match()?.playerB}`
  );
  protected readonly court = computed(() => this.match() && this.matches.courtById(this.match()!.courtId));
  protected readonly done = computed(() => this.match()?.status === 'complete');
  protected readonly aWon = computed(() => this.match()?.winner === this.match()?.playerA);

  protected readonly myId = this.auth.currentUserId;
  // Requires a real signed-in uid up front — without it, a Doubles match's permanently-undefined
  // playerB would otherwise equal an observer's undefined myId() and spuriously match, exposing
  // participant-only actions (cancel/leave) to observers viewing any Doubles or not-yet-accepted match.
  protected readonly isParticipant = computed(() => {
    const m = this.match();
    const uid = this.myId();
    return !!m && !!uid && (m.playerA === uid || m.playerB === uid || !!m.participantIds?.includes(uid));
  });
  protected readonly canRespond = computed(() => this.match()?.status === 'pending' && this.match()?.playerB === this.myId());
  protected readonly canCancel = computed(() => {
    const m = this.match();
    if (!m) {
      return false;
    }
    if (m.status === 'pending' || m.status === 'open') {
      return m.playerA === this.myId();
    }
    return m.status === 'upcoming' && this.isParticipant();
  });
  // Roster still open, not full, not already in it, not the creator (who withdraws the whole
  // listing via canCancel instead) — mirrors MatchesService.hasJoined()/emptyDoublesSlots().
  protected readonly canJoinDoubles = computed(() => {
    const m = this.match();
    return (
      !!m && m.format === 'Doubles' && m.status === 'open' && !this.auth.isObserver() && !this.isParticipant() && this.emptyDoublesSlots().length > 0
    );
  });
  protected readonly canLeaveDoubles = computed(() => {
    const m = this.match();
    return !!m && m.format === 'Doubles' && m.status === 'open' && m.playerA !== this.myId() && this.isParticipant();
  });

  // Doubles has no completion flow yet — no team assignment means there's nothing to declare a
  // winner between (see CLAUDE.md's Matches/Doubles entry). A winner is optional either way (see
  // submitResult()) since not every match is competitive — a Training/HittingSession/PracticeMatch
  // session may have nothing to log at all.
  protected readonly canComplete = computed(() => {
    const m = this.match();
    return !!m && m.format !== 'Doubles' && m.status === 'upcoming' && this.isParticipant();
  });
  protected readonly completing = signal(false);
  protected readonly completingBusy = signal(false);

  constructor() {
    effect(() => {
      const id = this.matchId();
      untracked(() => void this.load(id));
    });

    // Live-patches this exact match the moment it changes elsewhere (the other side responded,
    // cancelled, someone joined, ...) — independent of whether that change was "mine"/"nearby"
    // enough to also refresh the list pages, since I'm looking straight at this one match.
    effect(() => {
      const changed = this.matches.lastRealtimeMatch();
      untracked(() => {
        if (changed && changed.id === this.match()?.id) {
          this.matchRaw.set(changed);
        }
      });
    });
  }

  protected async respond(accept: boolean): Promise<void> {
    const id = this.match()?.id;
    if (!id) {
      return;
    }
    await this.matches.respondToInvite(id, accept);
    void this.load(id);
  }

  protected async cancel(): Promise<void> {
    const id = this.match()?.id;
    if (!id) {
      return;
    }
    await this.matches.cancelMatch(id);
    void this.load(id);
  }

  protected async joinDoubles(): Promise<void> {
    const id = this.match()?.id;
    if (!id) {
      return;
    }
    await this.matches.joinDoublesMatch(id);
    void this.load(id);
  }

  protected async leaveDoubles(): Promise<void> {
    const id = this.match()?.id;
    if (!id) {
      return;
    }
    await this.matches.leaveDoublesMatch(id);
    void this.load(id);
  }

  protected openComplete(): void {
    this.completing.set(true);
  }

  protected closeComplete(): void {
    this.completing.set(false);
  }

  /** winnerId null logs the match as done with no result — see canComplete()'s comment. */
  protected async submitResult(winnerId: string | null): Promise<void> {
    const id = this.match()?.id;
    if (!id) {
      return;
    }
    this.completingBusy.set(true);
    await this.matches.completeMatch(id, winnerId);
    this.completingBusy.set(false);
    this.completing.set(false);
    void this.load(id);
  }

  // Own profile has no /players/:id entry — route there instead when a roster slot is me (mirrors
  // playerALink/playerBLink above).
  protected participantLink(id: string | undefined): string {
    return id === this.myId() ? '/profile' : `/players/${id}`;
  }

  protected genderClass(gender: string | undefined): string {
    return gender ? (GENDER_CLASSES[gender] ?? 'bg-lime text-ink') : 'bg-lime text-ink';
  }

  protected genderIcon(gender: string | undefined): 'gender-male' | 'gender-female' | 'gender-nonbinary' | undefined {
    return gender ? GENDER_ICONS[gender] : undefined;
  }

  private async load(id: string): Promise<void> {
    this.matchRaw.set(undefined);
    this.matchRaw.set(id ? await this.matches.getById(id) : null);
  }
}
