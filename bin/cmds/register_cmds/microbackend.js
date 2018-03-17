const commons = require('../../cli-commons');

exports.component = 'microbackend <microservice-id> <file> <store-type> [store-key]'
exports.desc = 'registers the micro-backend setup file on the service registry of the Microservices environment'
exports.short = 'mbe';
exports.builder = {
    'microservice-id': commons.parameters['microservice-id'],
    'file': commons.parameters['file'],
    'store-type': commons.parameters['store-type'],
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
    
    console.log(`Registering micro-backend of ${argv['microservice-id']} using ${argv.file}; provider = ${argv['store-type']}`);
}