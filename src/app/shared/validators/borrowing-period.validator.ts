import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MIN_BORROWING_PERIOD_DAYS = 1;
export const MAX_BORROWING_PERIOD_DAYS = 30;

/**
 * Mirrors the backend rule "borrowingPeriodDays must be between 1 and 30".
 * The backend remains authoritative; this only improves UX.
 */
export function borrowingPeriodValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null; // let `required` handle emptiness
    }

    const numeric = Number(value);

    if (
      !Number.isInteger(numeric) ||
      numeric < MIN_BORROWING_PERIOD_DAYS ||
      numeric > MAX_BORROWING_PERIOD_DAYS
    ) {
      return {
        borrowingPeriod: { min: MIN_BORROWING_PERIOD_DAYS, max: MAX_BORROWING_PERIOD_DAYS },
      };
    }

    return null;
  };
}
