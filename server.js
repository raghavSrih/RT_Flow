/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var path = require('path');
var url = require('url');
var express = require('express');
var minimist = require('minimist');
var ws = require('ws');
var kurento = require('kurento-client');
var fs    = require('fs');
var https = require('https');
var http = require('http');
var Symple = require('symple');

var sy = new Symple();
sy.loadConfig(__dirname + '/symple.json'); // see symple.json for options
sy.init();
console.log('Symple server listening on port ' + sy.config.port);

var argv = minimist(process.argv.slice(2), {
    default: {
		as_uri: 'https://192.168.1.209:8443/',
        ws_uri: 'ws://192.168.1.209:8888/kurento'
    }
});

var options =
{
  key:  fs.readFileSync('keys/server.key'),
  cert: fs.readFileSync('keys/server.crt')
};

var app = express();

/*
 * Definition of global variables.
 */
var idCounter = 0;
var clients = {};
var candidatesQueue = {};
var kurentoClient = null;
var dispatcher = null;
var mediaPipeline = null;

/*
 * Server startup
 */
/*
 * Server startup
 */
sy_serverPort = parseInt(sy.config.port)
sy_clientPort = sy_serverPort - 1;

app.set('port', sy_clientPort);
app.use(express.static(__dirname + '/static/assets'));
app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/static'));


var server_http = http.createServer(app).listen(4488, function() {
    console.log('Kurento Tutorial started');
    console.log('Open http://localhost:' + 4488 + ' with a WebRTC capable browser');
});


var wss_http = new ws.Server({
    server : server_http,
    path : '/one2many'
});

function nextUniqueId() {
	idCounter++;
	return idCounter.toString();
}

wss_http.on('connection', function(ws) {

	var sessionId = nextUniqueId();
	console.log('Connection received with sessionId ' + sessionId);

    ws.on('error', function(error) {
        console.log('Connection ' + sessionId + ' error');
        stop(sessionId);
    });

    ws.on('close', function() {
        console.log('Connection ' + sessionId + ' closed');
        stop(sessionId);
    });

    ws.on('message', function(_message) {
        var message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id)
        {
            case 'client':
                addClient(ws,message.uid, message.name, message.sdpOffer, function(error, sdpAnswer) {
                    if (error) {
                        return ws.send(JSON.stringify({
                            id : 'response',
                            response : 'rejected',
                            message : error
                        }));
                    }
                    ws.send(JSON.stringify({
                        id : 'response',
                        response : 'accepted',
                        sdpAnswer : sdpAnswer
                    }));
                });
                break;

            case 'stop':
                stop(sessionId);
                break;

            case 'switchSource':
                switchSource(message.sourceId, message.sinkId, function(error) {
                    ws.send(JSON.stringify({
                        id : 'error',
                        message : 'Invalid Ids ' + message
                    }));
                });
                break;

            case 'onIceCandidate':
                onIceCandidate(message.uid, message.candidate);
                break;
        
            default:
                    ws.send(JSON.stringify({
                        id : 'error',
                        message : 'Invalid message ' + message
                    }));
                    break;
        }
    });
});

