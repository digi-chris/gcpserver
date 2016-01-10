/*
    Generic Control Protocol Client by Chris Barnard
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

console.log("GCP Client by Chris Barnard");

var gcpClient = function(serveraddress, serverport, initCallback) {
	console.log("Starting GCP client...");
    //this.sessionid = null;
    var sessionid;
	this.server = {};
	this.serverDescription = {};

    this.myName = function() {
        //console.log("myName");
        for(var name in this.global) {
            //console.log(name);
            if(this.global[name] === this) {
                return name;
            }
        }
    };

    this.sendCmd = function(command, args, namespace, callback) {
        if(!namespace) {
            namespace = "default";
        }
        //console.log("posting command " + command);
        //console.log(args);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if(xhr.readyState === 4) {
                //console.log(xhr.responseText);
                var rObj = JSON.parse(xhr.responseText);
                if(rObj.sessionid) {
                    sessionid = rObj.sessionid;
                }
                if(typeof callback === 'function') {
	                callback(rObj.payload);
	            } else {
	            	// TODO: Should we bother telling the client if there is a response
	            	// received when no callback has been requested?
	            	var consoleObj = { "message" : "Unhandled callback in command '" + command + "', the payload is contained in this object.",
	            					   "payload" : rObj.payload }
	            	console.log(consoleObj);
	            }
            }
        };
        xhr.open("POST", "http://" + serveraddress + ":" + serverport, true);
        var cmdObj = {
            "command" : command,
            "namespace" : namespace
        };
        if(args) {
            cmdObj.arguments = args;
        }
        if(sessionid) {
            cmdObj.sessionid = sessionid;
        }
        var cmdString = JSON.stringify(cmdObj);
        console.log("sending " + cmdString);
        //console.log(callback);
        //console.log(namespace);
        xhr.send(cmdString);
    };

    var tobj = this;
    
    function createServerFunction(namespace, cmd, context) {
    	return function() {
    		var args = [];
    		for(var i = 0; i < arguments.length - 1; i++) {
    			args.push(arguments[i]);
    		}
    		
    		var callback;
    		if(typeof(arguments[arguments.length - 1]) === "function") {
    			callback = arguments[arguments.length - 1];
    		} else {
    			args.push(arguments[arguments.length - 1]);
    		} 
    		//console.log("Attempting sendcmd...");
    		//console.log(context);
    		
    		context.sendCmd(cmd, args, namespace, callback);
    	}
    }

	function getNamespace(namespace, responseCallback) {
		tobj.sendCmd("announce", [namespace], "system", function(response) {
			console.log("Announce.");
			console.log(response);
			//console.log(tobj);
			if(response.OK) {
				tobj.serverDescription[namespace] = {};

				var functionNames = Object.getOwnPropertyNames(response.data);/*.filter(function(property) {
					return typeof pcol[property] === 'function';
				});*/

				//var objName = tobj.myName();
				var namespaceObj = "";

				if(namespace != "default") {
					if(tobj.server[namespace]) {
						console.log("WARNING: Namespace '" + namespace + "' is overwriting an existing object!");
					}
					tobj.server[namespace] = {"_name" : namespace};
					namespaceObj = namespace + ".";
					//objName += "." + namespace;
				} else {
					tobj.server["_name"] = namespace;
				}

				for(var i = 0; i < functionNames.length; i++) {
					if(namespace === "default") {
						tobj.server[functionNames[i]] = createServerFunction(namespace, functionNames[i], tobj);
					} else {
						tobj.server[namespace][functionNames[i]] = createServerFunction(namespace, functionNames[i], tobj);
					}
					tobj.serverDescription[namespace][functionNames[i]] = response.data[functionNames[i]].info;
					
					/*
					var fnStr = objName + ".server." + namespaceObj + functionNames[i] + " = function(";
					if(response.data[functionNames[i]].arguments.length > 0) {
						for(var j = 0; j < response.data[functionNames[i]].arguments.length; j++) {
							fnStr += response.data[functionNames[i]].arguments[j] + ", ";
						}
					}

					tobj.serverDescription[namespace][functionNames[i]] = response.data[functionNames[i]].info;

					//console.log(tobj.myName());

					//console.log(serverDescription.default[functionNames[i]]);

					var outStr = fnStr + "callback)";
					//console.log(outStr);
					fnStr += "callback) { " + objName + ".sendCmd(\"" + functionNames[i] + "\", [";
					if(response.data[functionNames[i]].arguments.length > 0) {
						fnStr += "arguments[0]";
						for(var j = 1; j < response.data[functionNames[i]].arguments.length; j++) {
							fnStr += ", arguments[" + j + "]";
						}
					}
					fnStr += "], \"" + namespace + "\", callback) };";
					console.log(fnStr);
					eval(fnStr);
					*/
				}

				tobj.server.system.getProperties(namespace, function(response) {
					//console.log("getProperties");
					//console.log(response);

					var namespaceObj;

					if(namespace === "default") {
						namespaceObj = tobj.server;
					} else {
						namespaceObj = tobj.server[namespace];
					}

					if(!namespaceObj.properties) {
						namespaceObj.properties = response.data;
					} else {
						namespaceObj.properties = response.data;
					}

					namespaceObj.properties._parent = namespaceObj;

					namespaceObj.properties.update = function() {
						console.log("updating properties...");
						//console.log(this);

						var propObj = {};
						for(var obj in this) {
							if(obj.substring(0, 1) != "_") {
								propObj[obj] = this[obj];
							}
						}
						console.log(propObj);
						tobj.server.system.setProperties(this._parent._name, propObj, function() {
							console.log("null callback from properties.update.");
						});
					};

					namespaceObj.properties.refresh = function(callback) {
						tobj.server.system.getProperties(namespace, function(response) {
							console.log("refreshing properties");
							//console.log(response);

							if(namespace === "default") {
								namespaceObj = tobj.server;
							} else {
								namespaceObj = tobj.server[namespace];
							}

							if(!namespaceObj.properties) {
								namespaceObj.properties = response.data;
							} else {
								for(var obj in response.data) {
									//console.log("updating " + obj);
									namespaceObj.properties[obj] = response.data[obj];
								}
							}

							callback();
						});
					}

					if(responseCallback) {
						responseCallback.call(tobj);
					}
				});
			}
		});
	}

	getNamespace("system", function() {
		console.log(tobj);
		getNamespace("default", initCallback);
	});
};

gcpClient.prototype.global = this;