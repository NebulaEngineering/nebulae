# NebulaE [![GitHub version](http://img.shields.io/badge/version-0.0.3-brightgreen.svg)](https://github.com/hegdeashwin/nebula/releases)


NebulaE is a compendium of code generators and tools to help build and deploy cloud native Microservices.  
The cli is meant to replace scripts needed to update datastores, upload files, configure environments and in the long run it will offer code generation to build back-ends, front-ends and middleware for microservices.

# Installation

Assuming that Node.js is already installed & running, 

## Install as CLI
```sh
$ npm install -g nebulae
```
## Install as dependency
```sh
$ npm install nebulae
```

# Command Line Interface

## MicroService Registration and Discovery

```
Usage: nebulae register (microfrontend | microbackend | microapi)

Options:
  --version                    Show version number                     [boolean]
  -h, --help                   Show help                               [boolean]
  --microservice-id            Microservice unique ID                 [required]
  --frontend-id                Frontend identifier.  this is the Frontend
                               hosting the micro-fronend              [required]
  --setup-file                 setup file                             [required]
  --store-type                 Store type used as service directory. valid
                               types: GCP_DATASTORE                   [required]
  --gcp-service-account-token  Google cloud Platform service account JSON key
  --gcp-proyect-id             Google cloud Platform proyect id
```

### Register Micro-FrontEnd
```
Usage sample: 
nebulae register microfrontend --microservice-id=ms_name --frontend-id=emi --setup-file=/full/path/to/mfe-setup.json --store-type=GCP_DATASTORE --gcp-service-account-token=/full/path/to/gcloud-service-key.json
```

## Client-side UI composition

FrontEnds are composed of a single Shell and multiple Micro-FrontEnds.  The idea is to configure the frontend shell to host each Micro-FrontEnd.

### Compose FrontEnd for production
Compose a FronEnd using all the registered Micro-Frontends on the Microservice Directory
```
Usage:
nebulae compose-ui production <shell-type> <shell-repo> <frontend-id> <output-dir> <store-type> [gcp-service-account-token]

Usage sample: 
nebulae compose-ui production --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/NebulaEngineering/lab-emi --frontend-id=emi --output-dir=/tmp/nebulae/emi/ --store-type=GCP_DATASTORE --gcp-service-account-token=../keycloak/etc/gcloud-service-key.json

Options:
  --version                    Show version number                     [boolean]
  -h, --help                   Show help                               [boolean]
  --shell-type                 UI Composition shell type.  Eg: FUSE2-ANGULAR
                                                                      [required]
  --shell-repo                 UI Composition shell repository location.  Eg:
                               https://github.com/x/y.git             [required]
  --frontend-id                Frontend identifier.  this is the Frontend
                               hosting the micro-fronend              [required]
  --output-dir                 directory to place the generated files [required]
  --store-type                 Store type used as service directory. valid
                               types: GCP_DATASTORE                   [required]
  --gcp-service-account-token  Google cloud Platform service account JSON key
```

### Compose FrontEnd for development
Compose a FronEnd using the FrontEnd Shell and one or more local MicroFront-Ends under development
This is critical in order to be able to develop and test the micro-fronend inside the shell
```
Usage:
nebulae compose-ui development <shell-type> <shell-repo> <frontend-id> <output-dir> <setup-file>

Usage sample: 
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/NebulaEngineering/lab-emi --frontend-id=emi --output-dir=/tmp/nebulae/emi/ --setup-file=/full/path/to/mfe-setup.json,/full/path/to/other-mfe-setup.json

Options:
  --version      Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]
  --shell-type   UI Composition shell type.  Eg: FUSE2-ANGULAR        [required]
  --shell-repo   UI Composition shell repository location.  Eg:
                 https://github.com/x/y.git                           [required]
  --frontend-id  Frontend identifier.  this is the Frontend hosting the
                 micro-fronend                                        [required]
  --output-dir   directory to place the generated files               [required]
  --setup-file   setup file                                           [required]
```

## Author & Contributors

Developed &amp; maintained by author: <b>Sebastian Molano on behalf of Nebula Engineering SAS</b><br>
Follow Nebula Engineering at: <a href="https://github.com/NebulaEngineering" target="_blank">github</a>

## License

The MIT License (MIT)

Copyright (c) 2018 Nebula Engineering SAS