/*
 * Definition of functions
 */

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(argv.ws_uri, function(error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address " + argv.ws_uri);
            return callback("Could not find media server at address" + argv.ws_uri
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

// Retrieve or create mediaPipeline
function getMediaPipeline( callback ) {
    if ( mediaPipeline !== null ) {
        console.log("MediaPipeline already created");
        return callback( null, mediaPipeline );
    }
    getKurentoClient(function(error, _kurentoClient) {
        if (error) {
            return callback(error);
        }
        _kurentoClient.create( 'MediaPipeline', function( error, _pipeline ) {
            console.log("creating MediaPipeline");
            if (error) {
                return callback(error);
            }
            mediaPipeline = _pipeline;
            callback(null, mediaPipeline);
        });
    });
}

// Retrieve or create dispatcher hub
function getDispatcher( callback ) {
    if ( dispatcher !== null ) {
        console.log("Composer already created");
        return callback( null, dispatcher, mediaPipeline );
    }
    getMediaPipeline( function( error, _pipeline) {
        if (error) {
            return callback(error);
        }
        _pipeline.create( 'Dispatcher',  function( error, _dispatcher ) {
            console.log("creating dispatcher");
            if (error) {
                return callback(error);
            }
            dispatcher = _dispatcher;
            callback( null, dispatcher );
        });
    });
}

// Create a hub port
function createHubPort(callback) {
    getDispatcher(function(error, _dispatcher) {
        if (error) {
            return callback(error);
        }
        _dispatcher.createHubPort( function(error, _hubPort) {
            console.info("Creating hubPort");
            if (error) {
                return callback(error);
            }
            callback( null, _hubPort );
        });
    });
}

// Create a webRTC end point
function createWebRtcEndPoint (callback) {
    getMediaPipeline( function( error, _pipeline) {
        if (error) {
            return callback(error);
        }
        _pipeline.create('WebRtcEndpoint',  function( error, _webRtcEndpoint ) {
            console.info("Creating createWebRtcEndpoint");
            if (error) {
                return callback(error);
            }
            callback( null, _webRtcEndpoint );
        });
    });
}

// Add a webRTC client
function addClient( ws, id, name, sdp, callback ) {


    createWebRtcEndPoint(function (error, _webRtcEndpoint) {
        if (error) {
            console.log("Error creating WebRtcEndPoint " + error);
            return callback(error);
        }
    if (candidatesQueue[id]) {
        while(candidatesQueue[id].length) {
         var candidate = candidatesQueue[id].shift();
                        _webRtcEndpoint.addIceCandidate(candidate);
            }    
    }
    clients[id] = {
        id: id,
        name: name,
        webRtcEndpoint : null,
        hubPort : null
    }
        clients[id].webRtcEndpoint = _webRtcEndpoint;
            clients[id]. webRtcEndpoint.on('OnIceCandidate', function(event) {
            var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
                        ws.send(JSON.stringify({
                            id : 'iceCandidate',
                            candidate : candidate
                        }));
                    });
	    //console.log("sdp is ",sdp);
            clients[id].webRtcEndpoint.processOffer(sdp, function(error, sdpAnswer) {
                if (error) {
                    stop(id);
                    console.log("Error processing offer " + error);
                    return callback(error);
                }
                callback( null, sdpAnswer);
            });
            clients[id].webRtcEndpoint.gatherCandidates(function(error) {
                        if (error) {
                            return callback(error);
                        }
		});
        createHubPort(function (error, _hubPort) {
            if (error) {
                stop(id);
                console.log("Error creating HubPort " + error);
                return callback(error);
            }
            clients[id].hubPort = _hubPort;
            clients[id].webRtcEndpoint.connect(clients[id].hubPort);
            clients[id].hubPort.connect(clients[id].webRtcEndpoint);
            // Initially, sink is connected to source of same client
            //dispatcher.connect(clients[id].hubPort, clients[id].hubPort);

             wss_http.clients.forEach(function each(client) {
                client.send(JSON.stringify({
                    'id' : 'newSource',
                    'name': name,
                    'sourceId' : id
                }));
             });
        });
    });
}

function switchSource(sourceClientId, sinkClientId) {
    if(clients[sourceClientId] && clients[sinkClientId]) {
        console.log("Switching source 1", sourceClientId);
        console.log("Switching source 2", sinkClientId);

        dispatcher.connect(clients[sourceClientId].hubPort, clients[sinkClientId].hubPort);
    }
}

// Stop and remove a webRTC client
function stop(id) {
    if (clients[id]) {
        if (clients[id].webRtcEndpoint) {
            clients[id].webRtcEndpoint.release();
        }
        if (clients[id].hubPort) {
            clients[id].hubPort.release();
        }
        delete clients[id];
    }
    if (Object.getOwnPropertyNames(clients).length == 0) {
        if (dispatcher) {
            dispatcher.release();
            dispatcher = null;
        }
        if (mediaPipeline) {
            mediaPipeline.release();
            mediaPipeline = null;
        }
    }
   delete candidatesQueue[id];
}

function onIceCandidate(sessionId, _candidate) {
    var candidate = kurento.register.complexTypes.IceCandidate(_candidate);

    if (clients[sessionId]) {
        //console.info('Sending candidate');
        var webRtcEndpoint = clients[sessionId].webRtcEndpoint;
        webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
        //console.info('Queueing candidate');
        if (!candidatesQueue[sessionId]) {
            candidatesQueue[sessionId] = [];
        }
        candidatesQueue[sessionId].push(candidate);
    }
}
