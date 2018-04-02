'use strict'

const Rx = require('rxjs');
const jsonfile = require('jsonfile');
const gitRootDir = require('git-root-dir');
const TarTools = require('../crosscuting/TarTools');
const GitTools = require('../crosscuting/GitTools');
const MicroFrontEndsSetupCompendium = require('./MicroFrontEndsSetupCompendium');
const fs = require('fs-extra');
const os = require('os');

class DevelopmentUiComposition {
    constructor({
        shellType, shellRepo, frontEndId, outputDir, setupFiles
    }) {

        this.shellType = shellType;
        this.shellRepo = shellRepo;
        this.frontEndId = frontEndId;
        this.outputDir = outputDir;
        this.setupFiles = setupFiles.split(',');

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
        - process microfront-ends setup objects
            - Get every microfrontend setup
            - Apply each setup on a volatile object       
        - List all the Micro-FrontEnds content directories     
        - buil shell
            - create a soft link of each micro-frontend content to shell
            - apply setup object into shell (write changes to disk)
            - install dependencies
            - build integrated shell
            - run test
         */
        return Rx.Observable.forkJoin(
            this.downloadShell$(this.outputDir),
            this.mergeMicroFrontendSetups$(),
            this.listMicroFrontEndsContentDirectories$(),
            this.listMicroFrontEndsAssetsDirectories$()
        )
            .switchMap(([shellPath, mfeSetups, mfeContentPaths, mfeAssetsPaths]) => this.buildShell$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups))
            ;
    }

    /**
     * Download the shell git repository, extract the shell and put it in the output dir
     * Returns an Observable that resolve to the shell path
     * @param {*} outputDir 
     */
    downloadShell$(outputDir) {
        const tmpDir = `${os.tmpdir()}/${Math.random()}/shell_project`;
        console.log(tmpDir);
        return Rx.Observable.fromPromise(fs.remove(outputDir).then(fs.ensureDir(tmpDir)))
            .switchMap(() => GitTools.clone$(this.shellRepo, tmpDir))
            .concat(Rx.Observable.bindNodeCallback(fs.move)(`${tmpDir}/frontend/${this.frontEndId}`, outputDir))
            .mapTo(outputDir)
    }


    /**
     * Gets all the microservices MicroFront-end setup files,
     * and merge all of them.
     * return an observable that resolves to the merge setup
     */
    mergeMicroFrontendSetups$() {
        return Rx.Observable.from(this.setupFiles)
            .mergeMap(setupFile => Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile))
            //Process each setup and build a ]Compendium
            .reduce((acc, mfeSetup) => {
                acc.processSetup(mfeSetup);
                return acc;
            }, new MicroFrontEndsSetupCompendium());
    }

    /**
     * Extracts Micro-FrontEnd contents directories from the setup files.
     * Returns an Observable that resolve to an array of the content's local directories
     */
    listMicroFrontEndsContentDirectories$() {
        //for each setup file
        return Rx.Observable.from(this.setupFiles)
            //infer the git directory where the file is and join them as { setupFile, gitRoot }
            .mergeMap(setupFile =>
                Rx.Observable.fromPromise(gitRootDir(setupFile))
                    .map(gitRoot => {
                        return { setupFile, gitRoot }
                    })
            )
            //Read every file, transform in to JSON and join it with the gitRoot { setupArray, gitRoot }
            .mergeMap(({ setupFile, gitRoot }) =>
                Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile)
                    .map(setupArray => { return { setupArray, gitRoot }; })
            )
            //unwrap the setup array and join them with the gitroot { mfeSetup, gitRoot }
            .mergeMap(({ setupArray, gitRoot }) =>
                Rx.Observable.from(setupArray)
                    .map(mfeSetup => { return { mfeSetup, gitRoot }; })
            )
            //Process each setup and build the compendium
            .reduce((acc, { mfeSetup, gitRoot }) => {
                acc.push(`${gitRoot}/${mfeSetup.src}`);
                return acc;
            }, []);
    }

    /**
     * Extracts Micro-FrontEnd assets directories from the setup files.
     * Returns an Observable that resolve to an array of the assets's local directories
     */
    listMicroFrontEndsAssetsDirectories$() {
        //for each setup file
        return Rx.Observable.from(this.setupFiles)
            //infer the git directory where the file is and join them as { setupFile, gitRoot }
            .mergeMap(setupFile =>
                Rx.Observable.fromPromise(gitRootDir(setupFile))
                    .map(gitRoot => {
                        return { setupFile, gitRoot }
                    })
            )
            //Read every file, transform in to JSON and join it with the gitRoot { setupArray, gitRoot }
            .mergeMap(({ setupFile, gitRoot }) =>
                Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile)
                    .map(setupArray => { return { setupArray, gitRoot }; })
            )
            //unwrap the setup array and join them with the gitroot { mfeSetup, gitRoot }
            .mergeMap(({ setupArray, gitRoot }) =>
                Rx.Observable.from(setupArray)
                    .map(mfeSetup => { return { mfeSetup, gitRoot }; })
            )
            //Process each setup and build the compendium
            .reduce((acc, { mfeSetup, gitRoot }) => {
                acc.push(`${gitRoot}/${mfeSetup.assets}`);
                return acc;
            }, []);
    }

    /**
     * Builds the shell using the downloaded shell, downloaded contents and the setup compendium
     * return an observable that resolves to the builded shell path
     * @param {string} shellPath 
     * @param {string[]} mfeContentPaths 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    buildShell$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups) {
        return this.shell.buildShellDevelopment$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups);
    }

}

module.exports = DevelopmentUiComposition;