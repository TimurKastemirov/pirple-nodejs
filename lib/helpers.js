const crypto = require('crypto');
const config = require('./config');



const helpers = {};

// SHA256 hash
helpers.hash = (str) => {
    if (typeof str === 'string' && str.trim().length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(str, 'utf-8').digest('hex');
        return hash;
    } else {
        return false;
    }
};

helpers.parseJsonToObject = (str) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        return {};
    }
};

module.exports = helpers;