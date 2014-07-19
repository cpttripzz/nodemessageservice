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
const redisSubscriberClient = redis.createClient();
const redisClient = redis.createClient();
app.listen(CONF.EXPRESS.PORT, CONF.EXPRESS.HOST, function () {
    redisSubscriberClient.subscribe('realtime');
    console.log("Server up and running...");
});

var users = [];
redisSubscriberClient.on("message", function (channel, message) {

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
            if (findWithAttr(users,'userId',userId) === false) {
                var userId = data.id;
                log('msg', 'user id connected: ' + userId);
                socket.join(userId);
                var userObj = { };
                userObj.socketId = socket.id;
                userObj.userId = userId;
                users.push(userObj);
                log('msg', 'users connected: ' + users.length);
                try {
                    var newMsgs;
                    redisClient.get('new_messages:'+  userId,  function (err, reply) {
                        newMsgs = reply;
                        io.sockets.in(userId).emit('connect_success', {'new_messages': newMsgs});
                    });


                } catch (e) {
                    log('error', e.toString());
                }
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
        redisSubscriberClient.quit();
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




