exports.command = 'generate <artifact>'
exports.desc = 'generates an artifact'
exports.builder = function (yargs) {
    return yargs.commandDir('generate_artifacts')
}
exports.handler = (argv) => console.log('Invalid artifact type')