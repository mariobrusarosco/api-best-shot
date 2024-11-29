export const isNullable = (value: any) => {
  return value === null || value === undefined;
};

export const safeDate = (date: any) =>
  date === null || date === undefined ? null : new Date(date);
export const safeString = (str: any) =>
  str === null || str === undefined ? null : String(str);
