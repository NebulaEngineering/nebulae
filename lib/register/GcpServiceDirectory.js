'use strict'

const Rx = require('rxjs');
const jsonfile = require('jsonfile');
const gitRootDir = require('git-root-dir');
const TarTools = require('../crosscuting/TarTools');
const Datastore = require('@google-cloud/datastore');
const os = require('os');

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

    /**
     * Stores the setup json into DATASTORE and uploads the frontend packages to STORAGE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontend(microserviceId, frontendId, setupFile) {
        return Rx.Observable.merge(
            this.uploadMicroFrontendDescritor(microserviceId, frontendId, setupFile),
            this.uploadMicroFrontendContents(microserviceId, frontendId, setupFile));
    }

    /**
     *  Stores the setup json into cloud DATASTORE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontendDescritor(microserviceId, frontendId, setupFile) {
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
            .switchMap(data => Rx.Observable.fromPromise(this.datastore.save(data)));
    }

    /**
     * Uploads the frontend packages to cloud STORAGE
     * @param {String} microserviceId 
     * @param {String} frontendId 
     * @param {String} setupFile 
     */
    uploadMicroFrontendContents(microserviceId, frontendId, setupFile) {
        frontendId = frontendId.toLowerCase();
        // The Cloud starage bucket key for the zip
        return this.ensureBucket()
            .switchMap(() => Rx.Observable.bindNodeCallback(jsonfile.readFile)(setupFile))
            .concatMap(content => Rx.Observable.from(content))
            .filter(content => content.src)
            .map(content => { return { src: content.src, name: content.name } })
            .distinct()
            .combineLatest(Rx.Observable.fromPromise(gitRootDir(setupFile)))
            .switchMap(([mfe, gitRoot]) => TarTools.tarGz(`${gitRoot}/${mfe.src}`, `${frontendId}_`, `.tar.gz`))
            .switchMap(tarFile => Rx.Observable.fromPromise(this.storage.bucket(this.bucketName).upload(tarFile)))
            .map(([upload]) => upload.metadata.selfLink);
    }

    /**
     * Downloads all frontend packages from cloud STORAGE
     * Return observable that resolves to the an array of untar directories
     * @param {String} frontendId 
     * @param {String} outputDirectory 
     */
    downloadMicroFrontendContents$(frontendId) {
        const tmpDir = os.tmpdir();
        frontendId = frontendId.toLowerCase();
        //make the bucket exists
        return this.ensureBucket()
            //list all files on the bucket that belongs to the frontendId
            .switchMap(() => Rx.Observable.fromPromise(
                this.storage.bucket(this.bucketName)
                    .getFiles({ prefix: `${frontendId}_` })
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
            .reduce((acc,value) => {acc.push(value); return acc;},[]);
    }

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