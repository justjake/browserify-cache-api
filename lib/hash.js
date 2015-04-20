const crypto = require('crypto');

// always invalidate caches when Phoenix's version changes, since we might have
// changed the way things compile. Better to have a bit more slowness then bad
// results.
const VERSION = require('../package.json').version;
const HASH_ALGO = 'sha1';

// hashes are versioned so we invalidate when changing hashing methods.
function hash(data) {
  const digest = crypto.createHash(HASH_ALGO);
  digest.update(data);
  return digest.digest('hex') + '.v' + VERSION;
}

module.exports = hash;
