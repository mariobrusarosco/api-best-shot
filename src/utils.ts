// No imports needed for these utility functions

export const isNullable = (value: unknown) => {
  return value === null || value === undefined;
};

export const safeDate = (date: string | number | Date | null | undefined) =>
  date === null || date === undefined ? null : new Date(date as string | number | Date);

export const safeISODate = (date: string | number | Date | null | undefined) => {
  if (date === null || date === undefined) return null;
  const parsedDate = new Date(date as string | number | Date);
  return parsedDate.toISOString();
};

export const safeString = (str: unknown, fallback: string | null = '') =>
  str === null || str === undefined ? fallback : String(str);

export const toNumberOrNull = (val: string | null | undefined) => {
  if (val === '' || val === null || undefined) return null;

  return Number(val);
};

export const toNumberOrZero = (val: string | null | undefined) => {
  if (val === '' || val === null || undefined) return 0;

  return Number(val);
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Re-export asset fetch functions and types
export {
  fetchAndStoreAssetFromApi,
  FetchAndStoreAssetPayload,
} from './utils/assets-fetch';
