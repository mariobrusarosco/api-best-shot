import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import mime from 'mime-types';
import { Profiling } from './services/profiling';
import puppeteer from 'puppeteer';

export const isNullable = (value: any) => {
  return value === null || value === undefined;
};

export const safeDate = (date: any) =>
  date === null || date === undefined ? null : new Date(date);

export const safeISODate = (date: any) => {
  console.log(date, typeof date, new Date(date), typeof new Date(date));

  return date === null || date === undefined ? null : new Date(date).toISOString();
};


export const safeString = (str: any, fallback: string = '') =>
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
export { fetchAndStoreAssetFromApi, FetchAndStoreAssetPayload } from './utils/assets-fetch';