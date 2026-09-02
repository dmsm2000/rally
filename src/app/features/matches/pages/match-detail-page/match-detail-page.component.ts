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
  // Own profile has no /players/:id entry — route there instead when a slot is me.
  protected readonly playerALink = computed(() =>
    this.match()?.playerA === this.myId() ? '/profile' : `/players/${this.match()?.playerA}`
  );
  protected readonly playerBLink = computed(() =>
    this.match()?.playerB === this.myId() ? '/profile' : `/players/${this.match()?.playerB}`
  );
  protected readonly court = computed(() => this.match() && this.matches.courtById(this.match()!.courtId));
  protected readonly done = computed(() => this.match()?.status === 'complete');
  // Only a full match has a winner — a hitting session or drill has no result to record/announce.
  protected readonly isFullMatch = computed(() => this.match()?.sessionType === 'FullMatch');
  protected readonly aWon = computed(() => this.match()?.winner === this.match()?.playerA);

  protected readonly myId = this.auth.currentUserId;
  protected readonly isParticipant = computed(() => {
    const m = this.match();
    return !!m && (m.playerA === this.myId() || m.playerB === this.myId());
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
