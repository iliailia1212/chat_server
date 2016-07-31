var server = require('./server');
var db = require('./db');


server.room_connect(function (user,id) {
    db.get(id,function (data) {
		var chat = {};
		data.forEach(function(e){
			chat[parseInt(e.created)] = e;
		});
        var users = get_users(data.room_name);
        user.send('room',{
            name: data.room_name,
            chat: chat,
            users: users
        },false);
        user.send('update',{users: users},data.room_name);
    });
});
server.del_message(function (user,id) {
   db.del_message(id,user.conn.nick,function (err) {
        if(err) user.send('alert', err);
        else {
            user.send('del_message', id);
            user.send('del_message', id, user.conn.room);
        }
   });
});
server.room_disconnect(function (user,name) {
    user.send('update',{users: get_users(name)},name);
});
server.auth_id(function (user,id) {
    db.user_id(id,function (nick) {
        if(nick != false) user_add(user, nick, id);
        else user.send('auth_err','Ошибка автоматической авторизации!');
    });
});
server.connect(function (user,name) {
    db.user(name,function (id) {
        if(id != false) user_add(user, name, id);
        else user.send('auth_err','Имя пользователя уже занято!');
    });
});
server.message(function(user, data) {
    var text = data.text;
    db.add(user.conn.room, (new Date()).getTime(), user.conn.nick, text,function (err,id) {
        if(err) user.send('alert', id);
        else {
            user.send('message', {name: 'Вы',text: text, time: data.time, id: id});
            user.send('message', {name: user.conn.nick,text: text, time: data.time, id: id}, user.conn.room);
        }
    });
});
server.add_room(function(user, data) {
    console.log('add_room', data);
    db.add_room(data,function (err,text) {
        if(!err) {
            server.room_add_server(data);
            db.rooms(function (list) {
                console.log('new_list_rooms', list);
                user.send('update', {rooms: list},true);
            });
        }
        else user.send('alert', text);
    });
});
function user_add(user, name, id) {
    user.conn.nick = name;
    user.conn.room = 'auth';
    server.rooms['auth'][name] = user.send;
    user.send('auth', {
        rooms: server.get_rooms(),
        users: get_users(),
        nick: name,
        id: id
    },false);
    user.send('update',{users: get_users()},user.room);
}
function get_users(room) {
    var tmp = [];
    if(room) {
        for(var nick in server.rooms[room]){
            if(typeof nick != 'undefined') tmp.push(nick);
        }
    }
    else {
        for(var room in server.rooms){
            for(var nick in server.rooms[room]){
                if(typeof nick != 'undefined') tmp.push(nick);
            }
        }
    }
    return tmp;
}


/**
 *
 * SERVER
 *
 * change socket.io to sockjs (https://github.com/sockjs/sockjs-node)
 *
 * make package.json and define dependencies for this project
 *
 * make to dispatchers
 *
 *  1) sockets connections - messages / rooms / ...
 *  2) request-response dispatcher - render template of index page
 *     template engine - ectjs (http://ectjs.com/)
 *
 *
 * CLIENT
 *
 * use requirejs for all client js
 *
 * use gulp for build sass to css
 *
 *
 * CLIENT + SERVER
 *
 * 1) add client storage for user's nickname
 * after reload of page - user must be loginned automaticaly
 *
 *
 * DB
 *
 * 1) extend messages - add id, created, user_id (join table user), rooms_id (join table rooms), message
 *
 * 2) add table for users
 *
 * 3) add table for rooms
 *
 */