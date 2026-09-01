import { Pipe, PipeTransform } from '@angular/core';

type RelativeUnits = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

const UNIT_SECONDS: readonly [RelativeUnits, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/**
 * Renders a timestamp as human-friendly relative text, e.g. "5 minutes ago".
 * Requires an Intl.RelativeTimeFormat-capable runtime.
 */
@Pipe({
  name: 'relativeTime',
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffSeconds) < 60) {
      return 'just now';
    }

    for (const [unit, seconds] of UNIT_SECONDS) {
      if (Math.abs(diffSeconds) >= seconds) {
        return formatter.format(Math.round(diffSeconds / seconds), unit);
      }
    }

    return 'just now';
  }
}
