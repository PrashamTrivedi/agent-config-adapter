import { Hono } from 'hono';
import { layout } from '../views/layout';
import { cliPage } from '../views/cli';

type Bindings = {
  WEB_ANALYTICS_TOKEN?: string;
};

export const cliRouter = new Hono<{ Bindings: Bindings }>();

cliRouter.get('/', (c) => {
  return c.html(layout('CLI', cliPage(), c));
});
