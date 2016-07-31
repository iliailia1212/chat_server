DROP TABLE messages;
CREATE TABLE messages (
    id            SERIAL,
    created         bigint,
    user_id         int,
    rooms_id        int,
    message         text
);
CREATE TABLE users (
    id            SERIAL,
    user_name         text
);
CREATE TABLE rooms (
    id            SERIAL,
    room_name         text
);

INSERT INTO users VALUES (1, 'Пётр');
INSERT INTO rooms VALUES (1, 'Общая');
INSERT INTO rooms(room_name) VALUES ('Знакомство');
INSERT INTO messages(created, user_id, rooms_id, message) VALUES (1468453213777, 1, 1, 'Тестовое сообщение');

SELECT m.created, u.user_name, r.room_name, m.message FROM messages m, users u, rooms r  WHERE m.user_id = u.id AND m.rooms_id = r.id;