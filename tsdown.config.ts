import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  platform: 'neutral',
  outDir: 'dist',
  dts: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
})
