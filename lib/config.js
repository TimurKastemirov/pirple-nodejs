const configurations = {
    staging: {
        envName: 'staging',
        httpPort: 3000,
        httpsPort: 3001,
        hashingSecret: 'thisIsASercret',
        maxChecks: 5,
        twilio : {
            accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',
            authToken : '9455e3eb3109edc12e3d8c92768f7a67',
            fromPhone : '+15005550006',
        }
    },
    production: {
        envName: 'production',
        httpPort: 5000,
        httpsPort: 5001,
        hashingSecret: 'thisIsAlsoASecret',
        maxChecks: 5,
        twilio : {
            accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',
            authToken : '9455e3eb3109edc12e3d8c92768f7a67',
            fromPhone : '+15005550006',
        }
    },
};

const env = process.env.NODE_ENV;
const config = configurations[env] || configurations.staging;

module.exports = config;