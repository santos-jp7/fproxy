require('dotenv/config');

const net = require('net');
const parser = require('http-string-parser');

const server = net.createServer();

server.on('connection',function(socket){
    const rport = socket.remotePort;
    const raddr = socket.remoteAddress;
    const rfamily = socket.remoteFamily;

    const bridge = new net.Socket();

    let is_connect = false;

    console.log('------------CLIENT REMOTE INFO--------------');
    console.log('REMOTE Socket ip: ' + raddr);
    console.log('REMOTE Socket port ' + rport);
    console.log('REMOTE Socket is IP4/IP6: ' + rfamily);
    console.log('--------------------------------------------');

    socket.on('data',function(data){
        const text = data.toString();
        const sparser = parser.parseRequest(text);

        if(!is_connect) console.log(sparser);

        const bridge_connect = () => {  
             let [host, port] = sparser.uri.split(':');

            bridge.connect(port, host, function(){
                console.log('BRIDGE Connected: ' + raddr);
            });
            
            is_connect = true;
        }

        const http_connect = () => {
            let host;
            let port = 80;

            if(sparser.headers.Host.indexOf(':') != -1) [host, port] = sparser.headers.Host.split(':'); else host = sparser.headers.Host;

           bridge.connect(port, host, function(){
               console.log('BRIDGE Connected: ' + raddr);

               let buffer = bridge.write(data);

               if(!buffer) bridge.pause();
           });
           
           is_connect = true;
       }

        if(is_connect){
            let buffer = bridge.write(data);

            if(!buffer) bridge.pause();

            return;
        }

        if(sparser.method == 'CONNECT'){
            bridge_connect();
            return socket.write(`HTTP/1.1 200 OK\r\n\r\n`);
        }else{
            return http_connect();
        }
    });

    socket.on('drain',function(){
        // console.log('s resume');
        socket.resume();
    });

    socket.on('end',function(data){
        console.log(`REMOTE Socket ended: ${raddr}\n-> ${data}`);

        if(!socket.destroyed) socket.destroy();
        if(!bridge.destroyed) bridge.destroy();
    });

    socket.on('close',function(error){
        console.log(`REMOTE Socket close: ${raddr}`);

        if(!socket.destroyed) socket.destroy();
        if(!bridge.destroyed) bridge.destroy();
    });

    socket.on('error',function(error){
        console.log(`REMOTE Socket error: ${raddr}`);

        if(!socket.destroyed) socket.destroy();
        if(!bridge.destroyed) bridge.destroy();
    });


    bridge.on('data', function(data){
        let buffer = socket.write(data);

        if(!buffer) socket.pause();
    })

    bridge.on('drain',function(){
        // console.log('b resume');
        bridge.resume();
    });

    bridge.on('end',function(data){
        console.log(`BRIDGE Socket ended: ${raddr}\n-> ${data}`);

        if(!socket.destroyed) socket.destroy();
        if(!bridge.destroyed) bridge.destroy();
    });

    bridge.on('close',function(error){
        console.log(`BRIDGE Socket close: ${raddr}`);   

        if(!socket.destroyed) socket.destroy();
        if(!bridge.destroyed) bridge.destroy();
    });

    bridge.on('error',function(error){
        console.log(`BRIDGE Socket error: ${raddr}`);

        if(!socket.destroyed) socket.destroy();
        if(!bridge.destroyed) bridge.destroy();
    });
});

server.on('error',function(error){
    console.log('SERVER Error: ' + error);
});

server.listen(process.env.PORT || 3000, `0.0.0.0`, function(){
    var address = server.address();
    var port = address.port;
    var family = address.family;
    var ipaddr = address.address;

    console.log('------------SERVER REMOTE INFO--------------');
    console.log('SERVER is listening at port: ' + port);
    console.log('SERVER ip: ' + ipaddr);
    console.log('SERVER is IPV4/IPV6: ' + family);
    console.log('--------------------------------------------');
});