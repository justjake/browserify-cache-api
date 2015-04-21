var fs = require('fs');
var path = require('path');
var util = require('util');
var assert = require('assert');
var splicer = require('labeled-stream-splicer');
var through = require('through2');
var async = require('async');
var assign = require('xtend/mutable');

var assertExists = require('./assertExists');
var proxyEvent = require('./proxyEvent');
var Cache = require('./Cache');
var invalidateFilesPackagePaths = require('./invalidateFilesPackagePaths');
var invalidatePackageCache = require('./invalidatePackageCache');
var invalidateCache = require('./invalidateCache');
var invalidateDependentFiles = require('./invalidateDependentFiles');
var hash = require('./hash');

import JSONFileStore from './stores/JSONFileStore';
import NullStore from './stores/NullStore';
import { getCache, setCache } from './utils';

function BrowserifyCache(b, opts) {
  assertExists(b);
  opts = opts || {};

  if (BrowserifyCache.getCache(b)) return b; // already attached

  // certain opts must have been set when browserify instance was created
  assert(b._options.cache, "required browserify 'cache' opt not set");

  var cacheStore = opts.cacheStore || b._options && b._options.cacheStore || null;
  if (!cacheStore) {
    // backwards compatibility mode - use non-relative JSON file if cache unspecified
    // load cache from file specified by cacheFile opt
    var cacheFile = opts.cacheFile || opts.cachefile || b._options && b._options.cacheFile || null;
    // if no cacheStore was given, and no cacheFile was given, then go uncached using NullStore
    cacheStore = cacheFile ? new JSONFileStore(cacheFile) : new NullStore();
  }

  // TODO: use a promise here; make it so `bundler.bundle` only starts after
  //       the promise resolves.
  var cacheData = cacheStore.loadSync(b);
    //loadCacheData(b, cacheFile);

  // b._options.cache is a shared object into which loaded module cache is
  // merged. it will be reused for each build, and mutated when the cache is
  // invalidated.
  assign(b._options.cache, cacheData.modules);
  // removing this -- needed for relative paths and de-dupe sanity.
  //cacheData.modules = b._options.cache;

  var cache = Cache(cacheData);
  BrowserifyCache.setCache(b, cache);

  attachCacheHooksToPipeline(b);
  attachCacheDiscoveryHandlers(b);
  attachCachePersistHandler(b, cacheFile);

  return b;
}

BrowserifyCache.args = {cache: {}, packageCache: {}, fullPaths: true};

BrowserifyCache.getCache = getCache;
BrowserifyCache.setCache = setCache;

BrowserifyCache.getModuleCache = function(b) {
  var cache = BrowserifyCache.getCache(b);
  return cache.modules;
};

BrowserifyCache.getPackageCache = function(b) {
  var cache = BrowserifyCache.getCache(b);
  // rebuild packageCache from packages
  return Object.keys(cache.filesPackagePaths).reduce(function(packageCache, file) {
    packageCache[file] = cache.packages[cache.filesPackagePaths[file]];
    return packageCache;
  }, {});
};

function attachCacheHooksToPipeline(b) {
  var cache = BrowserifyCache.getCache(b);

  var prevBundle = b.bundle;
  b.bundle = function(cb) {
    var outputStream = through.obj();

    invalidateCacheBeforeBundling(b, function(err, invalidated) {
      if (err) return outputStream.emit('error', err);

      var bundleStream = prevBundle.call(b, cb);
      proxyEvent(bundleStream, outputStream, 'file');
      proxyEvent(bundleStream, outputStream, 'package');
      proxyEvent(bundleStream, outputStream, 'transform');
      proxyEvent(bundleStream, outputStream, 'error');
      bundleStream.pipe(outputStream);
    });

    return outputStream;
  };
}

