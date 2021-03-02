// Use the websocket-relay to serve a raw MPEG-TS over WebSockets. You can use
// ffmpeg to feed the relay. ffmpeg -> websocket-relay -> browser
// Example:
// node relay 8081 8082
// ffmpeg -i <some input> -f mpegts http://localhost:8081/streamName

var http = require('http'),
    WebSocket = require('ws');

var STREAM_PORT = process.argv[2] || 8081,
	WEBSOCKET_PORT = process.argv[3] || 8082;

// Websocket Server
var socketServer = new WebSocket.Server({ port: WEBSOCKET_PORT, perMessageDeflate: false });

socketServer.on('connection', function (socket, request) {
    var streamName = request.url.substr(1).split('/')[0];

    socket.stream = streamName;

	console.log(
		'New WebSocket connection for: ',
		streamName
    );
});

socketServer.broadcast = function(data, streamName) {
	socketServer.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN && client.stream === streamName) {
			client.send(data);
		}
	});
};

// HTTP Server to accept incoming MPEG-TS Stream from ffmpeg
var streamServer = http.createServer( function(request, response) {
    var streamName = request.url.substr(1).split('/')[0];

	response.connection.setTimeout(0);
	console.log(
		'Stream Connected: ',
		streamName
	);
	request.on('data', function(data){
		socketServer.broadcast(data, streamName);
	});
})

// Keep the socket open for streaming
streamServer.headersTimeout = 0;
streamServer.listen(STREAM_PORT);

console.log('Listening for incoming MPEG-TS Stream on http://127.0.0.1:'+STREAM_PORT+'/<streamName>');
console.log('Awaiting WebSocket connections on ws://127.0.0.1:'+WEBSOCKET_PORT+'/');