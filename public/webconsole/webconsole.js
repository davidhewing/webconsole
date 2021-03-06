var term;
var socket = io(location.origin, {path: '/webconsole/socket.io'})
var buf = '';

function Wetty(argv) {
    this.argv_ = argv;
    this.io = null;
    this.pid_ = -1;
}

Wetty.prototype.run = function() {
    this.io = this.argv_.io.push();

    this.io.onVTKeystroke = this.sendString_.bind(this);
    this.io.sendString = this.sendString_.bind(this);
    this.io.onTerminalResize = this.onTerminalResize.bind(this);
}

Wetty.prototype.sendString_ = function(str) {
    socket.emit('input', str);
};

Wetty.prototype.onTerminalResize = function(col, row) {
    socket.emit('resize', { col: col, row: row });
};

socket.on('connect', function() {
    lib.init(function() {
        hterm.defaultStorage = new lib.Storage.Local();
        term = new hterm.Terminal();
        window.term = term;
        term.decorate(document.getElementById('terminal'));

        term.setCursorPosition(0, 0);
        term.setCursorVisible(true);
        term.prefs_.set('ctrl-c-copy', true);
        term.prefs_.set('ctrl-v-paste', true);
        term.prefs_.set('use-default-window-copy', true);

        term.runCommandClass(Wetty, document.location.hash.substr(1));
        socket.emit('resize', {
            col: term.screenSize.width,
            row: term.screenSize.height
        });

        if (buf && buf != '')
        {
            term.io.writeUTF16(buf);
            buf = '';
        }
    });
});

socket.on('output', function(data) {
    if (!term) {
        buf += data;
        return;
    }
    term.io.writeUTF16(data);
});

socket.on('powerled', function(value) {
	if (value==0)
		document.getElementById("Power").className = "led-greendark";
	else
		document.getElementById("Power").className = "led-green";
});

socket.on('hdled', function(value) {
	console.log("hdled: "+value);
	if (value==0)
		document.getElementById("HD").className = "led-reddark";
	else
		document.getElementById("HD").className = "led-red";
});

function pushpower(howlong) {
	if (confirm("Push Power Button\nAre you sure?")==true)
		socket.emit('pushpower', howlong);
}
function pushreset(howlong) {
	if (confirm("Push Reset Button\nAre you sure?")==true)
		socket.emit('pushreset', howlong);
}


socket.on('disconnect', function() {
    console.log("Socket.io connection closed");
});
