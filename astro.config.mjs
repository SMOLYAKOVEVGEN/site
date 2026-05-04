import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react(), tailwind()],
  image: {
    domains: ['static.wixstatic.com', 'images.unsplash.com']
  },
  server: {
    host: true
  },
  vite: {
    server: {
      fs: {
        allow: ['.']
      }
    }
  }
});
