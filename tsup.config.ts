import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    };
  },
});
