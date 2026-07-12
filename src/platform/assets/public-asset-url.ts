import { env } from '../config/env';

const assetBaseUrl = env.ASSET_BASE_URL.replace(/\/+$/, '');

export const buildPublicAssetUrl = (objectKey: string | null): string | null => {
  if (objectKey === null) {
    return null;
  }

  return `${assetBaseUrl}/${objectKey}`;
};
