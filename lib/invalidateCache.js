var assertExists = require('./assertExists');
var invalidateModifiedFiles = require('./invalidateModifiedFiles');

export default function invalidateCache(hashes, cache) {
  assertExists(hashes);

  return invalidateModifiedFiles(hashes, Object.keys(cache), function(file) {
    delete cache[file];
  });
}
