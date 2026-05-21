export function createId(prefix = 'id') {
  const cryptoRandom = globalThis.crypto?.randomUUID?.();

  if (cryptoRandom) {
    return `${prefix}_${cryptoRandom}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
