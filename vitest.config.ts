import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig({plugins:[react()],define:{__APP_VERSION__:JSON.stringify(pkg.version)},test:{environment:'jsdom',setupFiles:'./src/tests/setup.ts',globals:true,include:['src/tests/**/*.test.{ts,tsx}']}});
