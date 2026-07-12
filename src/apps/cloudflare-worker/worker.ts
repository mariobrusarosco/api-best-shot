/// <reference types="@cloudflare/workers-types" />

import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

declare global {
  namespace Cloudflare {
    interface Env {
      DATABASE_URL: string;
      ASSET_BASE_URL: string;
    }
  }
}

export class ApiContainer extends Container {
  defaultPort = 3000;
  sleepAfter = '10m';
  envVars = {
    NODE_ENV: 'production',
    PORT: '3000',
    DATABASE_URL: env.DATABASE_URL,
    ASSET_BASE_URL: env.ASSET_BASE_URL,
  };

  override onStart() {
    console.log('Football Platform API container started');
  }

  override onStop({ exitCode, reason }: { exitCode: number; reason: string }) {
    console.log('Football Platform API container stopped', { exitCode, reason });
  }

  override onError(error: unknown) {
    console.error('Football Platform API container error', error);
    throw error;
  }
}

type WorkerEnv = Cloudflare.Env & {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    return getContainer(env.API_CONTAINER, 'api').fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;
