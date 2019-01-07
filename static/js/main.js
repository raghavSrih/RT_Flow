$(document).ready(function() {
    var webRtcPeer;
    var ws = new WebSocket('ws://' + location.host + '/one2many');

    window.onbeforeunload = function() {
        ws.close();
    }

    ws.onmessage = function(message) {
        var parsedMessage = JSON.parse(message.data);
        console.info('Received message: ' + message.data);

        switch (parsedMessage.id) {
        case 'response':
            {
                if (parsedMessage.response != 'accepted') {
                var errorMsg = parsedMessage.message ? parsedMessage.message : 'Unknow error';
                console.warn('Call not accepted for the following reason: ' + errorMsg);
                dispose();
                } else {
                    sendDeviceSDP(parsedMessage.sdpAnswer)
                }
            }
            break;
        case 'newSource':
            addNewSource(parsedMessage.sourceId)
            break;
        case 'stopCommunication':
            dispose();
            break;
        case 'iceCandidate':
            sendDeviceCandidate(parsedMessage.candidate)
            break;
        default:
            console.error('Unrecognized message', parsedMessage);
        }
    }

    function dispose() {
        if (webRtcPeer) {
            webRtcPeer.dispose();
            webRtcPeer = null;
        }
        hideSpinner(video);
    }

    function sendMessage(message) {
        var jsonMessage = JSON.stringify(message);
        console.log('Senging message: ' + jsonMessage);
        ws.send(jsonMessage);
    }

    var client = null;
    var remotePeer = null; 
    var remotePeerList = {};

    // Symple client options
    CLIENT_OPTIONS = {
        url: 'http://localhost:4500',
        // secure: true,
        peer: {
            user: 'app',
            name: 'Browser_Client',
            rooms: ['2asd']
        }
    }

    // Get a list of streaming devices from the peer
    var refreshStreamingDevices = function(peer) {
        client.sendCommand({
            node: 'streaming:devices',
            to: peer
        });
    };

    var addNewPeer = function(peer) {
        
        remotePeerList[peer.id] = peer;
        remotePeerList[peer.id]["status"] = "";
    };

    $( "#call" ).click(function() {
        startAllStreaming();
    });

    $( "#terminate" ).click(function() {
        stopAllStreaming();
    });  


    // Start streaming video from the peers
    var startAllStreaming = function() {
        $.each(remotePeerList, function(id, item) {
            remotePeerList[id]["status"] = "streaming";
            remoteStreamingDevice = remotePeerList[id].devices[0];
            client.sendCommand({
                node: 'streaming:start',
                to: remotePeerList[id],
                data: {
                    device: remotePeerList[id].devices[0]
                }
            });
        });        
    };

    // Stop streaming video from the peer
    var stopAllStreaming = function() {
        $.each(remotePeerList, function(id, item) {
            remotePeerList[id]["status"] = "";
            remoteStreamingDevice = null;
            client.sendCommand({
                node: 'streaming:stop',
                to: remotePeerList[id],
                data: {
                    device: remotePeerList[id].devices[0]
                }
            });
        });
    };

    var sendDeviceSDP = function(desc) {
        console.log('Send answer:', desc)
        client.send({
            to: remotePeer,
            name: 'ice:sdp',
            type: 'event',
            sdp: {'sdp': desc, 'type' : 'answer'}
        });
    }

    var sendDeviceCandidate = function(cand) {
        client.send({
            to: remotePeer,
            name: 'ice:candidate',
            type: 'event',
            candidate: cand
        });
    }

            //
    // Symple client

    client = new Symple.Client(CLIENT_OPTIONS);

    client.on('announce', function(peer) {
        console.log('Authentication success:', peer);
    });

    client.on('presence', function(p) {
        console.log('Recv presence:', p);

        // Handle presence packets from peers
    });

    client.on('message', function(m) {
        console.log('Recv message:', m);

        // Handle messages from peers
    });

    client.on('command', function(c) {
        console.log('Recv command:', c)
        remotePeer = c.from;
        if (remotePeer && remotePeer.id != c.from.id) {
            console.log('Dropping message from unknown peer', m);
            return;
        }

        if (c.node == 'streaming:start') {
            if (c.status == 200) {
                // Streaming start success response
                // TODO: Update button state?
                // createPlayer();
            }
            else {
                // Command error
            }
        }

        else if (c.node == 'streaming:devices') {
            if (c.status == 200) {
                remotePeerList[c.from.id]["devices"] = c.data.devices;
            }
            else {
                // Command error
            }
        }

        else if (c.node == 'streaming:files') {
            // TODO: file streaming
        }
    });

    client.on('event', function(e) {
        console.log('Recv event:', e)
        remotePeer = e.from;
        // Just handle events from he current streaming peer
        // for the porpose of this demo
        //if (remotePeer && remotePeer.id != e.from.id) {
        //    console.log('Dropping message from unknown peer', m);
        //    return;
        //}

        // ICE SDP
        if (e.name == 'ice:sdp') {
            try {
                console.log('Reieve offer:', e.sdp);

                remotePeer = e.from;
                
                //player.engine.recvRemoteSDP(e.sdp);
                var message = {
                    id : 'client',
                    uid: e.from.id,
                    name: e.from.name,
                    sdpOffer : e.sdp.sdp
                };
                sendMessage(message);
            }
            catch (e) {
                console.log("Failed to create PeerConnection:", e);
            }
        }

        // ICE Candidate
        else if (e.name == 'ice:candidate') {
            console.log('Local candidate' + JSON.stringify(e.candidate));

            var message = {
                id : 'onIceCandidate',
                uid: e.from.id,
                candidate : e.candidate
            }
            sendMessage(message);			
        }

        else {
            alert('Unknown event: ' + e.name);
        }
    });

    client.on('event', function(e) {
        console.log('Recv event:', e)
    });

    client.on('disconnect', function() {
        console.log('Disconnected from server')
    });

    client.on('error', function(error, message) {
        console.log('Peer error:', error, message)
    });

    client.on('addPeer', function(peer) {
        console.log('Adding peer:', peer)
        if(peer.name === "Browser_Client")
            return;
        addNewPeer(peer);

        // Get a list of streaming devices as soon as the peer connects
        if (peer.type == 'demo') {
            refreshStreamingDevices(peer);
        }
    });

    client.on('removePeer', function(peer) {
        console.log('Removing peer:', peer)
        $('[data-user="' + peer.user + '"]').remove();
        if (remotePeer && remotePeer.id == peer.id) {
            remotePeer = null;
        }
    });

    client.connect();

});