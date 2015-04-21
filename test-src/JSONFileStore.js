require('source-map-support').install();
import { test } from 'tap';
import path from 'path';
import mkdirp from 'mkdirp';
import fs from 'fs';

// test the compiled version
import { setCache } from '../dist/utils';
import JSONFileStore from '../dist/stores/JSONFileStore';

const basedir = path.resolve(__dirname, '../');
const outputdir = path.join(basedir, 'example','output','test','unit');
const jsons = path.join(outputdir, 'cache.json');

var data = {
  test: true,
  secret_key: {bob: 88},
};

var data2 = {
  secret_key: {frank: 91}
};

var b;

function beforeEach(t) {
  mkdirp(outputdir);
  fs.writeFileSync(jsons, JSON.stringify(data));
  b = require('browserify')();
}

test("loadSync loads JSON data from named file", function (t) {
  beforeEach(t);

  var jsonFileStore = new JSONFileStore(jsons);

  var loadedData = jsonFileStore.loadSync(b);

  t.deepEqual(loadedData, data, "loadSync data matched data");
  t.end();
});

test("store saves JSON data to the named file", function(t) {
  beforeEach(t);

  var store = new JSONFileStore(jsons);
  setCache(b, data2);

  store.store(b, function(err) {
    t.notOk(err, "no error during json file write");

    var loadedData = JSON.parse(fs.readFileSync(jsons));
    t.deepEqual(loadedData, data2, "store saved the right data to the file");
    t.end();
  });
});
