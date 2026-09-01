import { CanDeactivateFn } from '@angular/router';

export interface CanComponentDeactivate {
  canDeactivate(): boolean | Promise<boolean>;
}

/** Generic CanDeactivate guard — delegates to whichever component implements CanComponentDeactivate. */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = component => component.canDeactivate();
