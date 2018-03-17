exports.parameters = {
    'microservice-id': {
        description: 'Microservice unique ID',
        demand: 'must especify the microservice id',
        short: 'ms',
    },
    'frontend-id': {
        description: 'Frontend identifier.  this is the Frontend that will host the micro-fronend',
        demand: 'must especify the frontend id',
        short: 'fe',
    },
    'file': {
        description: 'setup file',
        demand: 'must especify the setup file',
        short: 'f',
    },
    'store-type': {
        description: 'Store type used as service directory. valid types: GCP_DATASTORE',
        demand: 'must especify the storage type',
        short: 'f',
    },
    'gcp-service-account-token': {
        description: 'Google cloud Platform service account JSON key',
        requiresArg: false,
    },
    'gcp-proyect-id': {
        description: 'Google cloud Platform proyect id',
        requiresArg: false,
    }
};

exports.supportedServiceRegistryStoreTypes = {
    'GCP_DATASTORE': ['gcp-service-account-token']
};

exports.containsNeededArguments = function(argv, neededArgs){
    for(let i = 0; i < neededArgs.length ; i++){
        if(!argv[neededArgs[i]]){
            return false;
        }
    }
    return true;
};