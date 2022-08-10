const config = require('./config');
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

// req fields: phone
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
                                const userChecks = Array.isArray(userData.checks) ? userData.checks : [];
                                const checksToDelete = userChecks.length;
                                if (checksToDelete > 0) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;

                                    userChecks.forEach(checkId => {
                                        _data.delete('checks', checkId, (err) => {
                                            if(err) {
                                                deletionErrors = true;
                                            }

                                            checksDeleted++;
                                            if(checksDeleted === checksToDelete) {
                                                if (!deletionErrors) {
                                                    cb(200);
                                                } else {
                                                    cb(500, { 'Error': 'Error encountered because of we could not delete all checks in a loop' });
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    cb(200);
                                }
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

routeHandlers.checks = function(data, cb) {
    const acceptableMethods = ['get', 'post', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) !== -1) {
        routeHandlers._checks[data.method](data, cb);
        return;
    }

    cb(405); // method not allowed
};

routeHandlers._checks = {};

// POST
// required data: protocol, url, method, successCodes, timeoutSeconds
routeHandlers._checks.post = (data, cb) => {
    const protocol = typeof data.payload.protocol === 'string' && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    const url = typeof data.payload.url === 'string' && data.payload.url.length > 0 ? data.payload.url : false;
    const method = typeof data.payload.protocol === 'string' && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    const successCodes = typeof data.payload.successCodes === 'object' && Array.isArray(data.payload.successCodes) && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds =
        typeof data.payload.timeoutSeconds === 'number'
        && data.payload.timeoutSeconds % 1 === 0
        && data.payload.timeoutSeconds >= 1
        && data.payload.timeoutSeconds < 5
            ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // get token from headers
        const token = typeof data.headers.token === 'string' ? data.headers.token : false;
        _data.read('tokens', token, (err, tokenData) => {
            if (!err && tokenData) {
                const userPhone = tokenData.phone;
                // look user
                _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                        const userChecks = typeof userData.checks === 'object' && Array.isArray(userData.checks) ? userData.checks : [];
                        // verify if user has less than max checks per user
                        if(userChecks.length < config.maxChecks) {
                            const checkId = helpers.getRandomString(20);
                            const checkObj = {
                                id: checkId,
                                userPhone: userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds,
                            };

                            _data.create('checks', checkId, checkObj, (err) => {
                                if (!err) {
                                    userData.checks = [...userChecks, checkId];
                                    _data.update('users', userPhone, userData, (err) => {
                                        if (!err) {
                                            cb(200, checkObj);
                                        } else {
                                            cb(500, { 'Error': 'Could not update user with new check' });
                                        }
                                    })
                                } else {
                                    cb(500, { 'Error': 'Could not create new check' });
                                }
                            });
                        } else {
                            cb(400, { 'Error': `Max number of checks is exceeded (${config.maxChecks} checks)` });
                        }
                    } else {
                        cb(403);
                    }
                });
            } else {
                cb(403);
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required inputs, or inputs are invalid' });
    }
};

// required fields: id
routeHandlers._checks.get = (data, cb) => {
    const ID = data.queryParams.id;
    const id = typeof ID === 'string' && ID.trim().length === 20 ? ID.trim() : false;
    if(id) {
        // lookup the check
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                const token = typeof data.headers.token === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
                
                routeHandlers._tokens.verifyToken(token, checkData.userPhone, (isValid) => {
                    if (isValid) {
                        cb(200, checkData);
                    } else {
                        cb(403);
                    }
                });
            } else {
                cb(404);
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

// checks put
// req data: id
// optional: else of id, but one must be set
routeHandlers._checks.put = (data, cb) => {
    const id = typeof data.payload.id === 'string' && data.payload.id.trim().length === 20 ? data.payload.id : false;

    const protocol = typeof data.payload.protocol === 'string' && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    const url = typeof data.payload.url === 'string' && data.payload.url.length > 0 ? data.payload.url : false;
    const method = typeof data.payload.protocol === 'string' && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    const successCodes = typeof data.payload.successCodes === 'object' && Array.isArray(data.payload.successCodes) && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds =
        typeof data.payload.timeoutSeconds === 'number'
        && data.payload.timeoutSeconds % 1 === 0
        && data.payload.timeoutSeconds >= 1
        && data.payload.timeoutSeconds < 5
            ? data.payload.timeoutSeconds : false;

    if (id) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    const token = typeof data.headers.token === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
                
                    routeHandlers._tokens.verifyToken(token, checkData.userPhone, (isValid) => {
                        if (isValid) {
                            // update checks where necessary
                            if (protocol) {
                                checkData.protocol = protocol;
                            }

                            if (url) {
                                checkData.url = url;
                            }

                            if (method) {
                                checkData.method = method;
                            }

                            if (successCodes) {
                                checkData.successCodes = successCodes;
                            }

                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            _data.update('checks', id, checkData, (err) => {
                                if (!err) {
                                    cb(200);
                                } else {
                                    cb(500, { 'Error': 'Could not update the check' });
                                }
                            });
                        } else {
                            cb(403);
                        }
                    });
                } else {
                    cb(400, { 'Error': 'Check ID did not exist' });
                }
            });
        } else {
            cb(400, { 'Error': 'Missing fields to update' });
        }
    } else {
        cb(400, { 'Error': 'Missed required field' });
    }
};

// delete, req data: id
routeHandlers._checks.delete = (data, cb) => {
    // req field
    const ID = data.queryParams.id;
    const id = typeof ID === 'string' && ID.trim().length === 20 ? ID.trim() : false;
    if (id) {
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                const token = typeof data.headers.token === 'string' && data.headers.token.trim().length === 20 ? data.headers.token.trim() : false;
                const phone = checkData.userPhone;
                routeHandlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        _data.delete('checks', id, (err) => {
                            if(!err) {
                                _data.read('users', phone, (err, userData) => {
                                    if (!err && userData) {
                                        const userChecks = Array.isArray(userData.checks) ? userData.checks : [];
                                        const checkPosition = userChecks.indexOf(id);
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            userData.checks = userChecks;
                                            _data.update('users', phone, userData, (err) => {
                                                if (!err) {
                                                    cb(200);
                                                } else {
                                                    cb(500, { 'Error': 'Can\'t update user' });
                                                }
                                            });
                                        } else {
                                            cb(500, { 'Error': 'Could not find check in user object' });
                                        }
                                    } else {
                                        cb(500, { 'Error': 'Could not find user who created the check' });
                                    }
                                });        
                            } else {
                                cb(500, { 'Error': 'Could not delete the check data' });
                            }
                        });
                    } else {
                        cb(403);
                    }
                });
            } else {
                cb(400, { 'Error': 'The specified check id does nor exist' });
            }
        });
    } else {
        cb(400, { 'Error': 'Missing required field' });
    }
};

module.exports = routeHandlers;