var http = require('http');
var db = require('./db');
var sockjs = require('sockjs');
var multiplex_server = require('websocket-multiplex');
var EventEmitter = require('events');

var srvEmit = new EventEmitter.EventEmitter();
var service = sockjs.createServer({ sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1/sockjs.min.js' });
var multiplexer = new multiplex_server.MultiplexServer(service);


var rooms = {auth: {}};
var rooms_list = [];

db.rooms(function (list) {
    rooms_list = list;
    for(name in rooms_list){
        add_room(name);
    };
});
multiplexer.registerChannel('auth').on('connection', function (socket) {
    socket.send = function (type, data, all) {
        if(all === true){
            for(var room_tmp in rooms) {
                for(var name in rooms[room_tmp]) {
                    if(name != socket.conn.nick) rooms[room_tmp][name](type, data, false);
                }
            }
        }
        socket.write(JSON.stringify({type: type, data: data}));
    }
    socket.on('data', function(data) {
        data = JSON.parse(data);
        if(data.type == 'auth') srvEmit.emit('connect',socket,data.data);
        else if(data.type == 'auth_id') srvEmit.emit('auth_id',socket,data.data);
        else if(data.type == 'add_room') srvEmit.emit('add_room',socket,data.data);
        else console.log('Ошибка типа', data);
    });
    socket.on('close', function(){
        delete rooms['auth'][socket.conn.nick];
        //console.log('discoonect',socket.conn._session.connection.id);
    });
});


module.exports = {
    rooms: rooms,
    get_rooms: function () {return rooms_list},
    connect: function (callback) {srvEmit.on('connect',callback);},
    auth_id: function (callback) {srvEmit.on('auth_id',callback);},
    message: function (callback) {srvEmit.on('message',callback);},
    add_room: function (callback) {srvEmit.on('add_room',callback);},
    room_connect: function (callback) {srvEmit.on('room_connect',callback);},
    room_disconnect: function (callback) {srvEmit.on('room_disconnect',callback);},
    del_message: function (callback) {srvEmit.on('del_message',callback);},
    room_add_server: function (name) {add_room(name);}
};

var server = http.createServer();
service.installHandlers(server, {prefix:'/chat'});
server.listen(377, '192.168.1.116');

console.log('server');


function add_room(name) {
    var room_name_real = name;
    var room_name = rooms_list[name];
    console.log(room_name);
    rooms[room_name] = {};
    multiplexer.registerChannel(room_name).on('connection', function (socket) {
        socket.send = function (type, data, room) {
            if(room) {
                for(var name in rooms[room]) if(name != socket.conn.nick) rooms[room][name](type, data, false);
            }
            else socket.write(JSON.stringify({type: type, data: data}));
        }
        socket.on('data', function(data) {
            data = JSON.parse(data);
            console.log('!',data.type, room_name, data.data);
            if(data.type == 'message') srvEmit.emit('message', socket, data.data);
            else if(data.type == 'del_message') srvEmit.emit('del_message', socket, data.data);
            else if(data.type == 'connect') {
                console.log('coonnect', room_name);
                delete rooms['auth'][socket.conn.nick];
                socket.conn.room = room_name;
                rooms[room_name][socket.conn.nick] = socket.send;
                srvEmit.emit('room_connect', socket, data.data);
            }
            else if(data.type == 'disconnect') {
                delete rooms[room_name][socket.conn.nick];
                srvEmit.emit('room_disconnect', socket, room_name);
            }
            else console.log('Ошибка типа: ', data);
        });
        socket.on('close', function(){
            delete rooms[room_name][socket.conn.nick];
        });
    });
}
/*
 service.on('connection', function (socket) {
 console.log('service connect',socket._session.connection.id);
 socket.on('close', function(){
 console.log('service discoonect',socket._session.connection.id);
 });
 });
 */