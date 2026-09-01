import { Pipe, PipeTransform } from '@angular/core';

export const CAIRO_TIME_ZONE = 'Africa/Cairo';

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAIRO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: CAIRO_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/**
 * Renders timestamps in the library's display timezone (Africa/Cairo, UTC+3),
 * independent of the viewing device's settings.
 * - `{{ value | cairoTime }}`        → "17:45"
 * - `{{ value | cairoTime:'full' }}` → "28 Aug 2026, 17:45"
 */
@Pipe({
  name: 'cairoTime'
})
export class CairoTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, style: 'time' | 'full' = 'time'): string {
    if (!value) {
      return '';
    }

    const date = typeof value === 'string' ? new Date(value) : value;

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return style === 'full' ? DATE_TIME_FORMATTER.format(date) : TIME_FORMATTER.format(date);
  }
}
