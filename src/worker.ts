import handler from '@tanstack/react-start/server-entry';
import app from './index';
import { isApiRequest } from './worker-routing';

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    if (isApiRequest(request)) {
      return app.fetch(request, env, ctx);
    }
    return handler.fetch(request, env, ctx);
  },
};
