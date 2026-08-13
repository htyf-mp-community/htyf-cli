import { createRequire } from 'node:module';

export const requireCjs = createRequire(import.meta.url);
