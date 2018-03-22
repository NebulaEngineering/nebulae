exports.command = 'compose-ui <environment>'
exports.desc = 'Compose and builds an integrated FrontEnd using multiple Micro-FrontEnds'
exports.builder = function (yargs) {
    return yargs.commandDir('compose-ui_envs')
}
exports.handler = (argv) => console.log('Invalid environment type')