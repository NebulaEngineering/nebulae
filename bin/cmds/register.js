exports.command = 'register <component>'
exports.desc = 'Adds a property or configuration to the service registry of the Microservices environment'
exports.builder = function (yargs) {
    return yargs.commandDir('register_cmds')
}
exports.handler = (argv) => console.log('Invalid component type')