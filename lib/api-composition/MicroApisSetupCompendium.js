'use strict'

class MicroApisSetupCompendium {
    constructor() {
        /**
         * Holds app MicroApi info
         */
        this.microApis = [];
        /**
         * Holds project pre-build commands
         */
        this.prebuildCommands = []
    }

    /**
     * Holds logic needed to apply per module
     */
    processModule(module, gitRoot) {

        if (module.preBuildCommands) {
            this.prebuildCommands = this.prebuildCommands.concat(module.preBuildCommands);
        }

        this.microApis.push({
            name: module.name,
            type: module.type,
            encodedFileMap: module.encodedFileMap,
            src: module.src,
            gitRoot
        });

    };


    processSetup(setup, gitRoot) {
        // PROCESS EVERY FOUND MODULE
        setup.forEach(module => {
            this.processModule(module, gitRoot);
        });
    }

}

module.exports = MicroApisSetupCompendium;