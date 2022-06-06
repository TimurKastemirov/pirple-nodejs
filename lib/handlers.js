const _data = require('./data');
const helpers = require('./helpers');

const routeHandlers = {
	ping: function(data, cb) {
		cb(200);
	},

	notFound: function(data, cb) {
		cb(404);
	}
};

routeHandlers.users = function(data, cb) {
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) !== -1) {
        userHandlers[data.method](data, cb);
        return;
    }

    cb(405); // method not allowed
};

const userHandlers = {};

// @TODO only authenticated users can access their own objects
userHandlers.get = function(data, cb) {
    const ph = data.queryParams.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;
    if(phone) {
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                // remove user hash pass before returning the objekt
                delete userData.hashedPassword;
                cb(200, userData);
            } else {
                cb(404);
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

// required data: firstName, lastName, phone, password, tosAgreement (terms of service)
// optional data: none
userHandlers.post = function(data, cb) {
    const fN = data.payload.firstName;
    const firstName = typeof fN === 'string' && fN.trim().length > 0 ? fN.trim() : false;

    const lN = data.payload.lastName;
    const lastName = typeof lN === 'string' && lN.trim().length > 0 ? lN.trim() : false;
    
    const ph = data.payload.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;
    
    const pass = data.payload.password;
    const password = typeof pass === 'string' && pass.trim().length > 0 ? pass.trim() : false;
    
    const tos = data.payload.tosAgreement;
    const tosAgreement = typeof tos === 'boolean' && tos;

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (err, userData) => {
            if (err) {
                // hash password
                const hashedPassword = helpers.hash(password);
                if (!hashedPassword) {
                    cb(400, { 'Error': 'Couldn\'t hash user\'s password' });
                }

                const userObject = {
                    firstName, lastName, phone, hashedPassword, tosAgreement,
                };

                _data.create('users', phone, userObject, (err) => {
                    if(!err) {
                        cb(200);
                    } else {
                        console.log(err);
                        cb(500, { 'Error': 'Couldn\'t create new user' });
                    }
                });
            } else {
                cb(400, { 'Error': 'User with this phone number is already exist' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required fields' });
    }
};

// required fields: phone
// optional fields: firstName, lastName, password (but one of this fields must be specified)
// @TODO let only authenticated users to be able change their own data
userHandlers.put = function(data, cb) {
    // check for required fields
    const ph = data.payload.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;

    // check for optional fields
    const fN = data.payload.firstName;
    const firstName = typeof fN === 'string' && fN.trim().length > 0 ? fN.trim() : false;

    const lN = data.payload.lastName;
    const lastName = typeof lN === 'string' && lN.trim().length > 0 ? lN.trim() : false;
    
    const pass = data.payload.password;
    const password = typeof pass === 'string' && pass.trim().length > 0 ? pass.trim() : false;

    if (phone) {
        if (firstName || lastName || password) {
            _data.read('users', phone, (err, user) => {
                if (!err && user) {
                    const newUser = {
                        ...user,
                        firstName: firstName ?? user.firstName,
                        lastName: lastName ?? user.lastName,
                    };

                    const hashedPassword = helpers.hash(password);
                    if (hashedPassword) {
                        newUser.hashedPassword = hashedPassword;
                    }

                    _data.update('users', phone, newUser, (err) => {
                        if (!err) {
                            cb(200);
                        } else {
                            console.log(err);
                            cb(500, { 'Error': 'User can\'t be updated' });
                        }
                    });
                } else {
                    cb(400, { 'Error': 'Specified user doesn\'t exist' });
                }
            });
        } else {
            cb(400, { 'Error': 'Missing fields to update' });
        }

    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

// @TODO only auth users can delete their own user
// @TODO clean up (remove) all asossiated data with this user
userHandlers.delete = function(data, cb) {
    // req field
    const ph = data.queryParams.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;
    if (phone) {
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                _data.delete('users', phone, (err) => {
                    if (!err) {
                        cb(200);
                    } else {
                        cb(500, { 'Error': 'Can\'t delete user' });
                    }
                });
            } else {
                cb(404, { 'Error': 'User not found' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

module.exports = routeHandlers;