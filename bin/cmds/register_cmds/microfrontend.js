'use strict'
const commons = require('../../cli-commons');
const GcpServiceDirectory = require('../../../lib/register/GcpServiceDirectory');

exports.component = 'microfrontend <microservice-id> <frontend-id> <setup-file> <store-type> [gcp-service-account-token]'
exports.desc = 'registers the micro-frontend setup file on the service registry of the Microservices environment'
exports.short = 'mfe';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'frontend-id': commons.parameters['frontend-id'],
    'setup-file': commons.parameters['setup-file'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token'],
    'gcp-proyect-id': commons.parameters['gcp-proyect-id']
}
exports.handler = function (argv) {
    if (!commons.validateParameterValue('store-type', argv)) {
        return;
    }
    switch (argv['store-type']) {
        case 'GCP_DATASTORE':
            new GcpServiceDirectory(
                {
                    googleAppCredentials: argv['gcp-service-account-token'],
                }
            ).uploadMicroFrontend(argv['microservice-id'], argv['frontend-id'], argv['setup-file'])
                .subscribe(
                    obj => console.log(`RESULT: ${JSON.stringify(obj)}`),
                    e => {
                        console.error(`ERROR: ${e}`);
                        process.exit(1);
                    },
                    () => {
                        console.log('COMPLETED');
                        process.exit(0);
                    }
                );;
            break;
    }

}