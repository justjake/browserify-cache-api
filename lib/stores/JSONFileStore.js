/**
 * The JSON file store stores the bare cache object to a given filename using
 * JSON. No special cache transforms are used.
 */
import { getCache } from '../utils';
import fs from 'fs';

export default class JSONFileStore {
  constructor(filename) {
    this.filename = filename;
  }

  loadSync(b) {
    var cacheData = {};
    try {
      cacheData = JSON.parse(fs.readFileSync(this.filename, {encoding: 'utf8'}));
    } catch (err) {
      // no existing cache file
      b.emit('_cacheFileReadError', err);
    }
    return cacheData;
  }

  store(b, done) {
    const cache = getCache(b);
    fs.writeFile(this.filename, JSON.stringify(cache, null, '  '), {encoding: 'utf8'}, (err) => {
      if (err) b.emit('_cacheFileWriteError', err);
      else b.emit('_cacheFileWritten', this.filename);
      if (done) done(err);
    });
  }
}

