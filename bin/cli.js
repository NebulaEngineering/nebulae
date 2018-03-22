#!/usr/bin/env node
'use strict';

// Provide a title to the process in `ps`.
// Due to an obscure Mac bug, do not start this title with any symbol.
process.title = 'nebulae';

/*

Desired CLI:

-- General --
$ nebulae --help

-- Register MicroService on the Microservice Directory --
$ nebulae register --help
$ nebulae register microfrontend --microservice-id=test --frontend-id=emi --setup-file=mfe_file.json --store-type=GCP_DATASTORE --gcp-service-account-token=key.json
$ nebulae register microbackend  --microservice-id=test --setup-file=mbe_file.json --store-type=GCP_DATASTORE --gcp-service-account-token=key.json
$ nebulae register microapi      --microservice-id=test --setup-file=mfe_file.json --store-type=GCP_DATASTORE --gcp-service-account-token=key.json

-- Micro-Front end UI composition --
$ nebulae compose-ui --help
$ nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/x/y -frontend-id=emi --output-dir=/dist/dir --setup-files=mfe_a_file.json,mfe_b_file.json
$ nebulae compose-ui production  --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/x/y -frontend-id=emi --output-dir=/dist/dir --store-type=GCP_DATASTORE --gcp-service-account-token=key.json

├─ cli.js
└─ cmds/
   ├─ register.js
   └─ register_cmds/
      ├─ microfrontend.js
      └─ microbackend.js
      └─ microapi.js
    ├─ compose-ui.js
    └─ compose-ui_envs
      ├─ development.js
      ├─ production.js
*/



require('yargs')
    .commandDir('cmds')
    .demandCommand()
    .help('h')
    .alias('h', 'help')
    .epilogue('for more information, find the documentation at https://github.com/NebulaEngineering/nebulae')
    .argv;