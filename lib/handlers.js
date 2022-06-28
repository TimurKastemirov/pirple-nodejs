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

userHandlers.get = function(data, cb) {
    const ph = data.queryParams.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;
    if(phone) {
        const token = typeof data.headers.token === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
        
        routeHandlers._tokens.verifyToken(token, phone, (isValid) => {
            if (isValid) {
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
                cb(403, { 'Error': 'Token is not valid for current user' });
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
            const token = typeof data.headers.token === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
        
            routeHandlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
                    _data.read('users', phone, (err, user) => {
                        if (!err && user) {
                            const newUser = {
                                ...user,
                                firstName: firstName || user.firstName,
                                lastName: lastName || user.lastName,
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
                    cb(403, { 'Error': 'Token missed or invalid' });
                }
            });
        } else {
            cb(400, { 'Error': 'Missing fields to update' });
        }

    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

// @TODO clean up (remove) all asossiated data with this user
userHandlers.delete = function(data, cb) {
    // req field
    const ph = data.queryParams.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;
    if (phone) {
        const token = typeof data.headers.token === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
        
        routeHandlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
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
                cb(403, { 'Error': 'Token is missed or invalid' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

routeHandlers.tokens = function(data, cb) {
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) !== -1) {
        routeHandlers._tokens[data.method](data, cb);
        return;
    }

    cb(405); // method not allowed
};

const tokens = {};
// create token
// required fields: phone, password
tokens.post = (data, cb) => {
    const ph = data.payload.phone;
    const phone = typeof ph === 'string' && ph.trim().length === 10 ? ph.trim() : false;
    
    const pass = data.payload.password;
    const password = typeof pass === 'string' && pass.trim().length > 0 ? pass.trim() : false;

    if (phone && password) {
        _data.read('users', phone, (err, user) => {
            if (!err && user) {
                const hash = helpers.hash(password);
                if (hash === user.hashedPassword) {
                    const tokenId = helpers.getRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60; // +1 hour from now
                    const tokenObj = {
                        id: tokenId,
                        expires,
                        phone,
                    };

                    _data.create('tokens', tokenId, tokenObj, (err) => {
                        if (!err) {
                            cb(200, tokenObj);
                        } else {
                            cb(500, { 'Error': 'Can\'t create new token' });
                        }
                    });
                } else {
                    cb(400, { 'Error': 'Password didn\'t match' });
                }
            } else {
                cb(404, { 'Error': 'User not found by specified phone' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missed required field(s)' });
    }
};

tokens.get = (data, cb) => {
    const tokenId = data.queryParams.id;
    const id = typeof tokenId === 'string' && tokenId.trim().length === 20 ? tokenId.trim() : false;
    if(id) {
        _data.read('tokens', id, (err, tokenObj) => {
            if (!err && tokenObj) {
                cb(200, tokenObj);
            } else {
                cb(404, { 'Error': 'Token not found' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

// required fields: id, extend
tokens.put = (data, cb) => {
    const tokenId = data.payload.id;
    const id = typeof tokenId === 'string' && tokenId.trim().length === 20 ? tokenId.trim() : false;

    const extend = typeof data.payload.extend === 'boolean' && data.payload.extend;

    if (id && extend) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, tokenData, (err) => {
                        if (!err) {
                            cb(200);
                        } else {
                            cb(500, { 'Error': 'Can\'t update token\'s expiration' });
                        }
                    });
                } else {
                    cb(400, { 'Error': 'The token is already expired and can\'t be extended' });
                }
            } else {
                cb(404, { 'Error': 'Token not found' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field(s)' });
    }
};

// required field: id
tokens.delete = (data, cb) => {
    const tokenId = data.queryParams.id;
    const id = typeof tokenId === 'string' && tokenId.trim().length === 20 ? tokenId.trim() : false;
    if(id) {
        _data.read('tokens', id, (err, tokenObj) => {
            if (!err && tokenObj) {
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        cb(200);
                    } else {
                        cb(500, { 'Error': 'Can\'t delete specified token' });
                    }
                });
            } else {
                cb(404, { 'Error': 'Token not found' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

// to virify if token id is valid for current user
tokens.verifyToken = (tokenId, phone, cb) => {
    _data.read('tokens', tokenId, (err, tokenData) => {
        if (!err && tokenData) {
            cb(tokenData.phone === phone && tokenData.expires > Date.now());
        } else {
            cb(false);
        }
    });
};

routeHandlers._tokens = tokens;

module.exports = routeHandlers;