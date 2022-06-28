const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const configuration = require('./lib/config');
const routeHandlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

const decoder = new StringDecoder('utf8');
const commonServer = (req, res) => {
	const parsedUrl = url.parse(req.url, true);
	const pathname = parsedUrl.pathname;
	const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');

	const method = req.method;

	const queryObj = parsedUrl.query;

	const headers = req.headers;

	let payload = '';

	req.on('data', (dataBuffer) => {
		payload += decoder.write(dataBuffer);
	});

	req.on('end', () => {
		payload += decoder.end();

		const chosenHandler = routes[trimmedPath] ? routes[trimmedPath] : routeHandlers.notFound;
		const data = {
			method: method.toLowerCase(),
			path: trimmedPath,
			queryParams: queryObj,
			headers,
			payload: helpers.parseJsonToObject(payload),
		};

		chosenHandler(data, (statusCode, respPayload) => {
			statusCode = typeof statusCode === 'number' ? statusCode : 200;
			respPayload = respPayload || {};
			const payloadStr = JSON.stringify(respPayload, null, 4);

			res.setHeader('Content-Type', 'application/json');
			res.writeHead(statusCode);
			// response
			res.end(payloadStr);
		});

		// payload
		console.log(`payload is >>>> ${payload}, typeof ${typeof payload}, length: ${payload.length}`);
	});

	// trimmed path
	console.log('path is ' + trimmedPath);

	// show http method
	console.log(`http method is ${method}`);
	console.log(`query obj`, queryObj);
	console.log('headers => ', headers);
};


const httpServer = http.createServer(commonServer);

const httpsOptions = {
	key: fs.readFileSync('./https/key.pem'),
	cert: fs.readFileSync('./https/cert.pem'),
};
const httpsServer = https.createServer(httpsOptions, commonServer);


httpServer.listen(configuration.httpPort, () => {
	console.log('http server is started on ' + configuration.envName + ' environment');
	console.log('listen port ' + configuration.httpPort);
});

httpsServer.listen(configuration.httpsPort, () => {
	console.log('https server is started on ' + configuration.envName + ' environment');
	console.log('listen port ' + configuration.httpsPort);
});

const routes = {
	ping: routeHandlers.ping,
	users: routeHandlers.users,
	tokens: routeHandlers.tokens,
};
