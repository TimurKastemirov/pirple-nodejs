const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};
lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir + dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            const strData = JSON.stringify(data, null, '\t');

            fs.writeFile(fileDescriptor, strData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                            return;
                        }

                        callback('Error while closing file. >>>> ' + err.message);
                    });
                    return;
                }

                callback('Error while writing file. >>>> ' + err.message);
            });
            return;
        }

        callback('Could not create new file. >>>> ' + err.message);
    });
};

lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf-8', (err, data) => {
        if (!err && data) {
            callback(false, helpers.parseJsonToObject(data));
        } else {
            callback(err, data);
        }
    });
};

lib.update = (dir, file, data, cb) => {
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const strData = JSON.stringify(data);

            fs.ftruncate(fileDescriptor, (err) => {
                if(!err) {
                    // write to file
                    fs.writeFile(fileDescriptor, strData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    cb(false);
                                } else {
                                    cb(err.message);
                                }
                            });
                        }
                        else {
                            cb(err.message);
                        }
                    });
                } else {
                    cb(err.message);
                }
            });
            return;
        }

        callback(err.message);
    });
};

lib.delete = (dir, file, cb) => {
    // unlink - remove file from fs
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, (err) => {
        if (!err) {
            cb(false);
            return;
        }

        cb(err.message);
    });
};

module.exports = lib;