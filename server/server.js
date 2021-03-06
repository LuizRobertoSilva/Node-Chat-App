const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io')
const {
    generateMessage, generateLocationMessage
} = require('./utils/message');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');

const publicPatch = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
var app = express();
//mudanca feita para fazer um servidor que funcione o socketIO
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();
app.use(express.static(publicPatch));


io.on('connection', (socket) => {
    console.log('New User Connected');

    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback("Name and room name are required");
        }

        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);


        //socket.leave();
        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'))
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined.`))



        //io.emit -> io.to('').emit;   
        //socket.broadcast.emit -> socket.broadcast.to('').emit
        //socket.emit
        //
        callback();
    });

    socket.on('createLocationMessage', (coords) => {
        var user = users.getUser(socket.id);
        if(user){
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
        }
    })

    socket.on('disconnect', () => {
        console.log('User disconnected');
        var user = users.removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
        }
    });

    socket.on('createMessage', (message, callback) => {
        var user = users.getUser(socket.id);
        if (user && isRealString(message.text)) {
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
        }
    });
});

server.listen(port, () => {
    console.log('Server is up on port ' + port);
})