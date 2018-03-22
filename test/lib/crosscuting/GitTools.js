'use strict'
process.env.NODE_ENV = 'test';

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();
const done = chai.done;

const rxjs_marbles = require('rxjs-marbles');
const marbles = rxjs_marbles.marbles;

const Rx = require('rxjs');
const GitTools = require('../../../lib/crosscuting/GitTools');

const crash = (err) => { throw err }

describe("GitHub Repository tools", function () {
    describe("Git Clone", function () {
        it("Clone a git repository and put it in a given path", function () {
            const cloneDir = '/tmp/mocha/clone/nebulae/';
            const expectedDir = `${cloneDir}/nebulae/`;
            GitTools.clone('https://github.com/NebulaEngineering/nebulae.git', cloneDir)
                .subscribe(
                    (next) => console.log(`==next===${next}==`), //assert.equal(next,expect,`The output directory does not match: '${expect}' vs '${next}' `),
                    (error) => {
                        console.error(error);
                        done();
                    },
                    () => {
                        console.log(`==done====`);
                        done();
                    }
                );
        });
    });
});
