#!/usr/bin/env node

var browserify = require('browserify');
var through = require('through2')

var bundler = browserify('./test/wat.js');

console.log(bundler.pipeline.get('deps'))

function installHandlers() {
  bundler.pipeline.get('deps').push(through.obj(function(row, enc, next) {
    console.log('saw dep', row, enc, next);
    this.push(row);
    next();
  }));
}

bundler.on('reset', installHandlers);
bundler.on('dep', console.log.bind(console, 'saw dep event'));
bundler.on('transform', console.log.bind(console, 'saw transform event'));
installHandlers();

console.log('>>>> FIRST 1');
bundler.bundle(function(err, result) {
  console.log('<<<< SECOND 2');
  bundler.bundle();
})
