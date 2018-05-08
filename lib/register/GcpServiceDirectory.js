'use strict'

const Rx = require('rxjs');
const jsonfile = require('jsonfile');
const gitRootDir = require('git-root-dir');
const TarTools = require('../crosscuting/TarTools');
const Datastore = require('@google-cloud/datastore');
const os = require('os');
const fs = require('fs');
const base64 = require('file-base64');

class GcpServiceDirectory {

    /**
     * Setup and Google Cloud service directory
     * @param {googleAppCredentials, projectId, namespace} param0 
     */
    constructor({ googleAppCredentials, projectId, namespace = 'core' }) {
        if (googleAppCredentials) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = googleAppCredentials;
        }

        if (!projectId) {
            projectId = jsonfile.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS).project_id;
        }

        // Imports the Google Cloud client library for datastore
        // Creates a client for datastore
        this.datastore = new Datastore({
            projectId: projectId,
            namespace: 'core'
        });
        // The kind for the entities 
        this.kind = 'Microservice';

        // Imports the Google Cloud client library for storage
        // Creates a client for storage
        this.storage = new require('@google-cloud/storage')({
            projectId: projectId,
            namespace: 'core'
        });
        // bucket name names
        this.bucketName = `${projectId}_register_frontend`;
    }

    ////////////////////////////////////////////////////////////////////////////////
    //////////////////////////// FRONT-END    //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Stores the setup json into DATASTORE and uploads the frontend packages to STORAGE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontend$(microserviceId, frontendId, setupFile) {
        return Rx.Observable.merge(
            this.uploadMicroFrontendDescritor$(microserviceId, frontendId, setupFile),
            this.uploadMicroFrontendContents$(microserviceId, frontendId, setupFile),
            this.uploadMicroFrontendAssets$(microserviceId, frontendId, setupFile)
        );
    }

    /**
     *  Stores the setup json into cloud DATASTORE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontendDescritor$(microserviceId, frontendId, setupFile) {
        frontendId = frontendId.toLowerCase();
        // The Cloud Datastore key for the new entity
        const key = this.datastore.key([this.kind, microserviceId]);
        return Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile)
            .combineLatest(Rx.Observable.fromPromise(this.datastore.get(key)))
            .map(([content, queryResult]) => {
                const row = queryResult[0] ? queryResult[0] : {};
                if (!row.frontend) {
                    row.frontend = {};
                }
                row.frontend[frontendId] = content;
                return row;
            })
            .map(data => { return { key, data } })
            .switchMap(data => Rx.Observable.fromPromise(this.datastore.save(data)))
            .mapTo(`Micro-FrontEnd descriptor uploaded: frontendId=${frontendId}, microserviceId=${microserviceId} `);
    }

    /**
     * Uploads the frontend packages to cloud STORAGE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontendContents$(microserviceId, frontendId, setupFile) {
        frontendId = frontendId.toLowerCase();
        // The Cloud starage bucket key for the zip
        return this.ensureBucket()
            .switchMap(() => Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile))
            .concatMap(content => Rx.Observable.from(content))
            .filter(content => content.src)
            .map(content => { return { src: content.src, name: content.name } })
            .distinct()
            .combineLatest(Rx.Observable.fromPromise(gitRootDir(setupFile)))
            .switchMap(([mfe, gitRoot]) => TarTools.tarGz(`${gitRoot}/${mfe.src}`, `${frontendId}_content_`, `.tar.gz`))
            .switchMap(tarFile => Rx.Observable.fromPromise(this.storage.bucket(this.bucketName).upload(tarFile)))
            .map(([upload]) => upload.metadata.selfLink)
            .map(selfLink => `Micro-FrontEnd contents uploaded: frontendId=${frontendId}, microserviceId=${microserviceId},  selfLink=${selfLink}`);
    }

    /**
     * Uploads the frontend assets to cloud STORAGE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontendAssets$(microserviceId, frontendId, setupFile) {
        frontendId = frontendId.toLowerCase();
        // The Cloud starage bucket key for the zip
        return this.ensureBucket()
            .switchMap(() => Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile))
            .concatMap(content => Rx.Observable.from(content))
            .filter(content => content.assets)
            .map(content => { return { assets: content.assets, name: content.name } })
            .distinct()
            .combineLatest(Rx.Observable.fromPromise(gitRootDir(setupFile)))
            .switchMap(([mfe, gitRoot]) => TarTools.tarGz(`${gitRoot}/${mfe.assets}`, `${frontendId}_assets_`, `.tar.gz`))
            .switchMap(tarFile => Rx.Observable.fromPromise(this.storage.bucket(this.bucketName).upload(tarFile)))
            .map(([upload]) => upload.metadata.selfLink)
            .map(selfLink => `Micro-FrontEnd assets uploaded: frontendId=${frontendId}, microserviceId=${microserviceId},  selfLink=${selfLink}`);
    }

    /**
     * Downloads all frontend packages from cloud STORAGE
     * Return observable that resolves to the an array of untar directories
     * @param {String} frontendId 
     * @param {String} outputDirectory 
     */
    downloadMicroFrontendContents$(frontendId) {
        const tmpDir = `${os.tmpdir()}/${Math.random()}`;
        fs.mkdirSync(tmpDir);
        frontendId = frontendId.toLowerCase();
        //make the bucket exists
        return this.ensureBucket()
            //list all files on the bucket that belongs to the frontendId
            .switchMap(() => Rx.Observable.fromPromise(
                this.storage.bucket(this.bucketName)
                    .getFiles({ prefix: `${frontendId}_content_` })
            ))
            //split the result file by file
            .concatMap(result => Rx.Observable.from(result[0]))
            //extract only the file name
            .pluck('name')
            //Download each file (tar.gz)
            .concatMap(cloudStorageFile =>
                Rx.Observable.fromPromise(
                    this.storage.bucket(this.bucketName)
                        .file(cloudStorageFile)
                        .download({ destination: `${tmpDir}/${cloudStorageFile}` }))
                    .mapTo(`${tmpDir}/${cloudStorageFile}`))
            //untar files
            .concatMap(tmpTarFile => TarTools.untarGz(tmpTarFile, tmpDir))
            //reduce to an array of directoires path, each directory is represent the microfront-end content
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }



    /**
     * Downloads all frontend assets from cloud STORAGE
     * Return observable that resolves to the an array of untar directories
     * @param {String} frontendId 
     * @param {String} outputDirectory 
     */
    downloadMicroFrontendAssets$(frontendId) {
        const tmpDir = `${os.tmpdir()}/${Math.random()}`;
        fs.mkdirSync(tmpDir);
        frontendId = frontendId.toLowerCase();
        //make the bucket exists
        return this.ensureBucket()
            //list all files on the bucket that belongs to the frontendId
            .switchMap(() => Rx.Observable.fromPromise(
                this.storage.bucket(this.bucketName)
                    .getFiles({ prefix: `${frontendId}_assets_` })
            ))
            //split the result file by file
            .concatMap(result => Rx.Observable.from(result[0]))
            //extract only the file name
            .pluck('name')
            //Download each file (tar.gz)
            .concatMap(cloudStorageFile =>
                Rx.Observable.fromPromise(
                    this.storage.bucket(this.bucketName)
                        .file(cloudStorageFile)
                        .download({ destination: `${tmpDir}/${cloudStorageFile}` }))
                    .mapTo(`${tmpDir}/${cloudStorageFile}`))
            //untar files
            .concatMap(tmpTarFile => TarTools.untarGz(tmpTarFile, tmpDir))
            //reduce to an array of directoires path, each directory is represent the microfront-end content
            .reduce((acc, value) => { acc.push(value); return acc; }, []);
    }




    ////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////  API         //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Stores the setup json into DATASTORE and uploads the API sources
     * @param {String} microserviceId 
     * @param {String} apiId 
     * @param {String} setupFile 
     */
    uploadMicroApi$(microserviceId, apiId, setupFile) {
        return this.uploadMicroApiDescritor$(microserviceId, apiId, setupFile);
    }

    /**
     *  Stores the setup json into cloud DATASTORE
     * @param {String} microserviceId 
     * @param {String} apiId 
     * @param {String} setupFile 
     */
    uploadMicroApiDescritor$(microserviceId, apiId, setupFile) {
        apiId = apiId.toLowerCase();
        // The Cloud Datastore key for the new entity
        const key = this.datastore.key([this.kind, microserviceId]);
        return Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile)
            .combineLatest(Rx.Observable.fromPromise(this.datastore.get(key)))
            .map(([content, queryResult]) => {
                const row = queryResult[0] ? queryResult[0] : {};
                if (!row.api) {
                    row.api = {};
                }
                row.api[apiId] = content;
                row.api.excludeFromIndexes = true;
                row.api[apiId].excludeFromIndexes = true;
                return { row, apiId, setupFile };
            })
            .switchMap(({ row, apiId, setupFile }) => this.enrichMicroApiRowWithFiles$({ row, apiId, setupFile }))
            .map(row => {
                return {
                    key,
                    data: row,
                    excludeFromIndexes: [
                        'api',
                        `api.${apiId}`,
                        `api.${apiId}.encodedFileMap`,
                    ]
                };
            })
            .switchMap(data => Rx.Observable.fromPromise(this.datastore.save(data)))
            .mapTo(`Micro-api descriptor uploaded: apiId=${apiId}, microserviceId=${microserviceId} `);
    }

    /**
     * inspect a microApi row and add to it the sources files as a map of fileName vs Base64 content
     * @param {Object} row MicroService registry content
     */
    enrichMicroApiRowWithFiles$({ row, apiId, setupFile }) {
        //we start observing the apiId row
        return Rx.Observable.of(row)
            //the apiId is composed by multiple microapis, so we need to create a stream od them
            .mergeMap(row =>
                //we start observing the micro-api array
                Rx.Observable.from(row.api[apiId])
                    //then we need to conver this array to an Stream that creates the encodedFileMap and edit the micro-api
                    .switchMap(microapi =>
                        //we start by observing the microapi
                        Rx.Observable.of(microapi)
                            //we only need the SRC property for the microApi 
                            .map(microapi => microapi.src)
                            //since the scr path is relative to the git project, we need to infer the git root also
                            .combineLatest(Rx.Observable.fromPromise(gitRootDir(setupFile)))
                            //now we have the src relative path and the project full path, so we concat them in order 
                            //to get the full path to the src folder
                            .map(([src, gitRoot]) => `${gitRoot}/${src}`)
                            //we need to extract all files within the src folder
                            .switchMap(srcFullPath =>
                                Rx.Observable.bindNodeCallback(fs.readdir)(srcFullPath)
                                    //lets stream file by file
                                    .mergeMap(filesArray => Rx.Observable.from(filesArray))
                                    //before returning the files, we need to concat with the full src path in order to have full files path
                                    .map(fileName => `${srcFullPath}/${fileName}`))
                            .do(filePath => {
                                console.log(filePath);
                            })
                            // now that we each file then we need to transfor them to two values.  1-simple file name 2-file contents decoded to base64
                            .mergeMap(filePath => Rx.Observable.forkJoin(
                                //this is how we get the simple file name
                                Rx.Observable.of(filePath).map(file => {
                                    return file.split('/').pop().replace('.', '*');
                                }),
                                //this is how we encode the file contentes
                                Rx.Observable.bindNodeCallback(base64.encode)(filePath)))
                            //now we have the fileName vs encoded data.  lets reduce it to a single key value object
                            .reduce((acc, [fileName, encodedContent]) => {
                                acc[fileName] = encodedContent;
                                return acc;
                            }, {})
                            //finally, we put the encodedFileMap inside the micro api and return it
                            .map(encodedFileMap => {
                                microapi.encodedFileMap = encodedFileMap;
                                microapi.encodedFileMap.excludeFromIndexes = true;
                                return microapi;
                            })
                    )
            )
            //now we have all the microapis apart, and need to convert them to an array again
            .reduce((acc, microapi) => { acc.push(microapi); return acc; }, [])
            //after having the final array we just assign it to the the api_id 
            .map(microApisArray => {
                row.api[apiId] = microApisArray;
                return row;
            })






    }



    ////////////////////////////////////////////////////////////////////////////////
    //////////////////////////// COMMON TOOLS  //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Creates bucket if not exists
     */
    ensureBucket() {
        return Rx.Observable.fromPromise(this.storage.bucket(this.bucketName).exists())
            .map(data => data[0])
            .switchMap(exists =>
                !exists
                    ? Rx.Observable.fromPromise(this.storage.createBucket(this.bucketName, { location: 'US-CENTRAL1', regional: true }))
                    : Rx.Observable.of('Bucket already created'));
    }


    /**
     * Finds all microservices registered on the store
     * @param {string[]} projection 
     */
    findAllMicroserviceRegisters$() {
        return Rx.Observable.create(async (observer) => {
            await this.findAllMicroserviceRegistersAndExecuteCb(
                undefined,
                (entity) => observer.next(entity)
            );
            observer.complete();
            // Note that this is optional, you do not have to return this if you require no cleanup
            return function () {
                console.log('findAllMicroserviceRegisters Observable disposed');
            };
        });
    }

    /**
     * find all registered microservices and invokes onEntityRetrieved per found entity
     * The search is internally paginated to avoid memory consumption 
     * @param {int} pageCursor 
     * @param {string[]} projection 
     * @param {function} onEntityRetrieved 
     */
    async findAllMicroserviceRegistersAndExecuteCb(pageCursor, onEntityRetrieved, onLastResult) {
        let pageSize = 10;
        let query = this.datastore.createQuery(this.kind)
            .limit(pageSize);
        if (pageCursor) {
            query = query.start(pageCursor);
        }

        const results = await this.datastore.runQuery(query);
        const entities = results[0];
        const info = results[1];
        await entities.forEach(entity => {
            entity.id = entity[Datastore.KEY].name;
            onEntityRetrieved(entity);
        });
        if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
            return findAllMicroserviceRegistersAsCursor(info.endCursor, onEntityRetrieved);
        }
        return;
    }
}

module.exports = GcpServiceDirectory;