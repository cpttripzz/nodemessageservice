var CONF = {
    IO: {HOST: '0.0.0.0', PORT: 8080},
    EXPRESS: {HOST: 'localhost', PORT: 26300}
}


var app = require('express')();
var server = require('http').Server(app);
const redis = require('redis');
const client = redis.createClient();
log('info', 'connected to redis server');
var io = require('socket.io')(8080);
//var io = require('socket.io')(server, {origins:'bandaid:* http://bandaid:* '});
const subscribe = redis.createClient();
app.listen(CONF.EXPRESS.PORT, CONF.EXPRESS.HOST, function () {
    subscribe.subscribe('realtime');
    console.log("Server up and running...");
});

var users = [];
subscribe.on("message", function (channel, message) {

    log('msg', "received from channel #" + channel + " : " + message);

    message = JSON.parse(message);

    for (var userId in message) {
        console.log(findWithAttr(users,'userId',parseInt(userId)), userId);
        if ( findWithAttr(users,'userId',parseInt(userId)) !== false) {
            log('debug', 'sending message to userid' + userId + ' # new messages: ' + message[userId]);
            try {
                io.sockets.in(userId).emit('new_msg', {'new_messages': message[userId]});
            } catch (e) {
                log('error', e.toString());
            }
        }
    }
});

io.on('connection', function (socket) {

    socket.on('join', function (data) {

        if (typeof data !== 'undefined') {
            var data = JSON.parse(data);
            if (findWithAttr(users,'userId',data.id) === false) {
                log('msg', 'user id connected: ' + data.id);
                socket.join(data.id);
                var userObj = { };
                userObj.socketId = socket.id;
                userObj.userId = data.id;
                users.push(userObj);
                log('msg', 'users connected: ' + users.length);
            }
        }

    });

    socket.on('disconnect', function (data) {

        var userIndex = findWithAttr(users,'socketId',socket.id);
        if (userIndex !== false) {
            var deletedUserObj = users[userIndex];
            log('msg', 'user id disconnected: ' + deletedUserObj.userId);
            users.splice(userIndex,1);
            log('msg', 'users connected: ' + users.length);
        }
    });






    client.on('message', function (msg) {
        log('debug', msg);
    });

    client.on('disconnect', function () {
        log('warn', 'disconnecting from redis');
        subscribe.quit();
    });
});

function log(type, msg) {

    var color = '\u001b[0m',
        reset = '\u001b[0m';

    switch (type) {
        case "info":
            color = '\u001b[36m';
            break;
        case "warn":
            color = '\u001b[33m';
            break;
        case "error":
            color = '\u001b[31m';
            break;
        case "msg":
            color = '\u001b[34m';
            break;
        default:
            color = '\u001b[0m'
    }

    console.log(color + '   ' + type + '  - ' + reset + msg);
}

function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return i;
        }
    }
    return false;
}




