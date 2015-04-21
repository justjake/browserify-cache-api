/**
 * The NullStore performs no-ops instead of actually storing or loading cache
 * data.
 */
export default class NullStore {
  loadSync() { return {}; }
  store(b, done) { if (done) done(); }
}
