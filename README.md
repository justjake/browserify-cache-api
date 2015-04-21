# browserify-cache-api

api for caching and reusing discovered dependencies for browserify

jsdf/browserify-cache-api is used by [browserify-incremental](https://github.com/jsdf/browserify-incremental)
and [browserify-assets](https://github.com/jsdf/browserify-assets)

justjake/browserify-cache-api is used by no one, for any purpose.

```js
  var b = browserify(browserifyCache.args);
  browserifyCache(b, opts);
  // browserify dependency discovery and loading is now cached
```

![under construction](http://jamesfriend.com.au/files/under-construction.gif)

- [x] validate caches using file hashes instead of file mtimes.
- [ ] store finished bundle in cache for perfect validations.
- [ ] make metadata gathering and invalidation (hashing, mtimes, etc) pluggable.
- [ ] relativize paths in `cache.json` files to the Browserify `opts.basedir`.
- [ ] add pluggable cache backed systems which handle load and store of `Cache` instances.
  - would it be better to just provide the whole cache in the callback, and let the user handle that? In that case, also need to provide option hook for loading.
- [x] write new files in ES6
