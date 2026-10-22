// Keep aligned with package.json; build.mjs checks this before publishing.
export const VERSION = '3.9.4';
export function versioned(relative, base) { const url = new URL(relative, base); url.searchParams.set('v', VERSION); return url.href; }
