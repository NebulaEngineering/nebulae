const commons = require('../../cli-commons');

exports.component = 'microapi <microservice-id> <setup-file> <store-type> [gcp-service-account-token]'
exports.desc = 'registers the micro-api setup file on the service registry of the Microservices environment'
exports.short = 'mapi';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'setup-file': commons.parameters['setup-file'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token']
}
exports.handler = function (argv) {
    if(!commons.validateParameterValue('store-type',argv)){
        return;
    }
    console.log(`Registering micro-api of ${argv['microservice-id']} at ${argv['frontend-id']} using ${argv['setup-file']}; provider = ${argv['store-type']}`);
}