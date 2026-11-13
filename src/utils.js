export const isDebug = process.argv.includes('--debug') || process.env.npm_config_debug === 'true';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const debug = (...args) => {
  if (isDebug) console.log(`\x1b[38;5;244m[DEBUG ${new Date().toLocaleTimeString('tr-TR')}]\x1b[0m`, ...args);
};
