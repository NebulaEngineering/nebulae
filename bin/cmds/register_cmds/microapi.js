const commons = require('../../cli-commons');

exports.component = 'microapi <microservice-id> <file> <store-type> [gcp-service-account-token]'
exports.desc = 'registers the micro-api setup file on the service registry of the Microservices environment'
exports.short = 'mapi';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'file': commons.parameters['file'],
    'store-type': commons.parameters['store-type'],
    'gcp-service-account-token': commons.parameters['gcp-service-account-token']
}
exports.handler = function (argv) {
    const storeTypeNeededArgs = commons.supportedServiceRegistryStoreTypes[argv['store-type']];
    if(storeTypeNeededArgs === undefined){
        console.log(`invalid store-type.  Valid types are: ${Object.keys(commons.supportedServiceRegistryStoreTypes)}`);
        return;
    }else if (!commons.containsNeededArguments(argv,storeTypeNeededArgs)){
        console.log(`must especify ${storeTypeNeededArgs}`);
        return;
    }
    console.log(`Registering micro-api of ${argv['microservice-id']} at ${argv['frontend-id']} using ${argv.file}; provider = ${argv['store-type']}`);
}