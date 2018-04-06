exports.command = 'compose-api <environment>'
exports.desc = 'Compose and builds an integrated API using multiple Micro-Apis'
exports.builder = function (yargs) {
    return yargs.commandDir('compose-api_envs')
}
exports.handler = (argv) => console.log('Invalid environment type')