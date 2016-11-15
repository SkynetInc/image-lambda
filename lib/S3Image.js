'use strict'

class S3Image {
    constructor(bucket, key, data, s3Params) {
        this.key = key;
        this.bucket = bucket;
        this.data = data;
        this.s3Params = s3Params ? s3Params : {};
    }

    getKey() {
        return this.key;
    }

    getBucket() {
        return this.bucket;
    }

    getData() {
        return this.data;
    }

    getS3Params() {
        return this.s3Params;
    }

    addS3Params(key, value) {
        this.s3Params[key] = value
    }

    getImageType() {
        return this.s3Params.ContentType.split('/')[1]
    }
    getName() {
        return this.key.replace(/^.*[\\\/]/, '')
    }
}

module.exports = S3Image;
