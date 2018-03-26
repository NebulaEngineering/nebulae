'use strict'

const Rx = require('rxjs');
const fs = require('fs-extra');
const shell = require('shelljs');
const htmlParser = require('node-html-parser');

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
    buildShellProduction$(shellPath, mfeContentPaths, mfeSetups) {
        //Move the contents to the right folder
        //modify environments files
        //modify navigation files
        //modify routes files
        return Rx.Observable.forkJoin(
            this.moveContents$(shellPath, mfeContentPaths),
            this.modifyRoutes$(shellPath, mfeSetups),
            this.modifyNavigationLanguages$(shellPath, mfeSetups),
            this.modifyNavigation$(shellPath, mfeSetups),
            this.modifyEnvironments$(shellPath, mfeSetups)
        ).concat(this.installDependecies$(shellPath, mfeSetups))
            .concat(this.compile$(shellPath))
            ;
    }

    /**
     * Builds the shell using the downloaded shell, create soft-links for the contents and the setup compendium
     * return an observable that resolves to the builded shell path
     * @param {string} shellPath 
     * @param {string[]} mfeContentPaths 
     * @param {MicroFrontEndsSetupCompendium} mfeSetups 
     */
    buildShellDevelopment$(shellPath, mfeContentPaths, mfeSetups) {
        //Soft-link the contents to the right folder
        //modify environments files
        //modify navigation files
        //modify routes files
        return Rx.Observable.forkJoin(
            this.createSoftLinksToContents$(shellPath, mfeContentPaths),
            this.modifyRoutes$(shellPath, mfeSetups),
            this.modifyNavigationLanguages$(shellPath, mfeSetups),
            this.modifyNavigation$(shellPath, mfeSetups),
            this.modifyEnvironments$(shellPath, mfeSetups))
            .concat(this.installDependecies$(shellPath, mfeSetups))
            .concat(this.compile$(shellPath))
            ;
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
                return Rx.Observable.bindNodeCallback(fs.move)(contentTempPath, `${shellPath}/src/app/main/content/${contentDirName}`)
                    .mapTo(`${shellPath}/src/app/main/content/${contentDirName}`)
            })
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }

    /**
     * Creates soft-links for each micro-frontend content into the right shell directory
     * Returns an observable that resolves to an array of linked contents paths
     * @param {*} shellPath 
     * @param {*} mfeContentPaths 
     */
    createSoftLinksToContents$(shellPath, mfeContentPaths) {
        return Rx.Observable.from(mfeContentPaths)
            .mergeMap(originalContentPath => {
                const contentDirName = originalContentPath.split('/').pop();
                return Rx.Observable.bindNodeCallback(fs.symlink)(originalContentPath, `${shellPath}/src/app/main/content/${contentDirName}`)
                    .mapTo(`${shellPath}/src/app/main/content/${contentDirName}`)
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
        const cmds = ['ng --version','ng build --base-href <HREF> --prod'];
        return this.runPreBuildScripts$(shellPath)
            .concatMap(() => Rx.Observable.from(cmds))
            .combineLatest(this.getSiteRootPath$(shellPath))
            .concatMap( ([cmd,href]) => {
                const command = cmd.replace('<HREF>',href);
                return Rx.Observable.bindCallback(shell.exec)(command);
            })
            .concatMap(([code, stdout, stderr]) => {
                return code === 0
                    ? Rx.Observable.of(stdout)
                    : Rx.Observable.throw(new Error(`Error building app: ${stderr}`));
            })
    }

    runPreBuildScripts$(shellPath) {
        shell.cd(shellPath);
        const cmds = ['npm rebuild node-sass --force'];
        return Rx.Observable.from(cmds)
            .concatMap(cmd => Rx.Observable.bindCallback(shell.exec)(cmd))
            .concatMap(([code, stdout, stderr]) => {
                return code === 0
                    ? Rx.Observable.of(stdout)
                    : Rx.Observable.throw(new Error(`Error building app: ${stderr}`));
            });
    }

    /**
     * Extract the site root path (href) from the angular 2 index.html
     * Returns an Observable that resolves to the href property value
     * @param {string} shellPath 
     */
    getSiteRootPath$(shellPath) {
        const fileName = `${shellPath}/src/index.html`;
        return Rx.Observable.fromPromise(fs.readFile(fileName, 'utf8'))
            .map(rawHtlm =>
                htmlParser.parse(rawHtlm, {
                    lowerCaseTagName: false,  // convert tag name to lower case (hurt performance heavily)
                    script: false,            // retrieve content in <script> (hurt performance slightly)
                    style: false,             // retrieve content in <style> (hurt performance slightly)
                    pre: false                // retrieve content in <pre> (hurt performance slightly)
                })
            )
            .map(html => html.firstChild.childNodes
                .filter(child => child.nodeType === htmlParser.NodeType.ELEMENT_NODE)
                .map(html => html.lastChild)
                .map(html => html.attributes)
                .map(attributes => attributes.href)
            );
    }

}

module.exports = Fuse2AngularShell;