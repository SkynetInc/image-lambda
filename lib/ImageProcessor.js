'use strict'

const fs = require("fs");
const path = require("path");
const util = require("util");

const gm = require('gm').subClass({imageMagick: true});
const S3Image = require('./S3Image');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');

class ImageProcessor {
    constructor(image, config) {
        this.image = image;
        this.config = config;
    }

    run() {
        let promises = [];
        if (this.config.reduce) {
            promises.push(this.reduce(this.config.reduce));
        }
        for (let params of this.config.resizes) {
            promises.push(this.resize(params));
        }
        return Promise.all(promises);
    }

    resize(params) {
        return new Promise((resolve, reject) => {
            gm(this.image.getData())
                .resize(params.width, params.height)
                .toBuffer(this.image.getImageType(), (error, buffer) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log("[%s] [%s] - %s", this.image.getBucket(), this.image.getKey(),
                            `Resized. (width: ${params.width}, height: ${params.height})`);
                        let name = this.image.getName();
                        //change the target key generation, because dynamic key in the sourceDir
//                        let key = this.image.getKey().replace(params.sourceDir, params.targetDir);
                        let key = `${params.targetDir}/${name}`;
                        let s3Image = new S3Image(params.targetBucket, key, buffer, this.image.getS3Params());
                        s3Image.addS3Params('ACL', params.ACL);
                        resolve(s3Image);
                    }
                });
        });
    }

    reduce(params) {
        return imagemin.buffer(this.image.getData(), {
                plugins: [
                    imageminPngquant(),
                    imageminMozjpeg({quality: 82})
                ]
            })
            .then((buffer) => {
                let percentage = (this.image.getData().length - buffer.length) / this.image.getData().length * 100;
                console.log("[%s] [%s] - %s", this.image.getBucket(), this.image.getKey(),
                    "Reduced: " + percentage.toFixed(2) + "%");
                //course-photos/test_course/test_image.png
                //resized/large/course-photos/test_course/test_image.png
                let name = this.image.getName();
                // let key = this.image.getKey().replace(params.sourceDir, params.targetDir);
                let key = `${params.targetDir}/${name}`;
                let s3Image = new S3Image(params.targetBucket, key, buffer, this.image.getS3Params());
                s3Image.addS3Params('ACL', params.ACL);
                return s3Image;
            });
    }
}

module.exports = ImageProcessor;
