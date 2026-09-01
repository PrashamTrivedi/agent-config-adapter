import { spawnSync } from 'node:child_process';

if (process.env.WORKERS_CI !== '1') {
  process.exit(0);
}

console.log('Workers CI detected — running vite build so wrangler can deploy the Start bundle');
const result = spawnSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
