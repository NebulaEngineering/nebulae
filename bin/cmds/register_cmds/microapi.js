'use strict'

const commons = require('../../cli-commons');
const GcpServiceDirectory = require('../../../lib/register/GcpServiceDirectory');
const path = require('path');

exports.component = 'microapi <microservice-id> <api-id> <setup-file> <store-type> [gcp-service-account-token]'
exports.desc = 'registers the micro-api setup file on the service registry of the Microservices environment'
exports.short = 'mfe';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'api-id': commons.parameters['api-id'],
    'setup-file': commons.parameters['setup-file'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token'],
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
            ).uploadMicroApi$(argv['microservice-id'], argv['api-id'], path.resolve(argv['setup-file']))
                .subscribe(
                    msg => console.log(msg),
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