/*
    Generic Control Protocol Usage Example by Chris Barnard
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

var gcp = require('./gcp.js');

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

var gcpSettings = {
	// GCP supports multiple namespaces to help with code clarity on the client. The
	// defaultNamespace setting lets us choose one namespace which can be called directly
	// without needing to type the actual namespace. This is largely useful only when you
	// have a small project with only one namespace - it just helps cut down on the amount
	// of code you're typing.
	defaultNamespace : "test",
	exports : {
		"test" : function() {
			this.properties = {
				propertyOne: 0,
				propertyTwo: 10,
				onupdate: function(changedProperties) {
					console.log("properties changed:");
					//console.log(changedProperties);
					for(var i = 0; i < changedProperties.length; i++) {
						console.log(changedProperties[i] + " = " + this[changedProperties[i]]);
					}
				}
			};
			
			this.testFunction = function(output) {
				// there are four ways to send something back to the client.
				//   1. Simply return a variable or object, as in this function.
				//   2. call 'this.callback(obj)', with your object as the only argument.
				//        - this is useful when running asynchronous calls within your function.
				//   3. call 'this.callbackRaw(obj)' with any object as the parameter.
				//        - this is a special case example which overrides GCP's default
				//          response structure, so it is assumed you are writing your own
				//          client.
				//   4. call 'this.callbackError(err)' with an error message.
				//        - this tells the client that an error was encountered.
				//
				//   Note: It's important to send something back, otherwise the client
				//   can remain waiting for a response for a long time. Whilst this
				//   happens asynchronously and is non-blocking, it's not very tidy.
				
				console.log("testFunction");
				console.log(output);
				return "HI!";
			};
			
			this.badFunction = function() {
				// This is an example of a function which is going to crash. GCP will
				// return a message to the client letting it know that the call failed.
				variableThatDoesntExist++;
			};
			
			this.rawCallbackEx = function(aNumber) {
				// Example of a raw callback.
				this.callbackRaw({ "message" : "This is some made up object instead of the standard GCPResponse.", multipliedByTen : aNumber * 10 });
			};
			
			this.complexResponse = function(tableName, numRecords) {
				// An example of a more complex data object being returned. Of course,
				// this is still very simple - GCP is designed to be able to return just
				// about anything.
				var tableArray = [];
				for(var i = 0; i < numRecords; i++) {
					tableArray.push({'index' : i, 'guid' : guid(), 'randomNumber' : Math.random()});
				}
				return { 'tableName' : tableName, 'rows' : tableArray };
			};
			
			// TODO:
			//     - Examples of creating and maintaining session state.
			//     - Examples of providing function descriptions that can be sent to the
			//       client.
			//     - Examples of storing variables in the 'properties' section, which can
			//       be easily 
		}
	}
};

var gcpServer = new gcp.GCPServer(gcpSettings);