import type { Bindings } from '../types';
import type { ConfigCreateInput } from '@domain/config';

import { Hono } from 'hono';
import { z } from 'zod';

import { ConfigService } from '@domain/configService';
import { D1ConfigRepository } from '@infrastructure/d1Repository';
import { KVConfigCache } from '@infrastructure/kvCache';
import { detailView } from '@views/detail';
import { homeView } from '@views/home';
import { layout } from '@views/layout';

const baseSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['slash_command', 'agent_definition', 'mcp_config']),
  originalFormat: z.enum(['claude_code', 'codex_agents', 'jules_manifest']),
  content: z.string().min(1),
});

const formSchema = baseSchema;

const updateSchema = baseSchema.partial();

const parseForm = async (request: Request): Promise<ConfigCreateInput> => {
  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());
  const parsed = formSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  return parsed.data;
};

const parseJson = async <T>(request: Request, schema: z.ZodType<T>): Promise<T> => {
  const data = await request.json();
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(', '));
  }

  return parsed.data;
};

const createService = (env: Bindings): ConfigService => {
  const repository = new D1ConfigRepository(env.DB);
  const cache = new KVConfigCache(env.CONFIG_CACHE);
  return new ConfigService(repository, cache);
};

export const configsRoute = new Hono<{ Bindings: Bindings }>();

configsRoute.get('/', async (c) => {
  const service = createService(c.env);
  const configs = await service.list();
  const body = homeView(configs);
  return c.html(layout('Agent Config Adapter', body));
});

configsRoute.get('/configs/:id', async (c) => {
  const service = createService(c.env);
  const config = await service.get(c.req.param('id'));

  if (!config) {
    return c.notFound();
  }

  const withConversions = await service.getWithConversions(config);
  return c.html(layout(config.name, detailView(withConversions)));
});

configsRoute.post('/configs', async (c) => {
  try {
    const service = createService(c.env);
    const input = await parseForm(c.req.raw);
    await service.create(input);

    if (c.req.header('HX-Request')) {
      const configs = await service.list();
      return c.html(homeView(configs, 'Configuration saved!'));
    }

    return c.redirect('/');
  } catch (error) {
    const message = (error as Error).message;
    if (c.req.header('HX-Request')) {
      const service = createService(c.env);
      const configs = await service.list();
      return c.html(homeView(configs, `Error: ${message}`), 400);
    }

    return c.text(`Failed to save configuration: ${message}`, 400);
  }
});

configsRoute.get('/api/configs', async (c) => {
  const service = createService(c.env);
  const configs = await service.list();
  return c.json(configs);
});

configsRoute.post('/api/configs', async (c) => {
  try {
    const service = createService(c.env);
    const input = await parseJson(c.req.raw, formSchema);
    const created = await service.create(input);
    return c.json(created, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

configsRoute.get('/api/configs/:id', async (c) => {
  const service = createService(c.env);
  const config = await service.get(c.req.param('id'));

  if (!config) {
    return c.notFound();
  }

  const withConversions = await service.getWithConversions(config);
  return c.json(withConversions);
});

configsRoute.put('/api/configs/:id', async (c) => {
  try {
    const service = createService(c.env);
    const input = await parseJson(c.req.raw, updateSchema);
    const updated = await service.update(c.req.param('id'), input);

    if (!updated) {
      return c.notFound();
    }

    return c.json(updated);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

configsRoute.delete('/api/configs/:id', async (c) => {
  const service = createService(c.env);
  await service.delete(c.req.param('id'));
  return c.body(null, 204);
});

export type ConfigsRoute = typeof configsRoute;
