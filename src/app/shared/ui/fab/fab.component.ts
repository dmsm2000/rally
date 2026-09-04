import { Component, computed, input, output } from '@angular/core';

/**
 * The floating action button used by the feed, courts, matches, world and messages surfaces.
 *
 * Content is projected rather than passed as a string input because the messages FAB layers an
 * unread badge over its emoji; everything else hands it a single character.
 */
@Component({
  selector: 'ui-fab',
  templateUrl: './fab.component.html',
  styleUrl: './fab.component.scss'
})
export class FabComponent {
  readonly ariaLabel = input('');
  /** The messages FAB is placed by its own wrapper, so it opts out of the shared fixed corner. */
  readonly fixed = input(true);
  readonly action = output<void>();

  // Sits clear of the mobile bottom nav, and moves in on large screens where that nav is gone.
  protected readonly classes = computed(
    () =>
      'rally-fab flex size-14 cursor-pointer items-center justify-center rounded-full bg-lime text-2xl shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl ' +
      (this.fixed()
        ? 'fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 lg:right-6 lg:bottom-[6.25rem]'
        : 'relative')
  );
}
