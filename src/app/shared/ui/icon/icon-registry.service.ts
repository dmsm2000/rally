import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

/** Fetches raw markup from public/assets/icons/*.svg and caches it so each file is only ever requested once. */
@Injectable({ providedIn: 'root' })
export class IconRegistryService {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, Promise<SafeHtml>>();

  load(url: string): Promise<SafeHtml> {
    let entry = this.cache.get(url);
    if (!entry) {
      entry = firstValueFrom(this.http.get(url, { responseType: 'text' })).then(svg =>
        this.sanitizer.bypassSecurityTrustHtml(svg)
      );
      this.cache.set(url, entry);
    }
    return entry;
  }
}
