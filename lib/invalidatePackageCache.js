var assertExists = require('./assertExists');
var invalidateModifiedFiles = require('./invalidateModifiedFiles');

function invalidatePackageCache(hashes, cache, done) {
  assertExists(hashes);

  return invalidateModifiedFiles(hashes, Object.keys(cache).map(packageFileForPackagePath), function(file) {
    delete cache[packagePathForPackageFile(file)];
  });
}

var packagePathTrimLength = '/package.json'.length;

function packagePathForPackageFile(packageFilepath) {
  packageFilepath.slice(0, packageFilepath.length - packageFileTrimLength);
}

function packageFileForPackagePath(packagePath) {
  return path.join(packagePath, 'package.json');
}

module.exports = invalidatePackageCache;
