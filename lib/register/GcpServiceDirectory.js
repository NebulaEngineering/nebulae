'use strict'

const Rx = require('rxjs');
const jsonfile = require('jsonfile');
const gitRootDir = require('git-root-dir');
const TarTools = require('../crosscuting/TarTools');

class GcpServiceDirectory {

    /**
     * Setup and Google Cloud service directory
     * @param {googleAppCredentials, projectId, namespace} param0 
     */
    constructor({ googleAppCredentials, projectId, namespace = 'core' }) {
        if (googleAppCredentials) {
            process.env.GOOGLE_APPLICATION_CREDENTIALS = googleAppCredentials;
        }
        // Imports the Google Cloud client library for datastore
        // Creates a client for datastore
        this.datastore = new require('@google-cloud/datastore')({
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
        this.bucketName = `${namespace}_register_frontend`;
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
            .mergeMap(content => Rx.Observable.from(content))
            .filter(content => content.src)
            .map(content => { return { src: content.src, name: content.name } })
            .distinct()
            .combineLatest(Rx.Observable.fromPromise(gitRootDir(setupFile)))
            .switchMap(([mfe, gitRoot]) => TarTools.tarGgz(`${gitRoot}/${mfe.src}`, `${frontendId}_${mfe.name}.tar.gz`))
            .switchMap(tarFile => Rx.Observable.fromPromise(this.storage.bucket(this.bucketName).upload(tarFile)))
            .map(([upload]) => upload.metadata.selfLink);
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
}

module.exports = GcpServiceDirectory;