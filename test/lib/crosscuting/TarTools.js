const TarTools = require('../../../lib/crosscuting/TarTools');

describe('Tar tools', function() {
  it('Build tar file and put it in a given path', function(done) {
    this.timeout(30000);
    const tarDir = '/tmp/mocha/clone/nebulae';
    TarTools.tarGz(tarDir, 'test', '.tar').subscribe(
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
    const tarDir = '/tmp/testTar.tar';
    TarTools.untarGz(tarDir, '/tmp/').subscribe(
      data => {
      },
      error => {
        return done(new Error(error));
      },
      () => {
        return done();
      }
    );
  });
});
