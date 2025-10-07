import type { Bindings } from './types';

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { registerDefaultAdapters } from '@adapters/claudeToOthers';
import { configsRoute } from '@routes/configs';

registerDefaultAdapters();

const app = new Hono<{ Bindings: Bindings }>();

app.route('/', configsRoute);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error(err);
  return c.text('Internal Server Error', 500);
});

export default app;
