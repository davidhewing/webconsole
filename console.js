#!/usr/bin/nodejs


var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var server = require('socket.io');
var pty = require('pty.js');
var fs = require('fs');
var auth = require('http-auth');
var basic = auth.basic({
    realm: "Console Access",
    file: __dirname + "/users.htpasswd"
});

var GPIO = require('onoff').Gpio;

//  gpio4 - Power LED
//  //  gpio5 - HD Activity LED
//  //  gpio6 - Power Button
//  //  gpio13 -Reset Button
//
const POWERSWITCH=6;
const RESETSWITCH=13;
const POWERLED=4;
const HDLED=5;
//
var powerswitch = new GPIO(POWERSWITCH,'out');
var resetswitch = new GPIO(RESETSWITCH,'out');
var powerled = new GPIO(POWERLED,'in','both');
var hdled = new GPIO(HDLED,'in','both');
var powerstate,hdstate;
//

powerswitch.writeSync(0); 
resetswitch.writeSync(0); 

powerstate=powerled.readSync();
hdstate=hdled.readSync();


var opts = require('optimist')
    .options({
        sslkey: {
            demand: false,
            description: 'path to SSL key'
        },
        sslcert: {
            demand: false,
            description: 'path to SSL certificate'
        },
        sshhost: {
            demand: false,
            description: 'ssh server host'
        },
        sshport: {
            demand: false,
            description: 'ssh server port'
        },
        sshuser: {
            demand: false,
            description: 'ssh user'
        },
        sshauth: {
            demand: false,
            description: 'defaults to "password", you can use "publickey,password" instead'
        },
	loginexec: {
	    demand: false,
	    description: 'defaults to login'
	},
	loginargs: {
	    demand: false,
	    description: 'defaults to blank'
	},
        port: {
            demand: true,
            alias: 'p',
            description: 'webconsole listen port'
        },
    }).boolean('allow_discovery').argv;

var runhttps = false;
var sshport = 22;
var sshhost = 'localhost';
var sshauth = 'password,keyboard-interactive';
var loginexec = 'login';
var loginargs = '';
var globalsshuser = '';

if (opts.sshport) {
    sshport = opts.sshport;
}

if (opts.sshhost) {
    sshhost = opts.sshhost;
}

if (opts.sshauth) {
	sshauth = opts.sshauth
}

if (opts.sshuser) {
    globalsshuser = opts.sshuser;
}

if (opts.sslkey && opts.sslcert) {
    runhttps = true;
    opts['ssl'] = {};
    opts.ssl['key'] = fs.readFileSync(path.resolve(opts.sslkey));
    opts.ssl['cert'] = fs.readFileSync(path.resolve(opts.sslcert));
}

if (opts.loginexec) {
	loginexec = opts.loginexec;
}
if (opts.loginargs) {
	loginargs = opts.loginargs;
}


process.on('uncaughtException', function(e) {
    console.error('Error: ' + e);
});

var httpserv;


var app = express();
app.get('/webconsole/ssh/:user', function(req, res) {
    res.sendfile(__dirname + '/public/webconsole/index.html');
});
app.use(auth.connect(basic));
app.use('/', express.static(path.join(__dirname, 'public')));

if (runhttps) {
    httpserv = https.createServer(opts.ssl, app).listen(opts.port, function() {
        console.log('https on port ' + opts.port);
    });
} else {
    httpserv = http.createServer(app).listen(opts.port, function() {
        console.log('http on port ' + opts.port);
    });
}

var io = server(httpserv,{path: '/webconsole/socket.io'});
io.on('connection', function(socket){
    var sshuser = '';
    var request = socket.request;
    console.log((new Date()) + ' Connection accepted.');
    if (match = request.headers.referer.match('/webconsole/ssh/.+$')) {
        sshuser = match[0].replace('/webconsole/ssh/', '') + '@';
    } else if (globalsshuser) {
        sshuser = globalsshuser + '@';
    }

    var term;
    if (process.getuid() == 0) {
        term = pty.spawn('/usr/bin/env', [ loginexec , loginargs ], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30
        });
    } else {
        term = pty.spawn('ssh', [sshuser + sshhost, '-p', sshport, '-o', 'PreferredAuthentications=' + sshauth], {
            name: 'xterm-256color',
            cols: 80,
            rows: 30
        });
    }
    console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + sshuser)
    socket.emit('powerled',powerstate);
    socket.emit('hdled',hdstate);

    powerled.watch(function(err,value) { socket.emit('powerled',value); powerstate=value;});
    hdled.watch(function(err,value) { socket.emit('hdled',value); hdstate=value;});

    term.on('data', function(data) {
        socket.emit('output', data);
    });
    term.on('exit', function(code) {
        console.log((new Date()) + " PID=" + term.pid + " ENDED")
    });
    socket.on('resize', function(data) {
        term.resize(data.col, data.row);
    });
    socket.on('input', function(data) {
        term.write(data);
    });
    socket.on('disconnect', function() {
        term.end();
    });
    socket.on('pushpower', function(howlong) {
	powerswitch.writeSync(1); 
	console.log("Pressing the power switch");
	setTimeout(function() { powerswitch.writeSync(0); console.log("Released Power Switch"); }, howlong);
    });
    socket.on('pushreset', function(howlong) {
	resetswitch.writeSync(1); 
	console.log("Pressing the reset switch");
	setTimeout(function() { resetswitch.writeSync(0);  console.log("Released Reset Switch");}, howlong);
    });
	
})
