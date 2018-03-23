'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');

const rxjs_marbles = require('rxjs-marbles');
const marbles = rxjs_marbles.marbles;

const Rx = require('rxjs');
const GitTools = require('../../../lib/crosscuting/GitTools');

const crash = err => {
  throw err;
};

describe('GitHub Repository tools', function() {
  describe('Git Clone', function() {
    it('Clone a git repository and put it in a given path', function(done) {
      this.timeout(30000);
      const cloneDir = '/tmp/mocha/clone/nebulae/';
      GitTools.clone$(
        'https://github.com/NebulaEngineering/nebulae.git',
        cloneDir
      ).subscribe(
        () => {},
        error => {
          return done(new Error(error));
        },
          () => {            
          return done();
        }
      );
    });
  });
});
