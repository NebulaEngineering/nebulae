'use strict'

const commons = require('../../cli-commons');
const DevelopmentUiComposition = require('../../../lib/ui-composition/DevelopmentUiComposition');
const path = require('path');

exports.environment = 'development <shell-type> <shell-repo> <frontend-id> <output-dir> <setup-file>'
exports.desc = 'Compose a FronEnd using the Micro-Frontends under development that are described at the setup file'
exports.short = 'dev';
exports.builder = {
    'shell-type': commons.parameters['shell-type'],
    'shell-repo': commons.parameters['shell-repo'],
    'frontend-id': commons.parameters['frontend-id'],
    'output-dir': commons.parameters['output-dir'],    
    'setup-file': commons.parameters['setup-file'],    
}
exports.handler = function (argv) {
    if (!commons.validateParameterValue('shell-type', argv)) {
        process.exit(1);
        return;
    }
    /*
    shellType, shellRepo, frontEndId, outputDir,
        storeType, googleAppCredentials, namespace = 'core'
    */
    new DevelopmentUiComposition({
        shellType: argv['shell-type'], shellRepo: argv['shell-repo'], frontEndId: argv['frontend-id'], outputDir: path.resolve(argv['output-dir']),
        setupFiles: argv['setup-file']
    }).composeUI$().subscribe(
        (next) => {
            console.log((next instanceof Object) ? JSON.stringify(next, null, 1) : next);
        },
        (error) => {
            console.error('Failed to compose FrontEnd');
            console.error(error);
            process.exit(1);
        },
        () => {
            console.log('FrontEnd had been downloaded, linked, assembled and built');
            process.exit(0);
        }
    );


}