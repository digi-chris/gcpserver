/*
    Generic Control Protocol Server by Chris Barnard
    Copyright (C) 2016  Chris Barnard & Barnard Technology

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var net = require('net');
var http = require('http');
var fs = require('fs');
var url = require('url');
var path = require('path');
var _gcp_version = "0.2.3";

var DEFAULT_LISTEN_PORT = 5000;
var DEFAULT_DATA_PORT = 5001;
var DEFAULT_HTTP_PORT = 4999;

var GCP_TIMEOUT = 60000;
var DATA_TIMEOUT = 60000;

var SERIALIZER = JSON;

var pendingStreams = [];

var sessionData = {};

//var namespaces = [];

function checkPendingStreams() {
    // TODO: In case a socket is checking pendingStreams, we shouldn't remove anything at the same time - need to halt one or other process.
    var removeStreams = [];
    for(var i = 0; i < pendingStreams.length; i++) {
        if(pendingStreams[i].ClientInfo.socket.closed) {
            removeStreams.push(i);
        }
    }
    for(var i = removeStreams.length - 1; i > -1; i--) {
        pendingStreams.splice(removeStreams[i], 1);
    }
}

function isEmptyObject(obj) {
  return Object.getOwnPropertyNames(obj).length === 0;
}

module.exports = {
	GCPServer: function(settings) {
		var _gcpServer = this;
		var tcpPort = DEFAULT_LISTEN_PORT;
		var dataPort = DEFAULT_DATA_PORT;
		var httpPort = DEFAULT_HTTP_PORT;
		var enableHTTP = true;
		var enableTCP = true;
		var defaultNamespace;
		this.namespaces = [];
		this.settings = {
			autoResponse: true,
			detailedErrors: true
		}
		
		console.log("GCPServer");
		//console.log(tobj);

        var syspcol = new systemProtocol();
        this.namespaces['system'] = syspcol;
		
		if(settings) {
			if(settings.tcpPort) {
				tcpPort = settings.tcpPort;
			}
			if(settings.httpPort) {
				httpPort = settings.httpPort;
			}
			if(settings.dataPort) {
				dataPort = settings.dataPort;
			}
			if(settings.defaultNamespace) {
				defaultNamespace = settings.defaultNamespace;
			}
			
			if(settings.exports) {
				for(var obj in settings.exports) {
					if(settings.exports[obj]) {
						this.namespaces[obj] = new settings.exports[obj]();
						//this.namespaces[obj]._gcpServer = this;
						if(obj === defaultNamespace) {
							this.namespaces['default'] = this.namespaces[obj];
						}
					}
				}
			}
			
			if(typeof settings.autoResponse === 'boolean') {
				this.settings.autoResponse = settings.autoResponse;
			}
			
			if(typeof settings.detailedErrors === 'boolean') {
				this.settings.detailedErrors = settings.detailedErrors;
			}
		}
		
		if(typeof defaultNamespace === 'undefined') {
			// we don't have a default namespace set, just pick the first one that isn't
			// 'system'.
			for(var nobj in this.namespaces) {
				if(nobj !== 'system') {
					this.namespaces['default'] = this.namespaces[nobj];
					console.log('Automatically setting \'' + nobj + '\' as the default namespace');
					break;
				}
			}
		}
		
		
        //var pcol = new protocol();
        //namespaces['default'] = pcol;
        //this.protocol = pcol;
        for(var n in this.namespaces) {
        	if(n !== 'default') {
        		//console.log(n);
        		//console.log(namespaces[n]);
        		if(!this.namespaces[n].properties) {
        			this.namespaces[n].properties = {};
        		}
        		if(!this.namespaces[n].properties._description) {
        			this.namespaces[n].properties._description = [];
        		}
        		this.namespaces[n].properties._description._lookup = {};
        		for(var i = 0; i < this.namespaces[n].properties._description.length; i++) {
        			this.namespaces[n].properties._description_lookup[this.namespaces[n].properties._description[i].property] = this.namespaces[n].properties._description[i];
        		}
        	}
        }

		if(enableHTTP) {
			http.createServer(function(req, res) {
				console.log('REQUEST: ' + req.method);
				switch(req.method) {
					case "OPTIONS":
						console.log("sending response");
						res.writeHead(200, {
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
						});
						res.end();
						break;
					case "GET":
						var uri = './wwwroot/' + url.parse(req.url).pathname;
						var filename = path.join(process.cwd(), uri);

						fs.exists(filename, function(exists) {
							if(!exists) {
								res.writeHead(404, {'Content-Type': 'text/plain'});
								res.write('404 Not Found\n');
								res.end();
								return;
							}

							if (fs.statSync(filename).isDirectory()) filename += '/index.html';

							fs.readFile(filename, 'binary', function(err, file) {
								if(err) {
									res.writeHead(500, {'Content-Type': 'text/plain'});
									res.write(err + '\n');
									res.end();
									return;
								}

								//res.writeHead(200);
								res.writeHead(200, {
									'Access-Control-Allow-Origin': '*',
									'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
									'Content-Type': 'text/html; charset=UTF-8'
								});
								res.write(file, 'binary');
								res.end();
							});
						});


						//res.end('Hello from GCP Server.\n');
						break;
					case "POST":
						req.on('data', function(chunk) {
							console.log("Received data:");
							console.log(chunk.toString());
							//console.log(_gcpServer);
							//console.log(_gcpServer.namespaces);
							callFunction(_gcpServer, chunk.toString(), null, function(response) {
								//console.log("response: " + response);
								res.end(response);
							});
						});
						res.writeHead(200, {
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
							'Content-Type': 'application/json'
						});

						//res.end('Hello from GenericCommsServer.\n');
						break;
				}
			}).listen(httpPort, "");
			
        	console.log("GCP running on HTTP port " + httpPort + ".");
        }

		//if(enableTCP) {
			net.createServer(function (socket) {
				var indata = '';

				var dataListener = function(data) {
					for(var v = 0; v < data.length; v++) {
						indata += String.fromCharCode(data[v]);
					}

				   for(var i = 0; i < pendingStreams.length; i++) {
					   var partialmatch = false;
					   if(indata === pendingStreams[i].Response.handshake) {
						   socket.removeListener('data', dataListener);
						   if(pendingStreams[i].ClientInfo.handshake) {
							   socket.write(pendingStreams[i].ClientInfo.handshake);
						   }
						   pendingStreams[i].Response.payload.datastreamcallback(socket);
						   pendingStreams.splice(i, 1);
						   partialmatch = true;
						   break;
					   } else if(indata === pendingStreams[i].Response.handshake.substring(0, indata.length)) {
						   partialmatch = true;
					   }
					   //console.log("socket " + i + " " + pendingStreams[i].ClientInfo.socket.closed);
				   }
				   if(!partialmatch) {
					   // we don't recognise this handshake - boot the user
					   socket.destroy();
				   }
				};
				socket.on('data', dataListener);
			}).listen(dataPort);
		//}

        setInterval(checkPendingStreams, 5000);

		if(enableTCP) {
			// Start a TCP Server
			net.createServer(function (socket) {
				socket.setTimeout(GCP_TIMEOUT, function() {
				  	socket.closed = true;
				  	socket.destroy();
			  	});
			  	var buffer = '';

			  	// Identify this client
			  	socket.name = socket.remoteAddress + ":" + socket.remotePort;

			  	// Send a nice welcome message and announce
			  	socket.write("GCP v0.1.\r\n");
			  	//broadcast(socket.name + " joined the chat\n", socket);

			  	socket.setKeepAlive(true, 2000);
			  	socket.closed = false;

			  	socket.on('close', function() {
					socket.closed = true;
			  	});
			  	// Handle incoming messages from clients.
			  	socket.on('data', function (data) {
					//broadcast(socket.name + "> " + data, socket);
					//broadcast(socket.name + "> " + data, socket);
					for(var i = 0; i < data.length; i++) {
						buffer += String.fromCharCode(data[i]);
						if(doesTerminate(buffer)) {
							//console.log(buffer);
							var cmd = buffer;
							buffer = '';

							callFunction(_gcpServer, cmd, socket, function(response) {
								socket.write(response);
							});

						}
					}
				});


				function doesTerminate(str) {
					if(str.length > 0) {
						if(str[str.length - 1] === '\n' && str[str.length - 2] === '\r') {
							return true;
						}
					}
					return false;
				}

				/*
				socket.on('end', function () {
					
				});
				*/

        	}).listen(tcpPort);
        	
        	console.log("GCP running on TCP port " + tcpPort + ".");
        }
	},
    createSession: function() {
        var session = {};
        session._gcp_guid = guid();
        sessionData[session._gcp_guid] = session;
        return session;
    },
    GCPResponse: function (ok, message, data, datastreamcallback) {
        this.OK = ok;
        this.message = message;
        this.data = data;
        this.datastreamcallback = datastreamcallback;
    }
};

