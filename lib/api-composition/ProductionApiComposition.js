'use strict'

const Rx = require('rxjs');
const gitRootDir = require('git-root-dir');
const jsonfile = require('jsonfile');
const MicroApisSetupCompendium = require('./MicroApisSetupCompendium');
const fs = require('fs-extra');
const os = require('os');
const GitTools = require('../crosscuting/GitTools');

class ProductionApiComposition {
    constructor({
        apiType, apiRepo, apiId, outputDir,
        storeType, googleAppCredentials, namespace = 'core'
    }) {

        this.apiType = apiType;
        this.apiRepo = apiRepo;
        this.apiId = apiId;
        this.outputDir = outputDir;

        console.error(`********${JSON.stringify({
            apiType, apiRepo, apiId, outputDir,
            storeType, googleAppCredentials, namespace
        })}*****`);

        //define the service directory store
        switch (storeType) {
            case 'GCP_DATASTORE':
                const GcpServiceDirectory = require('../register/GcpServiceDirectory');
                this.store = new GcpServiceDirectory({ googleAppCredentials, namespace });
                break;
        }
        //define the API type to use
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
    composeAPI$() {
        /*
        - Donwload apirepo and put it in the output dir  
        - Download micro-apis setup objects
            - Get every microapi setup
            - Apply each setup on a volatile object            
        - buil API
            - apply setup object into API (write changes to disk)
            - install dependencies
            - build integrated API
         */
        return Rx.Observable.forkJoin(
            this.downloadAPI$(this.outputDir),
            this.mergeMicroApiSetups$())
            .switchMap(([apiPath, mapiSetups]) => this.buildAPI$(apiPath, mapiSetups))
            ;
    }

    /**
     * Download the API git repository, extract the API shell and put it in the output dir
     * Returns an Observable that resolve to the API path
     * @param {*} outputDir 
     */
    downloadAPI$(outputDir) {
        const tmpDir = `${os.tmpdir()}/${Math.random()}/api_project/`;
        return GitTools.clone$(this.apiRepo, tmpDir)
            .concat(Rx.Observable.bindNodeCallback(fs.move)(`${tmpDir}/api/${this.apiId}`, outputDir))
            .mapTo(outputDir)
    }

    
    /**
     * Gets all the microservices registers,
     * extract the Micro-Apis setup,
     * and merge all of them.
     * return an observable that resolves to the merge setup
     */
    mergeMicroApiSetups$() {
        return this.store.findAllMicroserviceRegisters$()
            //Selects microservices with micro-api for the current API
            .filter(register => register.api && register.api[this.apiId])
            //Only interested in micro-api setup
            .pluck('api', this.apiId)
            //Process each setup and build a Compendium
            .reduce((acc, mapiSetup) => {
                acc.processSetup(mapiSetup);
                return acc;
            }, new MicroApisSetupCompendium());
    }

    /**
     * Builds the API using the downloaded shell and the setup compendium
     * return an observable that resolves to the builded API shell path
     * @param {string} apiPath 
     * @param {MicroApisSetupCompendium} mapiSetups 
     */
    buildAPI$(apiPath, mapiSetups) {
        return this.api.buildApiProduction$(apiPath, mapiSetups);
    }

}

module.exports = ProductionApiComposition;