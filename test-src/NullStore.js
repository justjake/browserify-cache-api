import { test } from 'tap';
import NullStore from '../dist/stores/NullStore';

test('returns an empty object from loadSync', (t) => {
  const store = new NullStore();
  t.deepEquals(store.loadSync(), {}, 'loadSync is empty object');
  t.end();
});

test('runs callback immidiatley with no error', (t) => {
  const store = new NullStore();
  store.store(null, (err) => {
    t.notOk(err, 'no error');
    t.end();
  });
});