var systemProtocol = function() {
	var _this = this;
	
	this.version = function() {
		this.callback(_gcp_version);
	}
	
	this.getProperties = function(namespace) {
        if(!namespace) {
            namespace = 'default';
        }
        var pcol = this.namespaces[namespace];

        var properties = {};
        if(pcol.properties) {
			properties = pcol.properties;
		}

		//console.log("PROPERTIES");
		//console.log(properties);

		this.callback(properties);
	};

	this.setProperties = function(namespace, properties) {
        if(!namespace) {
            namespace = 'default';
        }
        var pcol = this.namespaces[namespace];

		//console.log("setProperties!");
		//console.log(properties);
		var changedProperties = [];
		for(var obj in properties) {
			if(!pcol.properties[obj]) {
				// object doesn't exist - add it
				changedProperties.push(obj);
				pcol.properties[obj] = properties[obj]
			} else {
				// object does exist - has it changed?
				if(pcol.properties[obj] != properties[obj]) {
					changedProperties.push(obj);
					pcol.properties[obj] = properties[obj]
				}
			}
		}
		if(changedProperties.length > 0) {
			pcol.properties.onupdate(changedProperties);
		}

		this.callback(changedProperties);
	};

    this.announce = function(namespace) {
        var protocolObj = {};
        
        if(!namespace) {
            namespace = 'default';
        }
        
        var pcol = this.namespaces[namespace];
        var functionNames = Object.getOwnPropertyNames(pcol).filter(function(property) {
            return typeof pcol[property] === 'function';
        });
        
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;

        for(var i = 0; i < functionNames.length; i++) {
            var fnStr = pcol[functionNames[i]].toString();
            //console.log(fnStr);
            var comments = fnStr.match(STRIP_COMMENTS);
            //console.log(comments);
            fnStr = fnStr.replace(STRIP_COMMENTS, '');
            var fnArgs = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
            if(fnArgs === null)
               fnArgs = [];
            //console.log(functionNames[i] + " - " + fnArgs);
            var funcObj = { arguments : fnArgs };
            if(comments) {
				//console.log(comments);
				var funcDesc = "";
				for(var j = 0; j < comments.length; j++) {
					//console.log(comments[j]);
					if(comments[j].substring(0,3) === '///') {
						funcDesc += comments[j].substring(3);
					}
				}

				//funcDesc = SERIALIZER.parse(funcDesc);
				if(funcDesc !== "") {
					try {
						var descObj = JSON.parse(funcDesc);
						funcObj.info = descObj;
					} catch(ex) {
						console.log("Cannot build function information. There could be an error in the JSON:");
						console.log(funcDesc);
					}
				}
			}
			//console.log(descObj);
            protocolObj[functionNames[i]] = funcObj;
        }

        //console.log(JSON.stringify(protocolObj));

        this.callback(protocolObj);
    };
};

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

