'use strict'

const Rx = require('rxjs');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const git = require('simple-git/promise');
const tmp = require('tmp');
const glob = require("glob");
const replace = require('replace-in-file');
const GitTools = require('../crosscuting/GitTools');
const camelCase = require('camelcase');
const pluralize = require('pluralize');
const replaceLast = require('replace-last');



class MicroserviceGenerator {
    constructor() {
    }

    /**
     * Generates a basic microservice structure
     * @returns {Rx.Observable}
     */
    generateMicroservice$({ frontendId, apiId, projectContext, templateGitUrl, repoGitUrl, entity, gitRepoDirectoryPath }) {
        return Rx.Observable.forkJoin(
            this.DownlaodTemplate$(templateGitUrl),
            this.generateDictionary$(frontendId, apiId, projectContext, repoGitUrl, entity, gitRepoDirectoryPath)
        ).mergeMap(([repoPath, dictionary]) => Rx.Observable.concat(
            Rx.Observable.of(`Template from ${templateGitUrl} was cloned to ${repoPath}`),
            Rx.Observable.of(`Dictionary for replacement generated: \n  - ${dictionary.map(wc => `${wc.wildcard}->${wc.replacement}`).join('\n  - ')}`),
            this.initializeGitRepo$(repoPath, repoGitUrl),
            this.replaceDirectoriesNames$(repoPath, dictionary),
            this.replaceFilesNames$(repoPath, dictionary),
            this.replaceFileContents$(repoPath, dictionary),
            this.commitAndPushGitChanges$(repoPath),
            this.moveToWorkingDirectory$(repoPath, repoGitUrl),
        ));
    }

    /**
     * Generates replacement words dictionary
     * @returns {Rx.Observable}
     */
    generateDictionary$(frontendId, apiId, projectContext, repoGitUrl, entity, gitRepoDirectoryPath) {
        const repoGitSplitted = repoGitUrl.split('/');
        const microserviceName = repoGitSplitted[repoGitSplitted.length - 1].replace('.git', '').replace('ms-', '');
        const githubOrg = repoGitSplitted[repoGitSplitted.length - 2];
        return Rx.Observable.of([
            { wildcard: 'msshortname', replacement: microserviceName.split('-').map(word => word.substring(0, 4)).join('-') },
            { wildcard: 'msnamecamel', replacement: camelCase(microserviceName) },
            { wildcard: 'msnamepascal', replacement: camelCase(microserviceName, { pascalCase: true }) },
            { wildcard: 'msnameuppercase', replacement: camelCase(microserviceName).toUpperCase() },
            { wildcard: 'msname', replacement: microserviceName },
            { wildcard: 'backendnameuppercase', replacement: microserviceName.toUpperCase() },
            { wildcard: 'backendname', replacement: microserviceName },
            { wildcard: 'msdbname', replacement: microserviceName },
            { wildcard: 'apiidcamellc', replacement: camelCase(apiId).toLowerCase() },
            { wildcard: 'apiid', replacement: apiId },
            { wildcard: 'APIID', replacement: apiId.toUpperCase() },
            { wildcard: 'frontendid', replacement: frontendId },
            { wildcard: 'git_project', replacement: githubOrg },
            { wildcard: 'git_repo_directory_path', replacement: gitRepoDirectoryPath },
            { wildcard: 'project_context_uc', replacement: projectContext.toUpperCase() },
            { wildcard: 'project_context', replacement: projectContext.toLowerCase() },
            { wildcard: 'working_directory', replacement: process.cwd() },
            { wildcard: 'msentitycamel', replacement: camelCase(entity) },
            { wildcard: 'msentitypascal', replacement: camelCase(entity, { pascalCase: true }) },
            { wildcard: 'msentitiespascal', replacement: pluralize(camelCase(entity, { pascalCase: true })) },
            { wildcard: 'msentityname', replacement: entity.toLowerCase() },

            /* RUNNABLE TEMPLATE APPROACH */
            { wildcard: 'emi', replacement: frontendId },
            { wildcard: 'micro-service-template-crud-aggregate', replacement: `${microserviceName.toLowerCase().split(' ').join('-')}-${entity.toLowerCase().split(' ').join('-')}-management` },            
            { wildcard: 'MicroServiceTemplate', replacement: camelCase(microserviceName, { pascalCase: true }) },
            { wildcard: 'micro-service-template', replacement: microserviceName.toLowerCase().split(' ').join('-') },
            { wildcard: 'MICRO_SERVICE_TEMPLATE', replacement: microserviceName.replace(new RegExp("-", 'g'),"_").toUpperCase().split(' ').join('-') },
            { wildcard: 'micr-serv-temp', replacement: microserviceName.split('-').map(word => word.substring(0, 4)).join('-') },
            { wildcard: 'emi-gateway', replacement: apiId },
            { wildcard: 'emigateway', replacement: camelCase(apiId).toLowerCase() },
            { wildcard: 'crud-aggregate', replacement: entity.toLowerCase().split(' ').join('-') },
            { wildcard: 'crud_aggregate', replacement: entity.toLowerCase().replace(new RegExp("-", 'g'),"_").split(' ').join('_') },
            { wildcard: 'CRUD_AGGREGATE', replacement: entity.toUpperCase().replace(new RegExp("-", 'g'),"_").split(' ').join('_') },
            { wildcard: 'CrudAggregate', replacement: camelCase(entity, { pascalCase: true }) },
            { wildcard: 'crudAggregate', replacement: camelCase(entity, { pascalCase: false }) },                       
        ]);
    }