function invalidateCacheBeforeBundling(b, done) {
  var cache = BrowserifyCache.getCache(b);

  invalidateFilesPackagePaths(cache.filesPackagePaths, function() {
    console.log('invalidateFilesPackagePaths done')
    invalidatePackageCache(cache.hashes, cache.packages, function() {
      console.log('invalidatePackageCache done')
      invalidateCache(cache.hashes, cache.modules, function(err, invalidated, deleted) {
        console.log('invalidateCache done')
        invalidateDependentFiles(cache, [].concat(invalidated, deleted), function(err) {
          console.log('invalidateDepenentFiles done')
          b.emit('changedDeps', invalidated, deleted);
          done(err, invalidated);
        });
      });
    });
  });
}

function attachCacheDiscoveryHandlers(b) {
  // copied from the latest in Watchify technology
  function installToPipeline() {
    b.pipeline.get('deps').push(through.obj(function(row, enc, next) {
      var _this = this;
      updateCacheOnDep(b, row, done);

      function done() {
        console.log('fnished row', row);
        _this.push(row);
        next();
      }
    }));
  }

  b.on('reset', installToPipeline);
  installToPipeline();

  b.on('transform', function(transformStream, moduleFile) {
    transformStream.on('file', function(dependentFile) {
      updateCacheOnTransformFile(b, moduleFile, dependentFile);
    });
  });
}

function updateCacheOnDep(b, dep, done) {
  console.log('started row', dep)
  var cache = BrowserifyCache.getCache(b);
  var file = dep.file || dep.id;
  if (typeof file === 'string') {
    if (dep.source != null) {
      cache.modules[file] = copyDep(dep);
      if (!cache.hashes[file]) {
        updateHash(cache.hashes, file, done);
        return;
      }
    } else {
      console.warn('missing source for dep', file);
    }
  } else {
    console.warn('got dep missing file or string id', file);
  }

  // all other synchronous cases must call done
  done();
}

function copyDep(dep) {
  return {
    id: dep.file,
    source: dep.source,
    deps: assign({}, dep.deps),
    file: dep.file,
  };
}

function updateCacheOnTransformFile(b, moduleFile, dependentFile) {
  var cache = BrowserifyCache.getCache(b);
  if (cache.dependentFiles[dependentFile] == null) {
    cache.dependentFiles[dependentFile] = {};
  }
  cache.dependentFiles[dependentFile][moduleFile] = true;
  if (!cache.hashes[dependentFile]) updateHash(cache.hashes, dependentFile);
}

function attachCachePersistHandler(b, cacheFile) {
  if (!cacheFile) return;

  b.on('bundle', function(bundleStream) {
    // store on completion
    bundleStream.on('end', function() {
      storeCache(b, cacheFile);
    });
  });
}

// TODO (jake): modify to use phoenix caching backend
function storeCache(b, cacheFile) {
  assertExists(cacheFile);

  var cache = BrowserifyCache.getCache(b);
  fs.writeFile(cacheFile, JSON.stringify(cache), {encoding: 'utf8'}, function(err) {
    if (err) b.emit('_cacheFileWriteError', err);
    else b.emit('_cacheFileWritten', cacheFile);
  });
}


// TODO (jake): modify to use phoenix caching backend.
function loadCacheData(b, cacheFile) {
  var cacheData = {};

  if (cacheFile) {
    try {
      cacheData = JSON.parse(fs.readFileSync(cacheFile, {encoding: 'utf8'}));
    } catch (err) {
      // no existing cache file
      b.emit('_cacheFileReadError', err);
    }
  }

  return cacheData;
}

// TODO (jake): replace callsites with updateHash.
function updateMtime(mtimes, file) {
  assertExists(mtimes);
  assertExists(file);

  fs.stat(file, function(err, stat) {
    if (!err) mtimes[file] = stat.mtime.getTime();
  });
}

function updateHash(hashes, file, done) {
  assertExists(hashes);
  assertExists(file);

  fs.readFile(file, {encoding: 'utf-8'}, function(err, data) {
    if (!err) hashes[file] = hash(data);
    if (done) done();
  });
}

module.exports = BrowserifyCache;
