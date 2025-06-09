export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  table?: string;
  schema?: string;
}
