'use strict'

const Rx = require('rxjs');
const gitRootDir = require('git-root-dir');
const jsonfile = require('jsonfile');
const MicroApisSetupCompendium = require('./MicroApisSetupCompendium');
const fs = require('fs-extra');
const os = require('os');
const GitTools = require('../crosscuting/GitTools');

class DevelopmentApiComposition {
    constructor({
        apiType, apiRepo, apiId, outputDir, setupFiles,
        apiRepoBranch = "master", apiRepoUser, apiRepoPsw
    }) {
        this.apiType = apiType;
        this.apiRepo = apiRepo;
        this.apiId = apiId;
        this.outputDir = outputDir;
        this.setupFiles = setupFiles.split(',');
        this.apiRepoBranch = apiRepoBranch;
        this.apiRepoUser = apiRepoUser;
        this.apiRepoPsw = apiRepoPsw;       

        //define the shell to use
        switch (apiType) {
            case 'NEBULAE_GATEWAY':
                const NebulaeGateway = require('./type/NebulaeGateway');
                this.api = new NebulaeGateway();
                break;
        }
    }

    /**
     * Compose an integrated API using all the micro-apis fragments found in the store
     */
    composeUI$() {
        /*
        - Donwload API shell repo and put it in the output dir        
        - process micro-apis setup objects
            - Get every microapi setup
            - Apply each setup on a volatile object       
        - buil API
            - create a soft link of each micro-api content to API
            - apply setup object into API (write changes to disk)
            - install dependencies
            - build integrated API
            - run test
         */
        return Rx.Observable.forkJoin(
            this.downloadAPI$(this.outputDir),
            this.mergeMicroApisSetups$())
            .mergeMap(([apiPath, mapiSetups]) => this.buildAPI$(apiPath, mapiSetups))
            ;
    }

    /**
     * Download the API shell git repository, extract the API and put it in the output dir
     * Returns an Observable that resolve to the API path
     * @param {*} outputDir 
     */
    downloadAPI$(outputDir) {
        const tmpDir = `${os.tmpdir()}/${Math.random()}/api_project`;
        console.log(tmpDir);
        return Rx.Observable.fromPromise(fs.remove(outputDir).then(fs.ensureDir(tmpDir)))
            .mergeMap(() => GitTools.clone$(this.apiRepo, tmpDir, this.apiRepoBranch, this.apiRepoUser, this.apiRepoPsw))
            .concat(Rx.Observable.bindNodeCallback(fs.move)(`${tmpDir}/api/${this.apiId}`, outputDir))
            .mapTo(outputDir)
    }


    /**
     * Gets all the microservices Micro-apis setup files,
     * and merge all of them.
     * return an observable that resolves to the merge setup
     */
    mergeMicroApisSetups$() {
        return Rx.Observable.from(this.setupFiles)
            .mergeMap(setupFile => Rx.Observable.forkJoin(
                Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile),
                Rx.Observable.fromPromise(gitRootDir(setupFile))
            ))
            //Process each setup and build a Compendium
            .reduce((acc, [mapiSetup, gitRoot]) => {
                acc.processSetup(mapiSetup, gitRoot);
                return acc;
            }, new MicroApisSetupCompendium());
    }


    /**
     * Builds the API using the downloaded shell and the setup compendium
     * return an observable that resolves to the builded shell path
     * @param {string} apiPath 
     * @param {MicroApisSetupCompendium} mapiSetups 
     */
    buildAPI$(apiPath, mapiSetups) {
        return this.api.buildApiDevelopment$(apiPath, mapiSetups);
    }

}

module.exports = DevelopmentApiComposition;