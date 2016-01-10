# GCPServer

The Generic Control Protocol, or GCP, aims to make the development of client-server software as easy as possible by quietly abstracting the communications layer, leaving the developer free to create exposed functions on the server and seamlessly call them from the client.

Generic Control Protocol v0.2.3 by Chris Barnard, 2016.
GCP is released under GPL version 3.0


# NOTES ON GETTING STARTED

I’m still putting together documentation and a website for this project at present. The
best source of information for implementing client and server communication is to look
at some of the source:

example.js is a working node.js GCP server - have a look in there to see how to set up
a basic server, and run it with the command ‘node example.js’.

wwwroot/index.html contains a very, very basic example which attempts to run a bunch of
commands on the server. It assumes you are running on localhost, and you’ll only see
output on the browser’s developer console.


# INTRODUCTION

GCP is a network protocol designed to allow software developers to easily prototype and
operate client->server communications without needing to worry about the underlying
handshaking and networking layer.

Developed initially for NodeJS and HTML5, GCP enables developers to expose functions and
properties on the server and access them on the client as if they are available locally.

GCP also implements a session state to allow each individual client to share variables
with the server and maintain state during multiple network calls.

GCP attempts to achieve this whilst being as transparent as possible, allowing you to
concentrate on developing your own code instead of spending hours setting up complex
networking procedures and wrestling with multiple technologies.


# BASIC EXAMPLE

For example, let’s say you set up a function on a server to access a MySQL database and
return a number of rows. If this function is exposed through GCP, you can connect to the
GCP server from a web browser and in javascript, simply call the function as if it is a
local function call.

On the server:

```javascript
// set
var myExposedFunctions = function() {
    this.getSomeData = function (dataTable, any, other, parameters) {
        var theRows = [];
        // .. do something ..
        return theRows;
    };
};

// note the ‘myfunctions’ text - this enables us to export multiple namespaces to help
// with code clarity.

var gcpServer = gcp.GCPServer({ exports : {‘myfunctions’ : myExposedFunctions }});
```

On the client:

```javascript
var gcp = new gcpClient(address, port, function() {
    // callback lets us know once we are connected
    gap.server.getSomeData(“customer_table”, “other_params”, 2, 3, function(response) {
        // the returned data comes back in a callback.
        var theRows = response.data;
    });
});
```

# OTHER NOTES

This shouldn’t be considered production ready yet. This is software is primarily for
experimentation and evaluation. Primarily, all network traffic is unencrypted, so it’s not
particularly useful in a production environment across the internet. It’s my intention to
build an encryption layer into GCP.

Alongside this, I’m also considering some form of GZIP compression provided it’s reasonably
fast.

I’ll also need to implement better memory management and error trapping, I’m sure at the
minute it would be very easy to find a way to bring this server down with some form of DoS
attack.

Proper documentation is also quite high on the list as well.

Also, the GCP code implements a very simple web server with the intention of showing an
example of commands being sent to/from the server. See the example.js file for more
information on how to implement your own GCP server.


# CONTACT

You can contact me at chris@barnard.tech for more info.

Chris.