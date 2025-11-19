import { Hono } from 'hono';
import type { Env } from '../domain/types';
import { layout } from '../views/layout';
import {
	noCodeBuildersPage,
	multiToolOrgsPage,
	aiPilotTeamsPage,
} from '../views/onboarding';
import { AnalyticsService } from '../services/analytics-service';

const app = new Hono<{ Bindings: Env }>();

app.get('/onboarding/no-code-builders', async (c) => {
	const analytics = new AnalyticsService(c.env);
	await analytics.trackEvent(c.req.raw, 'onboarding_view', {
		onboardingICP: 'no-code-builders',
	});

	return c.html(layout('No-Code/Low-Code Builders', noCodeBuildersPage()));
});

app.get('/onboarding/multi-tool-orgs', async (c) => {
	const analytics = new AnalyticsService(c.env);
	await analytics.trackEvent(c.req.raw, 'onboarding_view', {
		onboardingICP: 'multi-tool-orgs',
	});

	return c.html(layout('Multi-Tool Organizations', multiToolOrgsPage()));
});

app.get('/onboarding/ai-pilot-teams', async (c) => {
	const analytics = new AnalyticsService(c.env);
	await analytics.trackEvent(c.req.raw, 'onboarding_view', {
		onboardingICP: 'ai-pilot-teams',
	});

	return c.html(layout('AI Pilot Teams', aiPilotTeamsPage()));
});

export default app;
