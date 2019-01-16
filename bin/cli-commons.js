/**
 * parameters shared by multiple commands
 */
exports.parameters = {
    /*
    GOOGLE CLOUD PLATFORM
    */
    'store-type': {
        description: 'Store type used as service directory. valid types: GCP_DATASTORE',
        demand: 'must especify the storage type',
    },
    'gcp-service-account-token': {
        description: 'Google cloud Platform service account JSON key',
        requiresArg: false,
    },
    'gcp-proyect-id': {
        description: 'Google cloud Platform proyect id',
        requiresArg: false,
    },

    /*
    MICROSERVICE DIRECTORY
    */
    'microservice-id': {
        description: 'Microservice unique ID',
        demand: 'must especify the microservice id',
        short: 'ms',
    },
    'frontend-id': {
        description: 'Frontend identifier.  this is the Frontend hosting the micro-fronend',
        demand: 'must especify the frontend id',
    },
    'api-id': {
        description: 'API identifier.  this is the API hosting the micro-api',
        demand: 'must especify the API id',
    },
    'setup-file': {
        description: 'setup file',
        demand: 'must especify the setup file',
        short: 'f',
    },

    /*
    FrontEnd SHELL
    */
    'shell-type': {
        description: 'UI Composition shell type.  Eg: FUSE2_ANGULAR',
        demand: 'must especify the shell-type to use',
    },
    'shell-repo': {
        description: 'UI Composition shell repository location.  Eg: https://github.com/x/y.git',
        demand: 'must especify the shell-repo to use',
    },

    /*
    API SHELL
    */
    'api-type': {
        description: 'API Composition shell type.  Eg: NEBULAE_GATEWAY',
        demand: 'must especify the api-type to use',
    },
    'api-repo': {
        description: 'API Composition shell repository location.  Eg: https://github.com/x/y.git',
        demand: 'must especify the api-repo to use',
    },

    /*
    GENERATORS
    */
   'template-git-url': {
        description: 'Template git repo URL.  eg: https://github.com/NebulaEngineering/ms-template.git',
        demand: 'must especify template git url',
        short: 'tgu',
    },
   'repo-git-url': {
        description: 'repo git repo URL.  eg: https://github.com/nebulae-tpm/ms-device-manager.git',
        demand: 'must especify repo git url',
        short: 'rgu',
    },
   'crud-entity': {
        description: '(Optional), if using CRUD template, this is the name (singular) of the entity to CRUD',        
        short: 'crudent',
    },

    /*
    OTHERs
    */
    'output-dir': {
        description: 'directory to place the generated files',
        demand: 'must especify the output-dir',
    },


};


/**
 * Map describing all the parameters that define fixed values and child arguments
 * Map of command parameter vs {fixed value vs child arguments}
 */
exports.fixedArgumentsMap = fixedArgumentsMap = {
    "store-type": {
        'GCP_DATASTORE': ['gcp-service-account-token'],
    },
    "shell-type": {
        'FUSE2_ANGULAR': [],
    },
    "api-type": {
        'NEBULAE_GATEWAY': [],
    },
};


/*
PARAM VALDIATOR FUNCTIONS
*/
exports.validateParameterValue = function (argument, argv) {
    const neededArgs = fixedArgumentsMap[argument]
        ? fixedArgumentsMap[argument][argv[argument]]
        : [];
    if (neededArgs === undefined) {
        console.log(`invalid ${argument}.  Valid types are: ${Object.keys(fixedArgumentsMap[argument])}`);
        return false;
    } else if (!containsNeededArguments(argv, neededArgs)) {
        console.log(`must especify ${neededArgs}`);
        return false;
    }
    return true;
}

exports.containsNeededArguments = containsNeededArguments = function (argv, neededArgs) {
    for (let i = 0; i < neededArgs.length; i++) {
        if (!argv[neededArgs[i]]) {
            return false;
        }
    }
    return true;
};