function callFunction(gcpServer, cmd, socket, callback) {
	var nspaces = gcpServer.namespaces;
	var response = {status: "Not processed", status_code: 0, uid : uid, payload: {}};
	var payloadRcvd = false;
	try {
		var sendCallback = function() {
			var payload;
			if(arguments.length > 1) {
				// TODO: Possible strange usage-case? If we receive more than one
				// argument in the return, we can turn our response payload into an
				// array of all received arguments. Seems useful, but does it mean
				// we are mixing standards when a single argument is not returned in
				// an array?
				payload = new GCPResponse(true, "OK", arguments);
			} else {
				payload = new GCPResponse(true, "OK", arguments[0]);
			}
			console.log('sendCallback');
			console.log(payload);
			getPayload(payload);
		}
		
		var getPayload = function(payload) {
			payloadRcvd = true;
			console.log(cmd + " - recvd payload: " + payload);
			response.payload = payload;

			if(this.session) {
				if(!isEmptyObject(this.session)) {
					if(!session['_gcp_guid']) {
						var newGuid = guid();
						while(typeof sessionData[session._gcp_guid] !== 'undefined') {
							// make sure we don't create a GUID that already exists.
							newGuid = guid();
						}
						this.session['_gcp_guid'] = newGuid;
						console.log('created session: ' + this.session['_gcp_guid']);
						sessionData[session._gcp_guid] = session;
					} else {
						console.log("recvd session: " + this.session['_gcp_guid']);
					}
					response.sessionid = session['_gcp_guid'];
				}
			}

			if(typeof response.payload.datastreamcallback === 'function') {
				var streamingport = DATA_PORT;
				response.streamport = streamingport;
				response.handshake = "HANDSHAKE";
				var dataObj = {ClientInfo: obj, Response: response};
				pendingStreams.push(dataObj);

				//socket.write(SERIALIZER.stringify(response));
				callback(SERIALIZER.stringify(response));
			} else {
				//socket.write(SERIALIZER.stringify(response));
				callback(SERIALIZER.stringify(response));
			}
		};
		
		var sendError = function(error) {
			response.payload = new GCPResponse(false, "ERR", error);
			callback(SERIALIZER.stringify(response));
		}
	} catch (ex) {
        console.log("ERROR SENDING RESPONSE TO CLIENT:" + ex + " (" + cmd + ")");
        console.log(ex.stack);
	}

    try {
        var obj = SERIALIZER.parse(cmd);

        if(obj['command']) {
            var cmd = obj['command'];
            var args = obj['arguments'];
            var uid = obj['uid'];
            var sessionid = obj['sessionid'];
            var namespace = obj['namespace'];
            var pcol = nspaces['default'];
            if(namespace) {
                pcol = nspaces[namespace];
            }
            var session;
            if(sessionid) {
                session = sessionData[sessionid];
            }
            var functions = Object.getOwnPropertyNames(pcol).filter(function(p) {
                return typeof pcol[p] === 'function';
            });
            obj.socket = socket;

            if(session) {
                response.sessionid = session['_gcp_guid'];
            } else {
                session = {};
            }

            var context = {
                'session' : session,
                'callback' : sendCallback,
                'callbackError' : sendError,
                'callbackRaw' : getPayload,
                'namespaces' : nspaces
            };

            for(var i = 0; i < functions.length; i++) {
                response.status = "Command not found";

                if(functions[i] === cmd) {
                    response.status = "OK";
                    response.status_code = 1;
                    var retVal;
                    if(typeof args === 'object') {
                        retVal = pcol[functions[i]].apply(context, args);
                    } else {
                        retVal = pcol[functions[i]].apply(context, []);
                    }
                    console.log("cmd run");
                    console.log(retVal);
                    console.log(payloadRcvd);
                    if(gcpServer.settings.autoResponse) {
						if(!payloadRcvd && typeof retVal !== 'undefined') {
							// We have received a return value from the called function, and
							// no callback has currently been initiated. Therefore, assume
							// that the returned value is intended to be passed to the client.
							// NOTE: This behaviour can be switched off by setting the
							// 'autoResponse' setting to false when initiating a GCPServer.
							sendCallback(retVal);
						} else if(payloadRcvd && typeof retVal !== 'undefined') {
							// We did receive a returned value, but a callback has already
							// been initiated. Report to the console what has happened.
							console.log('\'' + cmd + '\' returned a value but it cannot be passed to the client, because a callback has already been initiated.');
						}
					}
                    break;
                }
            }
        }
    } catch (ex) {
        //console.log(socket.name + ":ERR:" + ex + " (" + cmd + ")");
        console.log("ERR:" + ex + " (" + cmd + ")");
        console.log(ex.stack);
        if(!payloadRcvd) {
        	// something generated an error and we haven't sent our callback yet.. assume
        	// it's not going to get sent, and send the client an error response.
        	if(gcpServer.settings.detailedErrors) {
        		sendError(ex.stack);
        	} else {
        		sendError('Internal server error.');
        	}
        }
    }
}

var GCPResponse = function (ok, message, data, datastreamcallback) {
    this.OK = ok;
    this.message = message;
    this.data = data;
    this.datastreamcallback = datastreamcallback;
};