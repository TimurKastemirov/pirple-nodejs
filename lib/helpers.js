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

helpers.getRandomString = (strLen) => {
    if (typeof strLen === 'number' && strLen > 0) {
        let result = '';
        while(result.length < strLen) {
            result += (Math.random() + 1).toString(36).substring(2);
        }
        
        result = result.substring(0, strLen);
        return result;
    }

    return false;
};

module.exports = helpers;