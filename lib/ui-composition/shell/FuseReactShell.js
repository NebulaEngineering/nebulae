'use strict'

const Rx = require('rxjs');
const fs = require('fs-extra');
const shell = require('shelljs');
const htmlParser = require('node-html-parser');
var path = require("path");

class Fuse2AngularShell {

    constructor() {
    }

    /**
     * Builds the shell using the downloaded shell, downloaded contents and the setup compendium
     * return an observable that resolves to the builded shell path
     * @param {string} shellPath 
     * @param {string[]} mfeContentPaths 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    buildShellProduction$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups, finalEnvFile) {
        return Rx.Observable.forkJoin(
            this.moveContents$(shellPath, mfeContentPaths),
            this.moveAssets$(shellPath, mfeAssetsPaths),
            this.modifyMicroFrontendIntegrator$(shellPath, mfeSetups, mfeContentPaths),
            this.modifyDevPlaygroundSync$(shellPath, mfeSetups, mfeContentPaths),
            this.modifyEnvironments$(shellPath, mfeSetups),
            //this.modifyIndexAmends$(shellPath, mfeSetups),
        ).concat(this.installDependecies$(shellPath, mfeSetups, true));
    }

    /**
     * Builds the shell using the downloaded shell, create soft-links for the contents and the setup compendium
     * return an observable that resolves to the builded shell path
     * @param {string} shellPath 
     * @param {string[]} mfeContentPaths 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    buildShellDevelopment$(shellPath, mfeContentPaths, mfeAssetsPaths, mfeSetups) {
        return Rx.Observable.forkJoin(
            this.modifyMicroFrontendIntegrator$(shellPath, mfeSetups, mfeContentPaths),
            this.modifyDevPlaygroundSync$(shellPath, mfeSetups, mfeContentPaths),
            this.modifyEnvironments$(shellPath, mfeSetups),
            //this.modifyIndexAmends$(shellPath, mfeSetups),
        )
            .mergeMap((modsResult) => {
                return this.installDependecies$(shellPath, mfeSetups);
            })
            .last()
            .mapTo(`Development UI have been assembled at '${shellPath}'\n To run the shell in dev mode use: 'yarn run dev'`);
    }

    /**
     * Moves all micro-frontend content into the right shell directory
     * Returns an observable that resolves to an array of moved contents paths
     * @param {*} shellPath 
     * @param {*} mfeContentPaths 
     */
    moveContents$(shellPath, mfeContentPaths) {
        return Rx.Observable.from(mfeContentPaths)
            .mergeMap(contentTempPath => {
                const contentDirName = contentTempPath.split('/').pop();
                return Rx.Observable.bindNodeCallback(fs.move)(contentTempPath, `${shellPath}/src/app/main/${contentDirName}`)
                    .mapTo(`${shellPath}/src/app/main/${contentDirName}`)
            })
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }

    /**
     * Moves all micro-frontend assets into the right shell directory
     * Returns an observable that resolves to an array of moved assets paths
     * @param {*} shellPath 
     * @param {*} mfeAssetsPaths 
     */
    moveAssets$(shellPath, mfeAssetsPaths) {
        return Rx.Observable.from(mfeAssetsPaths)
            .mergeMap(contentTempPath => {
                const contentDirName = contentTempPath.split('/').pop();
                return Rx.Observable.bindNodeCallback(fs.move)(contentTempPath, `${shellPath}/public/assets/mfe/${contentDirName}`)
                    .mapTo(`${shellPath}/public/assets/mfe/${contentDirName}`)
            })
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }


