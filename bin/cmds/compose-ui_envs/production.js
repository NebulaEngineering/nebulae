'use strict'

const path = require('path');
const commons = require('../../cli-commons');
const ProductionUiComposition = require('../../../lib/ui-composition/ProductionUiComposition');

exports.environment = 'production <shell-type> <shell-repo> <frontend-id> <output-dir> <store-type> [gcp-service-account-token]'
exports.desc = 'Compose a FronEnd using all the registered Micro-Frontends on the Microservice Directory'
exports.short = 'prod';
exports.builder = {
    'shell-type': commons.parameters['shell-type'],
    'shell-repo': commons.parameters['shell-repo'],
    'frontend-id': commons.parameters['frontend-id'],
    'output-dir': commons.parameters['output-dir'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token'],
}
exports.handler = function (argv) {
    if (!commons.validateParameterValue('shell-type', argv) || !commons.validateParameterValue('store-type', argv)) {
        process.exit(1);
        return;
    }
    /*
    shellType, shellRepo, frontEndId, outputDir,
        storeType, googleAppCredentials, namespace = 'core'
    */
    new ProductionUiComposition({
        shellType: argv['shell-type'], shellRepo: argv['shell-repo'], frontEndId: argv['frontend-id'], outputDir: path.resolve(argv['output-dir']),
        storeType: argv['store-type'], googleAppCredentials: argv['gcp-service-account-token']
    }).composeUI$().subscribe(
        (next) => {
            console.log((next instanceof Object) ? JSON.stringify(next, null, 1) : next);
        },
        (error) => {
            console.error('Failed to compose FrontEnd');
            console.error(error);
            process.exit(1);
        },
        () => {
            console.log('FrontEnd had been downloaded, linked, assembled and built');
            process.exit(0);
        }
    );


}