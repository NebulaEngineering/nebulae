'use strict'

const commons = require('../../cli-commons');
const DevelopmentApiComposition = require('../../../lib/api-composition/DevelopmentApiComposition');
const path = require('path');

exports.environment = 'development <api-type> <api-repo> <api-id> <output-dir> <setup-file> [api-repo-branch] [api-repo-user] [api-repo-psw] [api-repo-registry]'
exports.desc = 'Compose a FronEnd using the Micro-apis under development that are described at the setup file'
exports.short = 'dev';
exports.builder = {
    'api-type': commons.parameters['api-type'],
    'api-repo': commons.parameters['api-repo'],
    'api-id': commons.parameters['api-id'],
    'output-dir': commons.parameters['output-dir'],    
    'setup-file': commons.parameters['setup-file'], 
    'api-repo-branch': commons.parameters['api-repo-branch'],
    'api-repo-user': commons.parameters['api-repo-user'],
    'api-repo-psw': commons.parameters['api-repo-psw'],
    'api-repo-registry': commons.parameters['api-repo-registry'],   
}
exports.handler = function (argv) {
    if (!commons.validateParameterValue('api-type', argv)) {
        process.exit(1);
        return;
    }
    /*
    apiType, apiRepo, apiId, outputDir,
        storeType, googleAppCredentials, namespace = 'core'
    */
    new DevelopmentApiComposition({
        apiType: argv['api-type'], apiRepo: argv['api-repo'], apiId: argv['api-id'], outputDir: path.resolve(argv['output-dir']),
        setupFiles: argv['setup-file'],
        apiRepoBranch: argv['api-repo-branch'], apiRepoUser: argv['api-repo-user'], apiRepoPsw: argv['api-repo-psw'], apiRepoRegistry: argv['api-repo-registry']
    }).composeUI$().subscribe(
        (next) => {
            console.log((next instanceof Object) ? JSON.stringify(next, null, 1) : next);
        },
        (error) => {
            console.error('Failed to compose API');
            console.error(error);
            process.exit(1);
        },
        () => {
            console.log('API had been downloaded, linked, assembled and built');
            process.exit(0);
        }
    );


}