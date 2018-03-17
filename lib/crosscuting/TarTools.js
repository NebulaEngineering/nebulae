'use strict'

const tar = require('tar');
const os = require('os');
const Rx = require('rxjs');
const separator = require('path').sep;

class TarTools {

    /**
     * Compress a directory using tar.gz and map the result to the generated target file path
     * @param {String} source directory to compress
     * @param {String} tarName target file name
     */
    static tarGgz(source, tarName) {
        const tmpFile = `${os.tmpdir()}${separator}${tarName}`;
        return Rx.Observable.fromPromise(
            tar.c({
                gzip: true,
                file: tmpFile,
                cwd: source.substring(0, source.lastIndexOf("/")),
            },
                [source.split('/').pop()]
            ))
            .mapTo(tmpFile);
    }
}

module.exports = TarTools;