'use strict'

const Rx = require('rxjs');
const fs = require('fs-extra');
const shell = require('shelljs');

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
    buildShell$(shellPath, mfeContentPaths, mfeSetups) {
        //Move the contents to the right folder
        //modify environments files
        //modify navigation files
        //modify routes files
        return Rx.Observable.forkJoin(
            this.moveContents$(shellPath, mfeContentPaths),
            this.modifyRoutes$(shellPath, mfeSetups),
            this.modifyNavigationLanguages$(shellPath, mfeSetups),
            this.modifyNavigation$(shellPath, mfeSetups),
            this.modifyEnvironments$(shellPath, mfeSetups))
            .concat(this.installDependecies$(shellPath, mfeSetups))
            .concat(this.compile$(shellPath))
            ;
    }

    /**
     * Moves all micro-frontend contest into the right shell directory
     * Returns an observable that resolves to an array of moved contents paths
     * @param {*} shellPath 
     * @param {*} mfeContentPaths 
     */
    moveContents$(shellPath, mfeContentPaths) {
        return Rx.Observable.from(mfeContentPaths)
            .mergeMap(contentTempPath => {
                const contentDirName = contentTempPath.split('/').pop();
                return Rx.Observable.bindNodeCallback(fs.move)(contentTempPath, `${shellPath}src/app/main/content/${contentDirName}`)
                    .mapTo(`${shellPath}src/app/main/content/${contentDirName}`)
            })
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }


    /**
     * Modifies necessary files in order to apply the routes to use
     * Returns an Observable that resolves to the modified file
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyRoutes$(shellPath, mfeSetups) {
        const fileName = `${shellPath}/src/app/app.module.ts`;
        return Rx.Observable.fromPromise(fs.readFile(fileName, 'utf8'))
            .map(appModuleFileBody => appModuleFileBody.replace('const appRoutes: Routes = []', `const appRoutes: Routes = ${JSON.stringify(mfeSetups.appRoutes, null, 4)}`))
            .mergeMap(appModuleFileBody => Rx.Observable.fromPromise(fs.writeFile(fileName, appModuleFileBody)))
            .mapTo(fileName);
    }


    /**
     * Modifies necessary files in order to apply the navigation i18n files to use
     * Returns an Observable that resolves to the modified files
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyNavigationLanguages$(shellPath, mfeSetups) {
        return Rx.Observable.from(Object.keys(mfeSetups.navLocaleMap))
            .map(lan => {
                return {
                    fileName: `${shellPath}/src/app/navigation/i18n/${lan}.ts`,
                    body: `export const locale =  ${JSON.stringify(mfeSetups.navLocaleMap[lan], null, 4)};`
                }
            })
            .mergeMap(({ fileName, body }) => Rx.Observable.fromPromise(fs.writeFile(fileName, body)).mapTo(fileName))
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }

    /**
     * Modifies necessary files in order to apply the navigation to use
     * Returns an Observable that resolves to the modified file
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyNavigation$(shellPath, mfeSetups) {
        const fileName = `${shellPath}/src/app/navigation/navigation.model.ts`
        return Rx.Observable.fromPromise(fs.readFile(fileName, 'utf8'))
            .map(navModelFileBody => navModelFileBody.replace('this.model = []', `this.model = ${JSON.stringify(mfeSetups.navModel, null, 8)}`))
            .mergeMap(navModelFileBody => Rx.Observable.fromPromise(fs.writeFile(fileName, navModelFileBody)))
            .mapTo(fileName);
    }

    /**
     * Modifies necessary files in order to apply the environment files to use
     * Returns an Observable that resolves to the modified files
     * @param {string} shellPath 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    modifyEnvironments$(shellPath, mfeSetups) {
        const envsPath = `${shellPath}/src/environments/`;
        return Rx.Observable.from(shell.ls(envsPath).stdout.split('\n').filter(file => file !== ''))
            .reduce((acc, envFile) => {
                const env = envFile === 'environment.ts' ? 'default' : envFile.split(".")[1];
                let json = fs.readFileSync(`${envsPath}/${envFile}`, 'latin1');
                json = JSON.parse(json.replace('export const environment =', '').replace(';', ''));
                if (!acc[env]) {
                    acc[env] = json;
                } else {
                    acc[env] = Object.assign(json, acc[env]);
                }
                return acc;
            }, mfeSetups.enviromentVars)
            .concatMap(setup => {
                return Rx.Observable.from(Object.keys(setup));
            })
            .map(env => {
                return {
                    fileName: env === 'default' ? `${shellPath}/src/environments/environment.ts` : `${shellPath}/src/environments/environment.${env}.ts`,
                    body: `export const environment =  ${JSON.stringify(mfeSetups.enviromentVars[env], null, 1)};`
                }
            })
            .mergeMap(({ fileName, body }) => Rx.Observable.fromPromise(fs.writeFile(fileName, body)).mapTo(fileName))
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }

    /**
     * Install all NPM dependencies
     * @param {string} shellPath 
     * @param {string} mfeSetups 
     */
    installDependecies$(shellPath, mfeSetups) {
        shell.cd(shellPath);
        const cmds = mfeSetups.prebuildCommands.concat('npm install');
        return Rx.Observable.from(cmds)
            .concatMap(cmd => Rx.Observable.bindCallback(shell.exec)(cmd))
            .concatMap(([code, stdout, stderr]) => {
                return code === 0
                    ? Rx.Observable.of(stdout)
                    : Rx.Observable.throw(new Error(`Error building app: ${stderr}`));
            });

    }

    /**
     * Compiles Angular project
     * @param {string} shellPath 
     */
    compile$(shellPath) {
        shell.cd(shellPath);
        const cmds = ['ng build', 'ng build --prod'];
        return Rx.Observable.from(cmds)
            .concatMap(cmd => Rx.Observable.bindCallback(shell.exec)(cmd))
            .concatMap(([code, stdout, stderr]) => {
                return code === 0
                    ? Rx.Observable.of(stdout)
                    : Rx.Observable.throw(new Error(`Error building app: ${stdout}`));
            });
    }

}

module.exports = Fuse2AngularShell;