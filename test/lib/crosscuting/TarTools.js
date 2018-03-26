const TarTools = require('../../../lib/crosscuting/TarTools');
var fs = require('fs');
var rimraf = require('rimraf');

describe('Tar tools', function() {
  describe('Prepare test scenario', function() {
    it('build mock Files', function(done) {
      this.timeout(5000);
      const tarDir = '/tmp/tarTest';
      if (!fs.existsSync(tarDir)) {
        fs.mkdirSync(tarDir);
        fs.writeFile(`${tarDir}/test.txt`, 'Hello', function(err) {
          if (err) throw err;
        });
      }
      return done();
    });
  });
  describe('Tar Untar test', function() {
    it('Build tar file and put it in a given path', function(done) {
      this.timeout(30000);
      const tarDir = '/tmp/tarTest';
      TarTools.tarGz(tarDir, '', '.tar').subscribe(
        () => {},
        error => {
          return done(new Error(error));
        },
        () => {
          return done();
        }
      );
    });
    it('Untar file and put it in a given path', function(done) {
      this.timeout(30000);
      const tarDir = '/tmp/tarTest.tar';
      TarTools.untarGz(tarDir, '/tmp/').subscribe(
        data => {},
        error => {
          return done(new Error(error));
        },
        () => {
          return done();
        }
      );
    });
  });

  describe('Clear scenario', function() {
    it('Clear test scenario', function(done) {
      this.timeout(5000);
      if (fs.existsSync('/tmp/tarTest.tar')) {
        fs.unlink('/tmp/tarTest.tar', function(err) {
          if (err) throw err;
        });
      }
      if (fs.existsSync('/tmp/tarTest')) {
        rimraf('/tmp/tarTest', function() {});
      }
      return done();
    });
  });
});
