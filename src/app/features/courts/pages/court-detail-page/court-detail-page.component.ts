import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { COURT_REPORT_REASONS, Court, CourtPhoto, CourtReportReason, mapCoordsFor } from '../../../../core/models';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { MapMarker, RallyMapComponent } from '../../../../shared/components';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { BackLinkComponent, ChipComponent, IconComponent, SectionHeaderComponent, StatComponent } from '../../../../shared/ui';
import { CourtsService } from '../../courts.service';

const MAX_PHOTOS = 3;

@Component({
  selector: 'rally-court-detail-page',
  imports: [
    RouterLink,
    StatComponent,
    ChipComponent,
    IconComponent,
    SectionHeaderComponent,
    RallyMapComponent,
    BackLinkComponent,
    TranslatePipe
  ],
  templateUrl: './court-detail-page.component.html',
  styleUrl: './court-detail-page.component.scss'
})
export class CourtDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translation = inject(TranslationService);
  protected readonly courts = inject(CourtsService);
  protected readonly auth = inject(AuthService);

  protected readonly courtId = toSignal(this.route.paramMap.pipe(map(params => params.get('courtId') ?? '')), {
    initialValue: ''
  });

  protected readonly court = signal<Court | null>(null);
  protected readonly loading = signal(true);
  /** The other courts in the same venue — the collection unit is the court, so siblings matter. */
  protected readonly siblings = signal<Court[]>([]);
  protected readonly photos = signal<CourtPhoto[]>([]);
  protected readonly uploading = signal(false);
  protected readonly reported = signal(false);
  protected readonly reportOpen = signal(false);
  protected readonly reportReasons = COURT_REPORT_REASONS;

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly canAddPhoto = computed(
    () => !this.auth.isObserver() && this.photos().length < MAX_PHOTOS && !this.uploading()
  );
  protected readonly isDraft = computed(() => this.court()?.venue.status === 'draft');
  // Requires a real signed-in uid before comparing, the same way MatchDetailPageComponent's
  // isParticipant() does: `createdBy` is undefined on an orphaned venue (its author deleted their
  // account — venues.created_by is ON DELETE SET NULL), and an observer's currentUserId() is also
  // undefined, so a bare === would make every observer the "owner" of every orphaned venue.
  protected readonly isMine = computed(() => {
    const uid = this.auth.currentUserId();
    return !!uid && this.court()?.venue.createdBy === uid;
  });

  /** Real coordinates, projected onto the stylised map rather than invented. */
  protected readonly markers = computed<MapMarker[]>(() => {
    const court = this.court();
    if (!court) {
      return [];
    }
    const { x, y } = mapCoordsFor(court.venue.lat, court.venue.lng);
    return [{ id: court.id, x, y, kind: 'court', active: true, label: court.venue.name }];
  });

  constructor() {
    effect(() => {
      const id = this.courtId();
      untracked(() => {
        void this.load(id);
      });
    });
  }

  private async load(id: string): Promise<void> {
    if (!id) {
      return;
    }
    this.loading.set(true);
    const court = await this.courts.loadCourt(id);
    this.court.set(court);
    this.loading.set(false);
    if (!court) {
      return;
    }
    const [siblings, photos, reportedIds] = await Promise.all([
      this.courts.courtsForVenue(court.venueId),
      this.courts.photosFor(court.id),
      this.courts.reportedCourtIds()
    ]);
    this.siblings.set(siblings.filter(c => c.id !== court.id));
    this.photos.set(photos);
    this.reported.set(reportedIds.has(court.id));
  }

  protected async capture(): Promise<void> {
    const court = this.court();
    if (!court) {
      return;
    }
    await this.courts.capture(court);
    await this.load(court.id);
  }

  protected async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const court = this.court();
    if (!file || !court) {
      return;
    }
    this.uploading.set(true);
    const photo = await this.courts.addPhoto(court.id, file);
    if (photo) {
      this.photos.update(list => [...list, photo]);
    }
    this.uploading.set(false);
  }

  protected async removePhoto(photo: CourtPhoto): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      message: this.translation.t('courts.removePhotoConfirm'),
      confirmLabel: this.translation.t('courts.removePhoto'),
      cancelLabel: this.translation.t('common.cancel'),
      tone: 'destructive'
    });
    if (!confirmed) {
      return;
    }
    if (await this.courts.removePhoto(photo)) {
      this.photos.update(list => list.filter(p => p.id !== photo.id));
    }
  }

  /** Same undefined-equals-undefined trap as isMine(): an orphaned photo has no uploader. */
  protected canRemovePhoto(photo: CourtPhoto): boolean {
    const uid = this.auth.currentUserId();
    return !!uid && (photo.uploadedBy === uid || this.isMine());
  }

  protected async report(reason: CourtReportReason): Promise<void> {
    const court = this.court();
    if (!court) {
      return;
    }
    this.reportOpen.set(false);
    if (await this.courts.report(court.id, reason)) {
      this.reported.set(true);
    }
  }

  protected courtName(court: Court): string {
    return court.number ?? this.translation.t('courts.unnumbered');
  }
}
