/**
 * Converts a plain object of filter/query values into a record suitable for
 * Angular HttpClient `params` (via HttpParamsOptions). Framework-independent:
 * only string/number/boolean/undefined values are emitted; undefined/null and
 * empty strings are dropped.
 */
export function toQueryParams(
  source: Record<string, string | number | boolean | undefined | null>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }

    result[key] = String(value);
  }

  return result;
}
