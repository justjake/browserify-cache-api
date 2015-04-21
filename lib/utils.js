/**
 * cache control utilities
 */

export function getCache(b) {
  return b.__cacheObjects;
}

export function setCache(b, cache) {
  b.__cacheObjects = cache;
}
