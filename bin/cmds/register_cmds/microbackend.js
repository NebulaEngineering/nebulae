const commons = require('../../cli-commons');

exports.component = 'microbackend <microservice-id> <setup-file> <store-type> [store-key]'
exports.desc = 'registers the micro-backend setup file on the service registry of the Microservices environment'
exports.short = 'mbe';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'setup-file': commons.parameters['setup-file'],
    'store-type': commons.parameters['store-type'],
}
exports.handler = function (argv) {
    if(!commons.validateParameterValue('store-type',argv)){
        return;
    }
    
    console.log(`Registering micro-backend of ${argv['microservice-id']} using ${argv['setup-file']}; provider = ${argv['store-type']}`);
}