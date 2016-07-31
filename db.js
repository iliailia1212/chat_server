var promise = require('bluebird');
var pgp = require('pg-promise')({promiseLib: promise});
var cfg = require('./config');
var db = pgp(cfg.db);
db.connect();

var max = 10;

var rooms = function (callback) {
    db.many('SELECT * FROM rooms').then(function (data) {
        var tmp = {};
        data.forEach(function (room) {
            tmp[room.room_name] = parseInt(room.id);
        });
        callback(tmp);
    }).catch(err);
}
var user_get_id = function (name, callback) {
    db.one("SELECT id FROM users WHERE user_name = '${name#}'", {name: name}).then(function (data) {
        callback(parseInt(data.id));
    }).catch(function () {
        callback(false);
    });
}
var user_id = function (id, callback) {
    db.one('SELECT user_name FROM users WHERE id = ${id}', {id: parseInt(id)}).then(function (data) {
        callback(data.user_name);
    }).catch(function (e) {
        console.error(e);
        callback(false);
    });
}
var user = function (name, callback) {
    db.none("SELECT id FROM users WHERE user_name = '${name#}'", {name: name}).then(function () {
         db.one("INSERT INTO users(user_name) VALUES ('${name#}') RETURNING  id;",{name: name}).then(function (data) {
             callback(data.id);
         }).catch(function (e) {
             console.error(e);
             callback(false);
         });
    }).catch(function (e) {
        callback(false);
    });
}
var add_room = function (room_name,callback) {
    db.none('SELECT id FROM rooms WHERE room_name = ${room_name}', {room_name: room_name}).then(function () {
        db.none("INSERT INTO rooms (room_name) VALUES (${room_name});",{
            room_name: room_name
        }).then(function () {
            callback(false, 'Комната успешно добавленна');
        }).catch(function (e) {
            console.error(e);
            callback(true, 'Ошибка при добавлении комнаты!');
        });
    }).catch(function () {
        callback(true, 'Имя комнаты занято!');
    });
}
var del_message = function (id,nick,callback) {
    db.one('SELECT u.user_name FROM messages m, users u WHERE m.user_id = u.id AND m.id = ${id}', {id: id}).then(function (data) {
        if(nick == data.user_name){
            db.any('DELETE FROM messages WHERE id = ${id};',{id: id});
            callback(false);
        }
        else callback('Это сообщение не ваше!');
    }).catch(function (e) {
        callback('Сообщения не существет!');
        console.error(e);
    });
}
var add = function (room_id,time,name,text,callback) {
    db.manyOrNone('SELECT id FROM messages WHERE rooms_id = ${room_id#}', {room_id: room_id}).then(function (data) {
        console.log('manyOrNone',data.length, data);
        if(data.length > max){
            db.any('DELETE FROM messages WHERE id = ${id};',{id: data[0].id});
        }
    }).catch(err);
    user_get_id(name, function (user_id) {
        console.log('name to id', name, user_id);
        db.one("INSERT INTO messages (created, rooms_id, user_id, message) VALUES (${time}, ${room_id}, ${user_id}, '${message#}') RETURNING  id;",{
            time: time,
            room_id: room_id,
            user_id: user_id,
            message: text
        }).then(function (data) {
            callback(false,data.id);
        }).catch(function (e) {
            callback(true,'Ошибка добавления сообщения');
            console.error(e);
        });
    });
    return true;
}
var get = function (room,callback) {
    //db.any('SELECT * FROM messages WHERE room = ${room}',{room: room}).then(function (data) {
    db.any("SELECT m.id, m.created, u.user_name, r.room_name, m.message FROM messages m, users u, rooms r WHERE m.user_id = u.id AND m.rooms_id = r.id AND m.rooms_id = ${room#} ORDER BY m.created",{room: room}).then(function (data) {
        callback(data);
    }).catch(err);
}

module.exports = {
    rooms: rooms,
    add: add,
    get: get,
    user: user,
    user_id: user_id,
    add_room: add_room,
    del_message: del_message
}
function err(e) {
    console.error(e);
}
