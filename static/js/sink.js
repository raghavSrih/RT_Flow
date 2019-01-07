var ws = new WebSocket('wss://' + location.host + '/one2many');
var video;
var webRtcPeer;
var state = null;
var source = [];
var myId = null;

const I_CAN_START = 1;
window.onload = function() {
	video = document.getElementById('video');
}

window.onbeforeunload = function() {
	ws.close();
}

ws.onmessage = function(message) {
	var parsedMessage = JSON.parse(message.data);
	console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
	case 'response':
		response(parsedMessage);
		break;
	case 'stopCommunication':
        dispose();
		break;
	case 'iceCandidate':
		webRtcPeer.addIceCandidate(parsedMessage.candidate)
		break;
	case 'newSource':
		addNewSource(parsedMessage.sourceId)
		break;
	default:
		console.error('Unrecognized message', parsedMessage);
	}
}

function response(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.info('Call not accepted for the following reason: ' + errorMsg);
        dispose();
	} else {
//        webRtcPeer.processSdpAnswer(message.sdpAnswer);
			setState(I_CAN_START);
	webRtcPeer.processAnswer(message.sdpAnswer);
	}
}

function start() {
	if (!webRtcPeer) {
		showSpinner(video);

		//        webRtcPeer = kurentoUtils.WebRtcPeer.startSendRecv(undefined, video, function(offerSdp) {
		//			var message = {
		//				id : 'client',
		//				sdpOffer : offerSdp
		//			};
		//			sendMessage(message);
		//		});
		var options = {
			localVideo: undefined,
	    	remoteVideo: video,
	    	onicecandidate : onIceCandidate
		}
		webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error) {
				if(error) return onError(error);
				this.generateOffer(onOffer);
				});
					var message = {
						id : 'client',
						sdpOffer : onOffer
					};
			//		sendMessage(message);
	}
}

function setState(nextState) {
	state = nextState;
}
function onIceCandidate(candidate) {
	   console.log('Local candidate' + JSON.stringify(candidate));
	 //  if (state == I_CAN_START){
	   var message = {
	      id : 'onIceCandidate',
	      candidate : candidate
	   };
	   sendMessage(message);
//	}
}

function onOffer(error, offerSdp) {
	if(error) return onError(error);

	console.info('Invoking SDP offer callback function ' + location.host);
	var message = {
		id : 'client',
		sdpOffer : offerSdp
	}
	sendMessage(message);
}
function onError(error) {
	console.error(error);
}
function stop() {
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

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}

function addNewSource(id) {
	if(myId === null) {
		myId = id;
	}
	if( !(source.includes(id))) {
		source.push(id);
		$('#input-group').append('<a id="'+id+'" href="#" class="btn btn-success" onclick="startSource(this.id); return false;"> <span class="glyphicon glyphicon-play"></span> ' +id+ ' </a>');
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
