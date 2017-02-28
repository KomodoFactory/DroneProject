var arDrone = require('ar-drone');
var http = require('http');
var client = arDrone.createClient();
var BOTTOM = 3;
var FRONT = 0;

console.log('Connecting png stream...');

client.config('video:video_channel', FRONT);

var pngStream = client.get.getPngStream();

var lastPng;
pngStream.on('error', console.log).on('data', function(pngBuffer){
	lastPng = pngBuffer;
	console.log(pngBuffer[100]);
});

var server = http.createServer(function(req, res){
	if(!lastPng){
		res.writeHead(503);
		res.end('Did not receive any png data yet.');
		return;
	}
	
	res.writeHead(200, {'Content-Type': 'image/png'});
	res.end(lastPng);
});

server.listen(8080,function(){
	console.log('Serving latest png on port 8080...');
});

