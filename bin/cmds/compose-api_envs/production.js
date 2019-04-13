'use strict'

const path = require('path');
const commons = require('../../cli-commons');
const ProductionApiComposition = require('../../../lib/api-composition/ProductionApiComposition');

exports.environment = 'production <api-type> <api-repo> <api-id> <output-dir> <store-type> [gcp-service-account-token] [api-repo-branch] [api-repo-user] [api-repo-psw] [api-repo-registry]'
exports.desc = 'Compose an API using all the registered Micro-Apis on the Microservice Directory'
exports.short = 'prod';
exports.builder = {
    'api-type': commons.parameters['api-type'],
    'api-repo': commons.parameters['api-repo'],
    'api-id': commons.parameters['api-id'],
    'output-dir': commons.parameters['output-dir'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token'],
    'api-repo-branch': commons.parameters['api-repo-branch'],
    'api-repo-user': commons.parameters['api-repo-user'],
    'api-repo-psw': commons.parameters['api-repo-psw'],
    'api-repo-registry': commons.parameters['api-repo-registry'],
}
exports.handler = function (argv) {
    if (!commons.validateParameterValue('api-type', argv) || !commons.validateParameterValue('store-type', argv)) {
        process.exit(1);
        return;
    }
    new ProductionApiComposition({
        apiType: argv['api-type'], apiRepo: argv['api-repo'], apiId: argv['api-id'], outputDir: path.resolve(argv['output-dir']),
        storeType: argv['store-type'], googleAppCredentials: argv['gcp-service-account-token'],
        apiRepoBranch: argv['api-repo-branch'], apiRepoUser: argv['api-repo-user'], apiRepoPsw: argv['api-repo-psw'], apiRepoRegistry: argv['api-repo-registry']
    }).composeAPI$().subscribe(
        (next) => {
            console.log((next instanceof Object) ? JSON.stringify(next, null, 1) : next);
        },
        (error) => {
            console.error('Failed to compose api', error);
            process.exit(1);
        },
        () => {
            console.log('API had been downloaded, linked, assembled and built');
            process.exit(0);
        }
    );


}