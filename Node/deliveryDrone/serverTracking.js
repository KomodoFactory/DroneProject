var express = require('express')
    , app = express()
    , server = require('http').createServer(app)

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/indexpng.html');
});

server.listen(8080);

require("dronestream").listen(server);

var io = require('socket.io').listen(server)

io.set('destroy upgrade', false)

io.sockets.on('connection', function (socket) {
    console.log('connection')

    socket.on('control', function (ev) {
        console.log('taking direct control');
        console.log('[control]', JSON.stringify(ev));
        if (ev.action == 'animate') {
            client.animate(ev.animation, ev.duration)
        } else {
            client[ev.action].call(client, ev.speed);
        }
    })

    socket.on('takeoff', function (data) {
        console.log('takeoff', data)
        client.takeoff()
    })
    socket.on('land', function (data) {
        console.log('land', data)
        client.stop()
        client.land()
    })
    socket.on('reset', function (data) {
        console.log('reset', data)
        client.disableEmergency()
    })
    socket.on('go', function (data) {
        targetLat = data.lat
        targetLon = data.lon
    })

    setInterval(function () {
        io.sockets.emit('navData', {
            lat: currentLat,
            lon: currentLon,
            yaw: currentYaw,
            battery: battery
        })
    }, 1000)
});

var arDrone = require('ar-drone');
var PID = require('./PID');
var vincenty = require('node-vincenty');

var yawPID = new PID(1.0, 0, 0.30);
var client = arDrone.createClient();

client.config('general:navdata_demo', 'FALSE');

var targetLat, targetLon, targetYaw, cyaw, currentLat, currentLon, currentDistance, currentYaw, phoneAccuracy;
var battery = 0;

var stop = function () {
    console.log('stop')
    targetYaw = null
    targetLat = null
    targetLon = null
    client.stop()
}

var handleNavData = function (data) {
    if (data.demo == null || data.gps == null){
		return;
	}
    battery = data.demo.batteryPercentage
    currentLat = data.gps.latitude
    currentLon = data.gps.longitude
    currentYaw = data.demo.rotation.yaw;

    if (targetLat == null || targetLon == null || currentYaw == null || currentLat == null || currentLon == null){
		return;
		}

    var bearing = vincenty.distVincenty(currentLat, currentLon, targetLat, targetLon)

    if (bearing.distance > 1) {
        currentDistance = bearing.distance
        targetYaw = bearing.initialBearing

        var eyaw = targetYaw - currentYaw;
        var uyaw = yawPID.getCommand(eyaw);
        var cyaw = within(uyaw, -1, 1);
        /*
         console.log('distance', bearing.distance)
         console.log('bearing:', bearing.initialBearing)
         console.log('currentYaw:', currentYaw);

         console.log('eyaw:', eyaw);
         console.log('uyaw:', uyaw);
         console.log('cyaw:', cyaw);
         */




        client.clockwise(0.2)
        if (cyaw < 0.4 && cyaw > -0.4) {
            console.log("This never happens")
            client.front(0.8)
        }
    } else {
        targetYaw = null
        io.sockets.emit('waypointReached', {lat: targetLat, lon: targetLon})
        console.log('Reached ', targetLat, targetLon)
        stop()
    }
}

client.on('navdata', handleNavData);

function within(x, min, max) {
    if (x < min) {
        return min;
    } else if (x > max) {
        return max;
    } else {
        return x;
    }
}