import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    port: 9090,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: 'app',
    }),
    viteReact(),
    tailwindcss(),
  ],
});