    /**
     * Modifies MicroFrontendIntegrator file in order to import all µFrontEnds in the main App
     * Returns an Observable that resolves to the modified file
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyMicroFrontendIntegrator$(shellPath, mfeSetups, mfeContentPaths) {
        const fileName = `${shellPath}/src/app/fuse-configs/MicroFrontendIntegrator.js`;
        return Rx.Observable.fromPromise(fs.readFile(fileName, 'utf8'))
            .map(fileBody => fileBody.replace('/*AUTOGEN_MFE_IMPORTS*/', this.generateMicroFrontendIntegratorMfeImportsCode(mfeContentPaths)))
            .map(fileBody => fileBody.replace('/*AUTOGEN_MFE_LISTING*/', this.generateMicroFrontendIntegratorMfeListingCode(mfeContentPaths)))
            .mergeMap(appModuleFileBody => Rx.Observable.fromPromise(fs.writeFile(fileName, appModuleFileBody)))
            .mapTo(fileName);
    }

    /**
    * Modifies MicroFrontendIntegrator file in order to import all µFrontEnds in the main App
    * Returns an Observable that resolves to the modified file
    * @param {string} shellPath 
    * @param {MicroFrontEndsSetupCompendium} mfeSetups 
    */
    modifyDevPlaygroundSync$(shellPath, mfeSetups, mfeContentPaths) {
        const fileName = `${shellPath}/dev-playground-sync.js`;
        return Rx.Observable.fromPromise(fs.readFile(fileName, 'utf8'))
            .map(fileBody => fileBody.replace('/*AUTOGEN_MFE_SETUP_PATH*/', mfeSetups.mfePaths.map(x => `"${x}"`).join(", ")))
            .mergeMap(appModuleFileBody => Rx.Observable.fromPromise(fs.writeFile(fileName, appModuleFileBody)))
            .mapTo(fileName);
    }

    /**
     * Generates the in-line code for the AUTOGEN_MFE_IMPORTS wildcard
     * @param {*} mfeContentPaths 
     */
    generateMicroFrontendIntegratorMfeImportsCode(mfeContentPaths) {
        return mfeContentPaths.map(fullpath => path.basename(fullpath))
            .map((mfedir, i) => `import { MicroFrontendConfig as ufe${i} } from 'app/main/${mfedir}/MicroFrontendConfig';`)
            .join("\n");
    }
    /**
     * Generates the in-line code for the AUTOGEN_MFE_LISTING wildcard
     * @param {*} mfeContentPaths 
     */
    generateMicroFrontendIntegratorMfeListingCode(mfeContentPaths) {
        return mfeContentPaths.map((mfedir, i) => `ufe${i}`)
            .join(", ");
    }

    /**
     * Modifies necessary files in order to apply the environment files to use
     * Returns an Observable that resolves to the modified files
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyEnvironments$(shellPath, mfeSetups) {
        return Rx.Observable.from(Object.keys(mfeSetups.enviromentVars || {})).mergeMap(envFileKey => {
            const envFileName = envFileKey.replace(/_/g, '.');
            const envFilePath = `${shellPath}/${envFileName}`;
            return Rx.Observable.fromPromise(fs.readFile(envFilePath, 'utf8'))
                .map(fileBody => {
                    return fileBody.replace('#AUTO_GEN_ENV', `${Object.keys(mfeSetups.enviromentVars[envFileKey]).map(key => `${key}=${mfeSetups.enviromentVars[envFileKey][key]}`)}`);
                })
                .mergeMap(appModuleFileBody => Rx.Observable.fromPromise(fs.writeFile(envFilePath, appModuleFileBody)))
                .mapTo(envFilePath);
        });
    }

    /**
     * Modifies necessary files in order to apply the routes to use
     * Returns an Observable that resolves to the modified file
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyIndexAmends$(shellPath, mfeSetups) {
        const fileName = `${shellPath}/src/index.html`;
        return Rx.Observable.fromPromise(fs.readFile(fileName, 'utf8'))
            .map(indexPayload => indexPayload.replace('<!-- indexHeadAmends -->', mfeSetups.indexHeadAmends.join('\n        ')))
            .mergeMap(indexPayload => Rx.Observable.fromPromise(fs.writeFile(fileName, indexPayload)))
            .mapTo(fileName);
    }

    /**
     * Install all micro-front ends NPM dependencies
     * Return Observable that resolves to npm install command's respones
     * @param {string} shellPath 
     * @param {string} mfeSetups 
     */
    installDependecies$(shellPath, mfeSetups, prod = false) {
        shell.cd(shellPath);
        const cmds = [...mfeSetups.prebuildCommands, `yarn install ${prod ? "--prod" : ""}`];
        if(prod){
            cmds.push('CI=true yarn build')
        }
        return Rx.Observable.from(cmds)
            .do(cmd => console.log(`running cmd: ${cmd}`))
            .concatMap(cmd => Rx.Observable.bindCallback(shell.exec)(cmd))
            .concatMap(([code, stdout, stderr]) => {
                return code === 0
                    ? Rx.Observable.of(stdout)
                    : Rx.Observable.throw(new Error(`Error building app: ${stderr}`));
            });
    }



}

module.exports = Fuse2AngularShell;