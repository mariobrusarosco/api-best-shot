export const isNullable = (value: any) => {
  return value === null || value === undefined;
};

export const safeDate = (date: any) =>
  date === null || date === undefined ? null : new Date(date);
export const safeString = (str: any) =>
  str === null || str === undefined ? null : String(str);

export const toNumberOrNull = (val: string | null | undefined) => {
  if (val === '' || val === null || undefined) return null;

  return Number(val);
};

export const toNumberOrZero = (val: string | null | undefined) => {
  if (val === '' || val === null || undefined) return 0;

  return Number(val);
};
