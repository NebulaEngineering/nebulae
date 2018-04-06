'use strict'

const Rx = require('rxjs');
const fs = require('fs-extra');
const shell = require('shelljs');
var base64 = require('file-base64');

class NebulaeGateway {

    constructor() {
    }

    /**
     * Builds the API using the downloaded shell and the setup compendium
     * return an observable that resolves to the builded API path
     * @param {string} apiPath 
     * @param {MicroApisSetupCompendium} mapiSetups 
     */
    buildApiProduction$(apiPath, mapiSetups) {
        //Move the contents to the right folder
        return Rx.Observable.forkJoin(
            this.moveContents$(apiPath, mapiSetups),
        ).concat(this.installDependecies$(apiPath, mapiSetups))
            ;
    }

    /**
     * Builds the shell using the downloaded API shell, create soft-links for the contents and the setup compendium
     * return an observable that resolves to the builded API shell path
     * @param {string} apiPath 
     * @param {MicroApisSetupCompendium} mapiSetups 
     */
    buildApiDevelopment$(apiPath, mapiSetups) {
        //Soft-link the contents to the right folder
        return Rx.Observable.forkJoin(this.createSoftLinksToContents$(apiPath, mapiSetups), )
            .concat(this.installDependecies$(apiPath, mapiSetups))
            ;
    }

    /**
     * Moves all micro-apis content into the right API shell directory
     * Returns an observable that resolves to an array of moved contents paths
     * @param {*} apiPath 
     * @param {*} apiSetups 
     */
    moveContents$(apiPath, apiSetups) {
        return Rx.Observable.of(apiSetups)
            .mergeMap(apiSetup => Rx.Observable.from(apiSetup.microApis))
            .mergeMap(microApi => {
                const destDirectory = `${apiPath}/${microApi.type}/${microApi.name}`;
                shell.mkdir('-p', destDirectory);
                return Rx.Observable.pairs(microApi.encodedFileMap)
                    .mergeMap(([fileName, encodedFile]) =>
                        Rx.Observable.bindNodeCallback(base64.decode)(encodedFile, `${destDirectory}/${fileName.replace('*', '.')}`)
                            .mapTo(`${destDirectory}/${fileName.replace('*', '.')}`))
            })
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }


    /**
     * Creates soft-links for each micro-api content into the right API shell directory
     * Returns an observable that resolves to an array of linked contents paths
     * @param {*} apiPath 
     * @param {*} apiSetups 
     */
    createSoftLinksToContents$(apiPath, apiSetups) {
        return Rx.Observable.of(apiSetups)
            .mergeMap(apiSetup => Rx.Observable.from(apiSetup.microApis))
            .mergeMap(microApi => {
                const sourceDirectory = `${microApi.gitRoot}/${microApi.src}`;
                const destDirectory = `${apiPath}/${microApi.type}/${microApi.name}`;
                shell.mkdir('-p', `${apiPath}/${microApi.type}`);
                return Rx.Observable.bindNodeCallback(fs.symlink)(sourceDirectory, destDirectory)
                    .mapTo(destDirectory)
            })
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }



    /**
     * Install all micro-api NPM dependencies
     * Return Observable that resolves to npm install command's respones
     * @param {string} apiPath 
     * @param {string} mapiSetups 
     */
    installDependecies$(apiPath, mapiSetups) {
        shell.cd(apiPath);
        const cmds = mapiSetups.prebuildCommands;
        cmds.push('npm install');
        return Rx.Observable.from(cmds)
            .concatMap(cmd => Rx.Observable.bindCallback(shell.exec)(cmd))
            .concatMap(([code, stdout, stderr]) => {
                return code === 0
                    ? Rx.Observable.of(stdout)
                    : Rx.Observable.throw(new Error(`Error Instaling dependencies app: ${stderr}`));
            });
    }

}

module.exports = NebulaeGateway;