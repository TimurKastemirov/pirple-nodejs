const configurations = {
    staging: {
        envName: 'staging',
        httpPort: 3000,
        httpsPort: 3001,
        hashingSecret: 'thisIsASercret',
    },
    production: {
        envName: 'production',
        httpPort: 5000,
        httpsPort: 5001,
        hashingSecret: 'thisIsAlsoASecret',
    },
};

const env = process.env.NODE_ENV;
const config = configurations[env] || configurations.staging;

module.exports = config;