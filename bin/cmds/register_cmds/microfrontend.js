'use strict'
const commons = require('../../cli-commons');
const GcpServiceDirectory = require('../../../lib/register/GcpServiceDirectory');

exports.component = 'microfrontend <microservice-id> <frontend-id> <file> <store-type> [gcp-service-account-token]'
exports.desc = 'registers the micro-frontend setup file on the service registry of the Microservices environment'
exports.short = 'mfe';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'frontend-id': commons.parameters['frontend-id'],
    'file': commons.parameters['file'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token'],
    'gcp-proyect-id': commons.parameters['gcp-proyect-id']
}
exports.handler = function (argv) {
    const storeTypeNeededArgs = commons.supportedServiceRegistryStoreTypes[argv['store-type']];
    if (storeTypeNeededArgs === undefined) {
        console.log(`invalid store-type.  Valid types are: ${Object.keys(commons.supportedServiceRegistryStoreTypes)}`);
        return;
    } else if (!commons.containsNeededArguments(argv, storeTypeNeededArgs)) {
        console.log(`must especify ${storeTypeNeededArgs}`);
        return;
    }

    //console.log(`Registering micro-frontend of ${argv['microservice-id']} at ${argv['frontend-id']} using ${argv.file}; provider = ${argv['store-type']}`);
    switch (argv['store-type']) {
        case 'GCP_DATASTORE':
            new GcpServiceDirectory(
                {
                    googleAppCredentials: argv['gcp-service-account-token'],
                    projectId: argv['gcp-proyect-id']
                }
            ).uploadMicroFrontend(argv['microservice-id'], argv['frontend-id'], argv.file)
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
    }

}