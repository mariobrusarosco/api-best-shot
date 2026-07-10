/// <reference types="@cloudflare/workers-types" />

import { Container, getContainer } from '@cloudflare/containers';

export class ApiContainer extends Container {
  defaultPort = 3000;
  sleepAfter = '10m';
  envVars = {
    NODE_ENV: 'production',
    PORT: '3000',
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

type Env = {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return getContainer(env.API_CONTAINER, 'api').fetch(request);
  },
} satisfies ExportedHandler<Env>;
