//@ sourceURL=websocket_src.js
$(function(){
    if(typeof WebSocket == "undefined"){
        console.log("Browser not support WebSocket.");
        shStore.popupTool.showErrorWin('浏览器不支持Websocket，请升级浏览器！')
        loadTargetPage("welcome");
        return;
    }
    //标记位，用于重连websocket时的判断
    shStore.wsReconnecting = false;
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
        // shStore.visitWS.send('open|#|6|#|1001|#|');
        this.deviceOpened = true;
        shStore.dispatchEvent('OPENDEVICE');

    }

    function sendReadCardMessage(){
        this.currentAction = 'READIDCARDWITHPHOTO';
        // var devicePort = shStore.devicePort,
        var devicePort = 0,
            iBaud = 0,
            timeout = '' + shStore.consts.readCardTimeout;
        var msg = this.readCardMessage.replace('portNo', devicePort).replace('iBaud',iBaud).replace('timeout', timeout);
        if(shStore.visitWS && shStore.visitWS.readyState == 1) {
            shStore.visitWS.send(msg);
            return;
        }
        console.log('Websocket 未初始化');
    }

    function onOpen(){
        console.log('websocket connected, url is ' + shStore.consts.websocketUrl);
        if(shStore.wsReconnecting){
            $('.sysModal').modal('hide');
            shStore.wsReconnecting = false;
            shStore.reconnectStartTime = 0;
        }
        sendOpenDeviceMessage();
    }

    function onClose(){
        //停止读卡
        shStore.dispatchEvent('STOPREADCARD');
        if(shStore.closeWindow){
            shStore.closeWindow = false;
            return;
        }
        if(shStore.wsReconnecting){
            //是否超过等待重连时间
            if(new Date().beyondDefinedTime(shStore.reconnectStartTime, shStore.reconnectTime)){
                $('.sysModal').modal('hide');
                shStore.wsReconnecting = false;
                shStore.dispatchEvent('WSCLOSED');
                return;
            }
            reconnection();
            return;
        }
        console.log('websocket closed. Try to reconnect.');
        var waitTime = shStore.consts.websocketReconnectionTime;
        shStore.popupTool.showTimeErrorWin('Websocket无法连接，开始尝试重新连接！', (waitTime)/1000);
        //开始尝试重连
        shStore.reconnectTime = waitTime;
        shStore.reconnectStartTime = new Date().getTime();
        shStore.wsReconnecting = true;
        reconnection();
    }

    function onError(error){
        //error后触发close事件，统一在close中处理
        console.log('websocket Error happened. Error is ' + error);
    }

    function reconnection(){
        var socket = shStore.visitWS;
        if (socket.readyState == 3) {
            shStore.visitWS = init();
        }
    }

    function closeCurrentWebSocket(){
        if(shStore.visitWS && shStore.visitWS.readyState == 1){
            try{
                shStore.visitWS.close();
            }catch (e) {
                console.log("Error happened when close webSocket.");
            }
        }
        shStore.visitWS = null;
    }
});