'use strict'

const Rx = require('rxjs');
const gitRootDir = require('git-root-dir');
const TarTools = require('../crosscuting/TarTools');
const GitTools = require('../crosscuting/GitTools');
const MicroFrontEndsSetupCompendium = require('./MicroFrontEndsSetupCompendium');
const fs = require('fs-extra');
const os = require('os');

class ProductionUiComposition {
    constructor({
        shellType, shellRepo, frontEndId, outputDir,
        storeType, googleAppCredentials, namespace = 'core'
    }) {

        this.shellType = shellType;
        this.shellRepo = shellRepo;
        this.frontEndId = frontEndId;
        this.outputDir = outputDir;

        //define the service directory store
        switch (storeType) {
            case 'GCP_DATASTORE':
                const GcpServiceDirectory = require('../register/GcpServiceDirectory');
                this.store = new GcpServiceDirectory({ googleAppCredentials, namespace });
                break;
        }
        //define the shell to use
        switch (shellType) {
            case 'FUSE2_ANGULAR':
                const Fuse2AngularShell = require('./shell/Fuse2AngularShell');
                this.shell = new Fuse2AngularShell();
                break;
        }
    }

    /**
     * Compose an integrated UI using all the micro-frontends fragments found in the store
     */
    composeUI$() {
        /*
        - Donwload shell repo and put it in the output dir
        - Download microfront-ends packages
            - Download each microfrontend package
            - untar to temp directories      
        - Download microfront-ends setup objects
            - Get every microfrontend setup
            - Apply each setup on a volatile object            
        - buil shell
            - move every microfront end content to shell
            - apply setup object into shell (write changes to disk)
            - install dependencies
            - build integrated shell
            - run test
         */
        return Rx.Observable.forkJoin(
            this.downloadShell$(this.outputDir),
            this.mergeMicroFrontendSetups$(),
            this.downloadMicroFrontendPackages$())
            .switchMap(([shellPath, mfeSetups, [mfeContentPaths, mfeAssetsPaths]]) => this.buildShell$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups))
            ;
    }

    /**
     * Download the shell git repository, extract the shell and put it in the output dir
     * Returns an Observable that resolve to the shell path
     * @param {*} outputDir 
     */
    downloadShell$(outputDir) {
        const tmpDir = `${os.tmpdir()}/${Math.random()}/shell_project/`;
        return GitTools.clone$(this.shellRepo, tmpDir)
            .concat(Rx.Observable.bindNodeCallback(fs.move)(`${tmpDir}/frontend/${this.frontEndId}`, outputDir))
            .mapTo(outputDir)
    }

    /**
     * Downloads all the micro-frontends contentts from the storage and put them on local temporal directories
     * Returns an Observable that resolve to an array of the content's local directories
     */
    downloadMicroFrontendPackages$() {
        return Rx.Observable.forkJoin(
            this.store.downloadMicroFrontendContents$(this.frontEndId),
            this.store.downloadMicroFrontendAssets$(this.frontEndId)
        );
    }

    /**
     * Gets all the microservices registers,
     * extract the MicroFront-end setup,
     * and merge all of them.
     * return an observable that resolves to the merge setup
     */
    mergeMicroFrontendSetups$() {
        return this.store.findAllMicroserviceRegisters$()
            //Selects microservices with micro-fronend for the current frontend
            .filter(register => register.frontend && register.frontend[this.frontEndId])
            //Only interested in micro-frontend setup
            .pluck('frontend', this.frontEndId)
            //Process each setup and build a ]Compendium
            .reduce((acc, mfeSetup) => {
                acc.processSetup(mfeSetup);
                return acc;
            }, new MicroFrontEndsSetupCompendium());
    }

    /**
     * Builds the shell using the downloaded shell, downloaded contents and the setup compendium
     * return an observable that resolves to the builded shell path
     * @param {string} shellPath 
     * @param {string[]} mfeContentPaths 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    buildShell$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups) {
        return this.shell.buildShellProduction$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups);
    }

}

module.exports = ProductionUiComposition;