import { Injectable, inject } from '@angular/core';
import { RallyDataService } from '../../../core/data/rally-data.service';
import { Court } from '../../../core/models';

@Injectable({ providedIn: 'root' })
export class CourtsRepository {
  private readonly data = inject(RallyDataService);

  getAll(): Court[] {
    return this.data.courts();
  }

  getById(id: string): Court | undefined {
    return this.data.courtById(id);
  }

  get surfaces(): readonly string[] {
    return this.data.surfaces;
  }
}