    /**
     * Download the Microservice template, stores it on a temp directory and returns its path
     * @param {string} templateGitUrl
     * @returns {Rx.Observable}
     */
    DownlaodTemplate$(templateGitUrl) {
        return Rx.Observable.bindNodeCallback(tmp.dir)()
            .map(result => `${result[0]}/repo`)
            .mergeMap(tmpPath => GitTools.clone$(templateGitUrl, tmpPath));
    }

    /**
     * config git into microservice repo
     * @param {*} repoPath 
     * @param {*} repoGitUrl 
     * @returns {Rx.Observable}
     */
    initializeGitRepo$(repoPath, repoGitUrl) {
        return Rx.Observable.bindNodeCallback(fs.remove)(`${repoPath}/.git`)
            .mergeMap(() => Rx.Observable.create(async obs => {
                await require('simple-git')(repoPath)
                    .init()
                    .add('.')
                    .commit("first commit!")
                    .addRemote('origin', repoGitUrl);
                obs.next(`Git init at ${repoPath}, added all files, commited and set origin to ${repoGitUrl}`);
                obs.complete();
            }));
    }


    /**
     * Commits and push git changes
     * @param {string} repoPath 
     * @returns {Rx.Observable}
     */
    commitAndPushGitChanges$(repoPath) {
        return Rx.Observable.create(async obs => {
            await require('simple-git')(repoPath)
                .add('.')
                .commit("customized template");
            //.push('origin', 'master');
            obs.next(`Git repo at ${repoPath}, added all changed files and commited changes`);
            obs.complete();
        })
    }


    /**
     * Replaces directory name wildcard using a dictionary, returns a list of modified directories
     * @param {string} repoPath 
     * @param {string} dictionary 
     * @returns {Rx.Observable}
     */
    replaceDirectoriesNames$(repoPath, dictionary) {
        //const dirReplacements = {};
        return Rx.Observable.bindNodeCallback(glob)(repoPath + '/**/')
            .mergeMap(directories => {
                const sortedDirectories = directories.sort((d1, d2) => { return d2.length - d1.length });
                return Rx.Observable.from(sortedDirectories);
            })
            .filter(directory => directory.indexOf('.git/') < 0)
            .filter(directory => {
                const pathAsArray = directory.split("/");
                const dirName = pathAsArray[pathAsArray.length - 2];
                const found = dictionary.filter(wildcard => path.basename(dirName).indexOf(wildcard.wildcard) >= 0).length > 0;
                return found;
            })
            .mergeMap(directory => {
                const pathAsArray = directory.split("/");
                const dirName = pathAsArray[pathAsArray.length - 2];
                const wildcard = dictionary.filter(wildcard => path.basename(dirName).indexOf(wildcard.wildcard) >= 0)[0];
                const newDirName = replaceLast(directory, wildcard.wildcard, wildcard.replacement);
                console.log(`***** newDirName: ${directory} -> ${newDirName}`);
                return Rx.Observable.bindNodeCallback(fs.rename)(directory, newDirName)
                    .mapTo(`${directory}->${newDirName}`)
            }).toArray()
            .map(files => `Renamed directories:\n  - ${files.join('\n  - ')}`);
    }


