'use strict';

const http = require('http');
const WebSocket = require('ws');
const LifeGame = require('../lib/LifeGameVirtualDom');
const url = require('url');

const server = http.createServer();

let users = [];
const wss = new WebSocket.Server({
    server
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

LifeGame.prototype.sendUpdates = function (data) {
    const sData = {
        type: 'UPDATE_STATE',
        data: game.state
    }
    wss.broadcast(JSON.stringify(sData));
};

let game = new LifeGame();

wss.on('connection', function connection(ws, req) {
    init(ws, req, game);

    ws.on('message', function (msg) {
        try{
            const rData = JSON.parse(msg)
            if (rData.type == 'ADD_POINT') {
                game.applyUpdates(rData.data);
            }
        }
        catch(err) {
            console.log(`Life is not a game, son :${err}`);
        }
    });

    ws.on('error', function () {
        console.log('Oops, There is no life anymore.')
    });

    ws.on('close', function (code, reason) {
        if(!ws.token) console.log('Connection closed');
        removeUser(ws.token)
        console.log(`User ${ws.token} has left`);
    })


});

server.listen(8080, function listening() {
    console.log('Listening on %d', server.address().port);
});

function init(ws, req, game) {
    const clientToken = url.parse(req.url, true).query;
    let newUser = null;
    if (clientToken && clientToken.token) {
        ws.token = clientToken.token;
        newUser = addUser(clientToken.token);
    }
    if (!newUser) return ws.send('auth failed');

    ws.send(JSON.stringify({
        type: 'INITIALIZE',
        data: {
            state: game.state,
            settings: game.settings,
            user: newUser
        }
    }));
}

function getRandomColor(attempts = 5) {
    let i = 0;
    while (i++ < attempts) {
        const newColor = '#' + (Math.random() * 0xFFF << 0).toString(16);
        if (checkUserColor(newColor)) return newColor;
    }
    return false;
}

function checkUserColor(color) {
    const dup = users.find((user) => user.color == color);
    return dup == undefined;
}

function addUser(name) {
    if (!checkUserName(name)) return false;
    const color = getRandomColor();
    if (!color) return false;

    const newUser = {
        token: name,
        color
    }
    users.push(newUser);
    return newUser;
}

function removeUser(name) {
    const ind = users.findIndex((user) => user.token == name);
    if (ind || ind == 0) users.splice(ind, 1);
}

function checkUserName(name) {
    const dup = users.find((user) => user.token == name);
    return dup == undefined;
}