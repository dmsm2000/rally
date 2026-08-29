import { Pipe, PipeTransform } from '@angular/core';

/** Formats a distance in kilometres the way Rally shows it: short distances precise, long distances rounded to the nearest 100km. */
@Pipe({ name: 'distanceKm' })
export class DistanceKmPipe implements PipeTransform {
  transform(distanceKm: number): string {
    return distanceKm < 50 ? `${distanceKm} km` : `${Math.round(distanceKm / 100) / 10}k km`;
  }
}
