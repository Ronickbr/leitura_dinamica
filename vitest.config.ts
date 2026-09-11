import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
 resolve: { alias: { '@': resolve(__dirname, '.') } },
 test: { include: ['tests/**/*.test.ts'], exclude: ['tests/firestore.rules.test.ts'], environment: 'node',
  testTimeout: 15000, hookTimeout: 30000 },
});
