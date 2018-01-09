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

  /** Reduce, then resize
   * If no resize, just reduce
   * If no reduce, just resize
   * */
  run() {
    return this.reduce(this.config.reduce).then((image) => {
      if (this.config.resizes.length === 0) {
        return Promise.resolve([image])
      }
      const data = !!image ? image.getData() : this.image.getData();
      let promises = [];
      for (let params of this.config.resizes) {
        promises.push(this.resize(params, data));
      }
      return Promise.all(promises)
    });
  }

  resize(params, data) {
    return new Promise((resolve, reject) => {
      gm(data)
      .resize(params.width, params.height)
      .toBuffer(this.image.getImageType(), (error, buffer) => {
        if (error) {
          reject(error);
        } else {
          console.log("[%s] [%s] - %s", this.image.getBucket(), this.image.getKey(),
            `Resized. (width: ${params.width}, height: ${params.height})`);
          let name = this.image.getName();
          let key = `${params.targetDir}/${name}`;
          let s3Image = new S3Image(this.image.getBucket(), key, buffer, this.image.getS3Params());
          s3Image.addS3Params('ACL', params.ACL);
          resolve(s3Image);
        }
      });
    });
  }

  reduce(params) {
    if (!params) return Promise.resolve();
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
      let key = `${params.targetDir}/${name}`;
      // let key = this.image.getKey().replace(params.sourceDir, params.targetDir);
      let s3Image = new S3Image(this.image.getBucket(), key, buffer, this.image.getS3Params());
      s3Image.addS3Params('ACL', params.ACL);
      return Promise.resolve(s3Image);
    });
  }
}

module.exports = ImageProcessor;
