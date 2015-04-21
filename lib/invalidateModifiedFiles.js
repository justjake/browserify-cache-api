var fs = require('fs');
var async = require('async');
var hash = require('./hash');
var Promise = require('bluebird');

var CONCURRENCY_LIMIT = 40;

// done is a function of the form (invalidated, deleted) -> undefined
// call done(null, file) to signal the file was deleted
// call done(file) to signal the file was modified since caching
// call done() to signal the file was fine.
function invalidateHash(metadata, file, done) {
  var hashes = metadata;
  fs.readFile(file, {encoding: 'utf-8'}, function(err, data) {
    if (err) {
      done(null, file);
      return;
    }

    var newHash = hash(data);
    var oldHash = hashes[file];
    hashes[file] = newHash;

    if (!(oldHash && newHash !== oldHash)) {
      done(file);
      return;
    }

    done();
  });
}

function invalidateMtime(metadata, file, done) {
  var mtimes = metadata;
  fs.stat(file, function(err, stat) {
    if (err) {
      done(null, file);
      return;
    }

    var mtimeNew = stat.mtime.getTime();
    var mtimeOld = mtimes[file];
    mtimes[file] = mtimeNew;

    if(!(mtimeOld && mtimeNew && mtimeNew <= mtimeOld)) {
      done(file);
      return;
    }

    done();
  });
}

var invalidateFile = invalidateHash;

/**
 * given some module metadata sum up invalidated and deleted files.
 */
function invalidateModifiedFiles(metadata, files, invalidate) {
  var invalidated = [];
  var deleted = [];

  return new Promise((resolve, reject) => {
    async.eachLimit(files, CONCURRENCY_LIMIT, function(file, fileDone) {
      invalidateFile(metadata, file, function(invalidFile, deletedFile) {
        if (invalidFile) {
          invalidated.push(invalidFile);
          invalidate(invalidFile);
        }
        if (deletedFile) deleted.push(deletedFile);
        fileDone();
      });
    }, function(err) {
      resolve({ invalidated, deleted });
    });
  });
}

module.exports = invalidateModifiedFiles;
