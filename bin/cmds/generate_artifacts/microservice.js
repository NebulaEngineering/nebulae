const commons = require('../../cli-commons');
const MicroserviceGenerator = require('../../../lib/code-generator/MicroserviceGenerator');

exports.component = 'artifact <frontend-id> <api-id> <project_context> <template-git-url> <repo-git-url>  [crud-entity] '
exports.desc = 'generates basic microservice from template'
exports.short = 'ms';
exports.builder = {
    'frontend-id': commons.parameters['frontend-id'],
    'api-id': commons.parameters['api-id'],
    'project-context': commons.parameters['project-context'],
    'template-git-url': commons.parameters['template-git-url'],
    'repo-git-url': commons.parameters['repo-git-url'],
    'crud-entity': commons.parameters['crud-entity'],
}
exports.handler = function (argv) {
    const generator = new MicroserviceGenerator();
    generator.generateMicroservice$({
        frontendId: argv['frontend-id'],
        apiId: argv['api-id'],
        projectContext: argv['project-context'],
        templateGitUrl: argv['template-git-url'],
        repoGitUrl: argv['repo-git-url'],
        entity: argv['crud-entity'] || 'entity'
    }).subscribe(
        msg => console.log(msg),
        e => {
            console.error(e.stack || e);
            process.exit(1);
        },
        () => {
            console.log('COMPLETED');
            process.exit(0);
        }
    );
}