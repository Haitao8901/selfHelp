//@ sourceURL=websocket_src.js
$(function(){
    if(typeof WebSocket == "undefined"){
        console.log("Browser not support WebSocket.");
        shStore.popupTool.showErrorWin('浏览器不支持Websocket，请升级浏览器！')
        loadTargetPage("welcome");
        return;
    }

    shStore.visitWS = init();
    function init(){
        closeCurrentWebSocket();
        var socket = new WebSocket(shStore.consts.websocketUrl);
        socket.readCardMessage = 'READIDCARDWITHPHOTO|#|portNo|#|iBaud|#|timeout';
        socket.currentAction = 'OPEN';
        socket.deviceOpened = false;

        socket.onopen = onOpen.bind(socket);
        socket.onmessage = onWSMessage.bind(socket);
        socket.onclose = onClose.bind(socket);
        socket.onerror = onError.bind(socket);
        socket.sendReadCardMessage = sendReadCardMessage.bind(socket);
        socket.sendMessage = sendwsMessage.bind(socket);
        socket.sendOpenDeviceMessage = sendOpenDeviceMessage.bind(socket);

        return socket;
    }

    function onWSMessage(event){
        var str = '' + event.data;
        // console.log('Current WS action is ' + this.currentAction + ' Received message is: ' + str);

        if(!/(\|#\|)+/ig.test(str)){
            console.log('Not formatted message, ignore it.');
            return;
        }

        var fields = str.split("|#|");
        var code = fields[0];

        if(this.currentAction == "OPEN"){
            if(this.deviceOpened){
                console.log('Device already opened, ignore this message.');
                return;
            }

            if(code == '0'){
                console.log('OPEN ACTION SUCCESS.');
                this.deviceOpened = true;
                shStore.dispatchEvent('OPENDEVICE', str);
                return;
            }
            this.sendOpenDeviceMessage();
            return;
        }

        if(this.currentAction == "READIDCARDWITHPHOTO"){
            if(code == '0'){
                shStore.dispatchEvent('CARDINFOREADY', str);
            }
        }
    }

    function sendwsMessage(msg){
        shStore.visitWS.send(msg);
    }

    function sendOpenDeviceMessage(){
        this.currentAction = 'OPEN';
        shStore.visitWS.send('open|#|6|#|1001|#|');
        // this.deviceOpened = true;
        // shStore.dispatchEvent('OPENDEVICE');

    }

    function sendReadCardMessage(){
        this.currentAction = 'READIDCARDWITHPHOTO';
        // var devicePort = shStore.devicePort,
        var devicePort = 0,
            iBaud = 0,
            timeout = '' + shStore.consts.wetsocketTimeout;
        var msg = this.readCardMessage.replace('portNo', devicePort).replace('iBaud',iBaud).replace('timeout', timeout);
        shStore.visitWS.send(msg);
    }

    function onOpen(){
        console.log('websocket connected, url is ' + shStore.consts.websocketUrl);
        sendOpenDeviceMessage();
    }

    function onClose(){
        console.log('websocket closed.');
        shStore.dispatchEvent('WSCLOSED');
        this.deviceOpened = true;
    }

    function onError(error){
        console.log('websocket Error happened. Error is ' + error);
    }

    function reConnect(){
    }

    function closeCurrentWebSocket(){
        if(shStore.visitWS){
            try{
                shStore.visitWS.close();
            }catch (e) {
                console.log("Error happened when close webSocket.");
            }
            shStore.visitWS = null;
        }
    }
});