const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');



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

helpers.sendTwilioSms = (phone, msg, cb) => {
    phone = typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false;
    msg = typeof msg === 'string' && msg.length > 0 && msg.length <= 1600 ? msg : false;

    if (phone && msg) {
        const payload = {
            'From': config.twilio.fromPhone,
            To: `+1${phone}`,
            Body: msg,
        };

        const stringPayload = querystring.stringify(payload);
        const requestDetails = {
            protocol: 'https:',
            hostname: 'api.twilio.com',
            method: 'POST',
            path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            auth: config.twilio.accountSid + ':' + config.twilio.authToken,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            },
        };

        const req = https.request(requestDetails, (res) => {
            const status = res.statusCode;
            if ([200, 201].includes(status)) {
                cb(false);
            } else {
                cb(`Status code was ${status}`);
            }
        });

        req.on('error', (e) => {
            cb(e);
        });

        req.write(stringPayload);
        req.end(); // send request
    } else {
        cb('Given params are missed or invalid');
    }
};

module.exports = helpers;