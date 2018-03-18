#!/usr/bin/env node
'use strict';

// Provide a title to the process in `ps`.
// Due to an obscure Mac bug, do not start this title with any symbol.
process.title = 'ng';

/*

Desired CLI:

$ nebulae --help
$ nebulae register --help
$ nebulae register microfrontend --microservice-id=test --frontend-id=emi --file=mfe_file.json --store-type=GCP_DATASTORE --gcp-service-account-token=key.json
$ nebulae register microbackend  --microservice-id=test --file=mbe_file.json --store-type=GCP_DATASTORE --gcp-service-account-token=key.json
$ nebulae register microapi      --microservice-id=test --file=mfe_file.json --store-type=GCP_DATASTORE --gcp-service-account-token=key.json


├─ cli.js
└─ cmds/
   ├─ register.js
   └─ register_cmds/
      ├─ microfrontend.js
      └─ microbackend.js
      └─ microapi.js
*/



require('yargs')
    .commandDir('cmds')
    .demandCommand()
    .help('h')
    .alias('h', 'help')
    .epilogue('for more information, find the documentation at https://github.com/NebulaEngineering/nebulae')
    .argv;