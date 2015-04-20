var assertExists = require('./assertExists');
var invalidateModifiedFiles = require('./invalidateModifiedFiles');

function invalidateCache(hashes, cache, done) {
  assertExists(hashes);

  invalidateModifiedFiles(hashes, Object.keys(cache), function(file) {
    delete cache[file];
  }, done)
}

module.exports = invalidateCache;
