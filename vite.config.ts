import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const frontendRoot = path.resolve(__dirname, 'frontend');
    const env = loadEnv(mode, frontendRoot, '');
    return {
      root: frontendRoot,
      envDir: frontendRoot,
      build: {
        outDir: path.resolve(frontendRoot, 'dist'),
      },
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': frontendRoot,
        }
      }
    };
});
