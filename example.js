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
				console.log("testFunction");
				console.log(output);
				return "HI!";
			};
			
			this.badFunction = function() {
				variableThatDoesntExist++;
			};
			
			this.rawCallbackEx = function(aNumber) {
				this.callbackRaw({ "message" : "This is some made up object instead of the standard GCPResponse.", multipliedByTen : aNumber * 10 });
			};
			
			this.complexResponse = function(tableName, numRecords) {
				var tableArray = [];
				for(var i = 0; i < numRecords; i++) {
					tableArray.push({'index' : i, 'guid' : guid(), 'randomNumber' : Math.random()});
				}
				return { 'tableName' : tableName, 'rows' : tableArray };
			};
		}
	}
};

var gcpServer = new gcp.GCPServer(gcpSettings);