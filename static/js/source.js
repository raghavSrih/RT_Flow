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
$(document).ready(function() {
    var ws = new WebSocket('ws://' + location.host + '/one2many');
    var video;
    var webRtcPeer;
    var myId = null;
    var source = [];
    

    //document.getElementById('call').addEventListener('click', function() { presenter(); } );
    //document.getElementById('terminate').addEventListener('click', function() { stop(); } );
    $('#start').click(function() { start(); } );
    $('#terminate').click(function() { stop(); } );

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

    function presenter() {
        startStreaming(streamingDevices[0].user, streamingDevices[0].device);
    }

    function stop() {
        stopStreaming(streamingDevices[0].user, streamingDevices[0].device);
        var message = {
                id : 'stop'
        }
        sendMessage(message);
        dispose();
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
    

    /**
     * Lightbox utility (to display media pipeline image in a modal dialog)
     */
    $(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
        event.preventDefault();
        $(this).ekkoLightbox();
    });


        var client = null;
        var remotePeer = null; 
        var remotePeerList = {};

        // Symple client options
        CLIENT_OPTIONS = {
            url: 'http://192.168.2.209:4500',
            // secure: true,
            peer: {
                user: 'app',
                name: 'Browser_Client',
                rooms: ['2asd']
            }
        }


        //
        //= Commands

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

            var appendString = 
            '<div class="row"> \
                <label class="control-label" for="console">Camera : '+ peer.name +'</label><br><br> \
                <div class="col-md-12"> \
                    <a id="'+ peer.id +'" href="#" class="btn btn-success">Camera : '+ peer.name +' is ready</a> \
                </div> \
            </div> \
            <br/> ';

            $('#col-md-peer').append(appendString);
            //$('#'+peer.id+'').click(function() { onClickSource(this.id); } );

            if(Object.keys(remotePeerList).length === 2) {
                var appendString2 = 
                    '<div class="row"> \
                        <label class="control-label" for="console">============================</label><br><br> \
                        <div class="col-md-12"> \
                            <a id="ssc" href="#" class="btn btn-success">Start Social Cooking</a> \
                        </div> \
                        <label class="control-label" for="console">============================</label><br><br> \
                        <div class="col-md-12"> \
                            <a id="stopsc" href="#" class="btn btn-success">Stop Social Cooking</a> \
                        </div> \
                        <label class="control-label" for="console">============================</label><br><br> \
                    </div> \
                    <br/> ';

            $('#col-md-peer').append(appendString2);
            $('#ssc').click(function() { startSocialCooking(); } );
            $('#stopsc').click(function() { stopSocialCooking(); } );
            }
        };

        var stopSocialCooking = function() {
            var temp = [];
            for (var key in remotePeerList) {
                if (remotePeerList.hasOwnProperty(key)) {
                    temp.push(key);
                }
            }
            stopStreaming(temp[0]);
            stopStreaming(temp[1]);
        }

        var startSocialCooking = function() {
            var temp = [];
            for (var key in remotePeerList) {
                if (remotePeerList.hasOwnProperty(key)) {
                    temp.push(key);
                }
            }
            startStreaming(temp[0]);
            //startStreaming(temp[1]);
            setTimeout(function () {
                startStreaming(temp[1]);
            }, 4000);
        }

        var onClickSource = function(id) {
            if(remotePeerList[id].status === "streaming"){
                $('#'+id+'').text("Start Streaming");
                stopStreaming(id);
            }
            else {
                $('#'+id+'').text("Stop Streaming");
                startStreaming(id);
            }
        };

        // Start streaming video from the peers
        var startStreaming = function(id) {
            remotePeerList[id]["status"] = "streaming";
            remoteStreamingDevice = remotePeerList[id].devices[0];
            client.sendCommand({
                node: 'streaming:start',
                to: remotePeerList[id],
                data: {
                    device: remotePeerList[id].devices[0]
                }
            });
        };

        // Stop streaming video from the peer
        var stopStreaming = function(id) {
            remotePeerList[id]["status"] = "";
            remoteStreamingDevice = null;
            client.sendCommand({
                node: 'streaming:stop',
                to: remotePeerList[id],
                data: {
                    device: remotePeerList[id].devices[0]
                }
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

        function addNewSource(id) {
            if(myId === null) {
                myId = id;
            }
            if( !(source.indexOf(id) > -1)) {
                source.push(id);
                $('#input-group').append('<a id="'+id+'" href="#" class="btn btn-success" onclick="startSource(this.id); return false;"> <span class="glyphicon glyphicon-play"></span> ' +id+ ' </a>');
            }
            if(source.length == 2) {
                setTimeout(function () {
                    startSocialCooking();
                }, 5000);
                
            }
        }
        
        function startSource(id) {
            var message = {
                'id' : 'switchSource',
                'sourceId' : id,
                'sinkId' : myId,
             };
             sendMessage(message);
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

