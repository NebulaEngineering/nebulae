#!/usr/bin/env node

const open = require('open');

const argv = require('yargs')
    .version()
    .usage('Usage: $0 <command> [options]')
    .command(['init [dir]', 'initialize', 'i'], 'pwdInitialize the directory', require('./lib/init'))
    .example('nodejs-cli-app init my-project', 'Initialize `my-project` directory with `default` engine')
    .example('nodejs-cli-app init my-project --engine turbo', 'Initialize `my-project` directory with `turbo` engine')
    .command(['docs'], 'Go to the documentation at https://zaiste.net', {}, _ => open('https://zaiste.net'))
    .demandCommand(1, 'You need at least one command before moving on')
    .help('h')
    .alias('h', 'help')
    .epilogue('for more information, find the documentation at https://zaiste.net')
    .argv;