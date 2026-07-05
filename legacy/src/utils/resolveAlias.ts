import path from 'path';

export function resolveAlias(aliasPath: string): string {
  if (aliasPath.startsWith('@/')) {
    return path.join(__dirname, '../', aliasPath.replace('@/', ''));
  }
  return aliasPath;
}