    /**
     * Replaces filename wildcard using a dictionary, returns a list of modified files
     * @param {string} repoPath 
     * @param {string} dictionary 
     * @returns {Rx.Observable}
     */
    replaceFilesNames$(repoPath, dictionary) {
        return Rx.Observable.bindNodeCallback(glob)(repoPath + '/**/*', { dot: true })
            .mergeMap(files => Rx.Observable.from(files))
            .filter(file => file.indexOf('.git/') < 0)
            .filter(file => file.indexOf('.history/') < 0)
            .filter(file => fs.lstatSync(file).isFile())
            .map(file => {
                const wildcards = dictionary.filter(wildcard => path.basename(file).indexOf(wildcard.wildcard) >= 0);
                if (wildcards.length <= 0) {
                    return undefined;
                } else {
                    const wildcard = wildcards[0];
                    return {
                        file,
                        wildcard: wildcard.wildcard,
                        replacement: wildcard.replacement
                    };
                }
            }).filter(filesToReplace => filesToReplace !== undefined)
            .mergeMap(filesToReplace => {
                const newFileName = filesToReplace.file.replace(filesToReplace.wildcard, filesToReplace.replacement);
                return Rx.Observable.bindNodeCallback(fs.rename)(filesToReplace.file, newFileName)
                    .mapTo(`${filesToReplace.file}->${newFileName}`)
            }).toArray()
            .map(files => `Renamed files:\n  - ${files.join('\n- ')}`);
    }

    /**
     * Replaces file contents wildcard using a dictionary, returns a list of modified files
     * @param {string} repoPath 
     * @param {string} dictionary 
     * @returns {Rx.Observable}
     */
    replaceFileContents$(repoPath, dictionary) {

        return Rx.Observable.bindNodeCallback(glob)(repoPath + '/**/*', { dot: true })
            .mergeMap(files => Rx.Observable.from(files))
            .filter(file => file.indexOf('.git/') < 0)
            .filter(file => file.indexOf('.history/') < 0)
            .filter(file => fs.lstatSync(file).isFile())
            .toArray()
            .mergeMap(files => {
                const options = {
                    files,
                    from: [],
                    to: [],
                };
                dictionary.forEach(wildcard => {
                    options.from.push(new RegExp(wildcard.wildcard, 'g'));
                    options.to.push(wildcard.replacement);
                });
                return Rx.Observable.bindNodeCallback(replace)(options)
                    .map(files => `Modified files contents:\n  - ${files.join('\n  - ')}`);
            });
    }

    /**
     * moves the microservice repo from its temp directory to the working directory
     * @param {string} repoPath 
     * @returns {Rx.Observable}
     */
    moveToWorkingDirectory$(repoPath, repoGitUrl) {
        const repoGitSplitted = repoGitUrl.split('/');
        const microserviceName = repoGitSplitted[repoGitSplitted.length - 1].replace('.git', '');
        const srcpath = repoPath;
        const dstpath = `${process.cwd()}/${microserviceName}`;
        return Rx.Observable.defer(() => fs.move(srcpath, dstpath))
            .mapTo(`Moved repo from ${srcpath} to ${dstpath}`);
    }

}

module.exports = MicroserviceGenerator;