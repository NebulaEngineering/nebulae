'use strict'

const Rx = require('rxjs');
const git = require('simple-git/promise');
const fs = require('fs-extra')


/**
 * Git tool set
 */
class GitTools {

    /**
     * Clone a git repository and put it inside the output dir.
     * If the output dir exists and/or have contents, it will be replaced
     * @param {String} repositoryUrl git repository url. Eg: https://github.com/NebulaEngineering/nebulae.git
     * @param {String} outputDir output dir path
     */
    static clone$(repositoryUrl, outputDir, apiRepoBranch, apiRepoUser, apiRepoPsw) {
        const remote = (apiRepoUser && apiRepoPsw) ? `https://${apiRepoUser}:${apiRepoPsw}@${repositoryUrl.replace('https://', '').replace('http://', '')}` : repositoryUrl;
        return Rx.Observable.bindNodeCallback(fs.remove)(outputDir)
            .concat(Rx.Observable.fromPromise(git().clone(
                remote, outputDir
                //, [`-b ${apiRepoBranch}`] //not working! fix
            )))
            .mapTo(outputDir);
    }
}

module.exports = GitTools;