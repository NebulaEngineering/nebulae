'use strict'

class MicroFrontEndsSetupCompendium {
    constructor() {
        /**
         * Holds app routes
         */
        this.appRoutes = [];
        /**
         * Holds site navigation
         */
        this.navModel = [];
        /**
         * Holds site navigations i18n map
         */
        this.navLocaleMap = {}
        /**
         * Holds project enviroment variables
         */
        this.enviromentVars = {}
        /**
         * Holds project pre-build commands
         */
        this.prebuildCommands = []
        /**
         * Holds project index amends scripts
         */
        this.indexHeadAmends = [];
    }

    /**
     * Holds logic needed to apply per module
     */
    processModule(module) {
        if (module.groups) {
            module.groups.forEach(group => this.processGroup(group));
        }
        if (module.subgroups) {
            module.subgroups.forEach(subgroup => {
                let group = module.groups ? module.groups.filter(mod => mod.id === subgroup.groupId)[0] : undefined;
                this.processSubGroup(group, subgroup);
            });
        }
        if (module.contents) {
            module.contents.forEach(content => {
                let group = module.groups ? module.groups.filter(mod => mod.id === content.groupId)[0] : undefined;
                let subgroup = module.subgroups ? module.subgroups.filter(sg => sg.id === content.subgroupId)[0] : undefined;
                this.processContent(group, subgroup, content);
            });
        }
        if (module.environmentVars) {
            Object.keys(module.environmentVars).forEach(env => this.appendEnviromentVars(env, module.environmentVars[env]));
        }
        if (module.preBuildCommands) {
            this.prebuildCommands = this.prebuildCommands.concat(module.preBuildCommands);
        }
        if (module.indexHeadAmends) {
            this.indexHeadAmends = this.indexHeadAmends.concat(module.indexHeadAmends);
        }
    };

    /**
     * Holds logic needed to apply per group
     */
    processGroup(group) {
        //console.log(`       - processGroup(${group ? group.id : undefined})`);
        this.appendNavigationGroup(group);
    };

    /**
     * Holds logic needed to apply per subgroup
     */
    processSubGroup(group, subgroup) {
        //console.log(`       - processSubGroup(${group ? group.id : undefined},${subgroup ? subgroup.id : undefined})`);
        this.appendNavigationSubgroup(subgroup);
    };

    /**
     * Holds logic needed to apply per content
     */
    processContent(group, subgroup, content) {
        //console.log(`       - processContent(${group ? group.id : undefined},${subgroup ? subgroup.id : undefined},${content ? content.id : undefined})`);
        this.appendRoute(content);
        this.appendNavigationContent(content);
    };

    /**
     * Appends new content to the App route
     */
    appendRoute(content) {
        let route = this.appRoutes.filter(route => route.path === content.path)[0];
        if (!route) {
            this.appRoutes.push({
                path: content.path,
                loadChildren: content.loadChildren,
                // canActivate: ["AppAuthGuard"],
                // "data": { "roles": content.roles }
            });
        }
        if (content.default && !this.appRoutes.filter(route => route.path === '**')[0]) {
            this.appRoutes.push({
                path: '**',
                redirectTo: content.path
            });
        }
    };

    /**
     * Appends new locale map to a translate path
     */
    appendLocale(translateRoute, translateMap) {
        Object.keys(translateMap).forEach(lan => {
            if (!this.navLocaleMap[lan]) {
                this.navLocaleMap[lan] = {
                    lang: lan,
                    data: {}
                }
            }

            const branches = translateRoute.split('.');
            const leaf = branches.pop();
            let branch = this.navLocaleMap[lan].data;
            branches.forEach(p => {
                if (!branch[p]) {
                    branch[p] = {};
                }
                branch = branch[p];
            });
            branch[leaf] = translateMap[lan];
        });

    }

    /**
     * Append a new group to the site navigation
     */
    appendNavigationGroup(group) {
        if (!this.navModel.filter(gr => gr.id === group.id)[0]) {
            const translateRoute = `NAV.${group.id}.self`;
            this.navModel.push({
                'id': group.id,
                'title': group.id,
                'translate': translateRoute,
                'type': 'group',
                'icon': group.icon,
                'children': [],
                'priority': group.priority || 1000
            });
            this.appendLocale(translateRoute, group.translate);
        }
    }

    /**
     * Append a new subgroup to the site navigation
     */
    appendNavigationSubgroup(subgroup) {
        const parent = this.navModel.filter(g => g.id === subgroup.groupId)[0];
        const translateRoute = `NAV.${subgroup.groupId}.${subgroup.id}.self`;
        if (parent && !parent.children.filter(sgr => sgr.id === subgroup.id)[0]) {
            parent.children.push({
                'id': subgroup.id,
                'title': subgroup.id,
                'translate': translateRoute,
                'type': 'collapse',
                'icon': subgroup.icon,
                'children': [],
                'priority': subgroup.priority || 1000
            });
            this.appendLocale(translateRoute, subgroup.translate);
        }
    }

    /**
     * Append a new content to the site navigation
     */
    appendNavigationContent(content) {
        const groupLevel = content.groupId ? this.navModel.filter(g => g.id === content.groupId)[0] : undefined;
        const subgroupLevel = content.subgroupId && groupLevel ? groupLevel.children.filter(sg => sg.id === content.subgroupId)[0] : undefined;
        const parentChildren = subgroupLevel
            ? subgroupLevel.children
            : groupLevel
                ? groupLevel.children
                : this.navModel;
        const translateRoute = subgroupLevel
            ? `NAV.${content.groupId}.${content.subgroupId}.${content.id}`
            : groupLevel
                ? `NAV.${content.groupId}.${content.id}`
                : `NAV.${content.id}`;

        if (parentChildren && !parentChildren.filter(cont => cont.id === content.id)[0]) {
            parentChildren.push({
                'id': content.id,
                'title': content.id,
                'translate': translateRoute,
                'type': 'item',
                'url': content.navURL,
                'icon': content.icon,
                'priority': content.priority || 1000,
                'roles' : content.roles
            });
            this.appendLocale(translateRoute, content.translate);
        }
    }


    /**
     * Append a enviroments variables
     */
    appendEnviromentVars(env, vars) {
        if (!this.enviromentVars[env]) {
            this.enviromentVars[env] = {};
        }
        const currentVars = this.enviromentVars[env];
        Object.keys(vars).forEach(key => {
            if (currentVars[key] !== undefined && currentVars[key] !== vars[key]) {
                console.log(`       # WARN: the enviroment ${env} already have a property called ${key}, and it will be overriden from ${currentVars[key]} to ${vars[key]}`);
            }
            currentVars[key] = vars[key];
        });
    }



    processSetup(setup) {
        // PROCESS EVERY FOUND MODULE
        setup.forEach(module => {
            this.processModule(module);
        });

        //Sort routes
        this.appRoutes.sort((r1, r2) => r1.path === '**' ? 1 : -1);
        //Sort Navigation
        let sortNavigation = (menuArray) => {
            menuArray.sort((m1, m2) => m2.priority - m1.priority);
            menuArray.forEach(node => {
                if (node.children) {
                    sortNavigation(node.children);
                }
            });
        };
        sortNavigation(this.navModel);
    }

}

module.exports = MicroFrontEndsSetupCompendium;