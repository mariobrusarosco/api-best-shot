import { env } from '@/config/env';
import { createApiApp } from './app';

const app = createApiApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Best Shot API listening on port ${env.PORT}`);
});
