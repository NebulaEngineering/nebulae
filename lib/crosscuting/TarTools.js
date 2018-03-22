'use strict'

const tar = require('tar');
const os = require('os');
const Rx = require('rxjs');
const separator = require('path').sep;

class TarTools {

    /**
     * Compress a directory using tar.gz and map the result to the generated target file path
     * @param {String} source directory to compress
     * @param {String} tarNamePrefix target file name prefix
     * @param {String} tarNamePostfix target file name postfix
     */
    static tarGz(source, tarNamePrefix, tarNamePostfix) {
        const directoryToTar = source.split('/').pop();
        const tarName = `${tarNamePrefix}${directoryToTar}${tarNamePostfix}`;
        const tmpFile = `${os.tmpdir()}${separator}${tarName}`;
        return Rx.Observable.fromPromise(
            tar.c({
                gzip: true,
                file: tmpFile,
                cwd: source.substring(0, source.lastIndexOf("/")),
            },
                [directoryToTar]
            ))
            .mapTo(tmpFile);
    }

    /**
     * Decompress a tar.gz and map the result into the generated directory
     * @param {string} tarFile 
     * @param {string} destination 
     */
    static untarGz(tarFile, destination) {
        return Rx.Observable.fromPromise(
            tar.x({
                gzip: true,
                file: tarFile,
                cwd: destination,
            }))
            //returns the directory after untar
            .mapTo(`${destination}${separator}${tarFile.split('_').pop().replace('.tar.gz', '')}`);
    }
}

module.exports = TarTools;