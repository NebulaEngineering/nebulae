'use strict'

const commons = require('../../cli-commons');
const ProductionUiComposition = require('../../../lib/ui-composition/ProductionUiComposition');

exports.environment = 'production <shell-type> <shell-repo> <output-dir> <store-type> [gcp-service-account-token]'
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
        return;
    }
    /*
    shellType, shellRepo, frontEndId, outputDir,
        storeType, googleAppCredentials, namespace = 'core'
    */
    new ProductionUiComposition({
        shellType: argv['shell-type'], shellRepo: argv['shell-repo'], frontEndId: argv['frontend-id'], outputDir: argv['output-dir'],
        storeType: argv['store-type'], googleAppCredentials: argv['gcp-service-account-token']
    }).composeUI$().subscribe(
        () => {
            console.log(`Micro-Frontend result`);            
        },
        (error) => { console.error(error) },
        () => console.log('Completes')
    );


}