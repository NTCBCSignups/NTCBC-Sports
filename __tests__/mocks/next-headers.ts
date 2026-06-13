// Stub for next/headers in test environment
export function headers() {
  return new Map();
}

export function cookies() {
  return { get: () => undefined, set: () => {}, delete: () => {} };
}
