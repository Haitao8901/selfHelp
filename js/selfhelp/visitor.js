//@ sourceURL=visitor_src.js
$(function () {
    //储存当前页的各项信息
    var cpage = {
        deviceNo: shStore.deviceNo,
        devicePort: shStore.devicePort,
        location: shStore.location,
        school: shStore.school,

        //标记位当前整个流程是否已经完成
        //未完成则忽略再次读到的身份证信息
        flowStarted: false,
        //读取身份证的interval值
        readCardInterval: '-1',
        readCardIntervalTime: shStore.consts.readCardIntervalTime,
        //轮询后台结果的timeout
        waitingTimeout:-1,
        //轮询后台结果的时间,超出则重置页面
        waitingTime: 2*60*1000,
        //当前处理的访客的具体信息
        visitor: null,
        //二维码展示dom元素
        erWeiEl:null,
        //还未获取到后台结果的队列
        waitingVisitor: [],
        //访客记录
        records: []
    }
    shStore.visitorPage = cpage;
    window.setTimeout(setTableHeight,100);
    window.onresize = setTableHeight;
    initEvent();
    loadPageElementAndEvent();

    function initEvent() {
        //连接设备
        shStore.addEvents('OPENDEVICE');
        //先清除相关listener避免重复增加
        shStore.clearEventListener('OPENDEVICE');
        shStore.addEventListener('OPENDEVICE', handleOpenDevice);
        //读出身份证信息
        shStore.addEvents('CARDINFOREADY');
        shStore.clearEventListener('CARDINFOREADY');
        shStore.addEventListener('CARDINFOREADY', handleCardInfoReady);
        //开始等待后台返回结果
        shStore.addEvents('STARTWAITING');
        shStore.clearEventListener('STARTWAITING');
        shStore.addEventListener('STARTWAITING', handleStartWaiting);
        //结束等待后台返回，即用户已经填写信息
        shStore.addEvents('ENDWAITING');
        shStore.clearEventListener('ENDWAITING');
        shStore.addEventListener('ENDWAITING', handleEndWaiting);
        //显示二维码
        shStore.addEvents('FETCHERWEIPICTURE');
        shStore.clearEventListener('FETCHERWEIPICTURE');
        shStore.addEventListener('FETCHERWEIPICTURE', handleFetchErWeiPicture);
        //流程结束
        shStore.addEvents('FLOWEND');
        shStore.clearEventListener('FLOWEND');
        shStore.addEventListener('FLOWEND', handleFlowEnd);

        shStore.addEvents('WSCLOSED');
        shStore.clearEventListener('WSCLOSED');
        shStore.addEventListener('WSCLOSED', handleWSclosed);
    }

    function setTableHeight(){
        var contentHeight = $('.content').get(0).offsetHeight,
            lfposition = $('.lfbox').get(0).offsetTop,
            title = $('.lfbox .title').get(0).offsetHeight,
            tablerHeader = $('.tabler:first').get(0).offsetHeight;

        //访客表的高度
        var height = contentHeight - lfposition - title - tablerHeader - 20;
        $('.datatable').height(height);

        //如果当前行数不够，填充空白行
        var cRows = $('.datatable tr').length;
        //原始html页面有空白行，否则出错
        var rowHeight = $('.datatable tr:first').height();
        var totalLines = Math.ceil(height/rowHeight);

        if (cRows  < totalLines) {
            var blankRow = '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
            var _th = $('.recordTable');
            for (var index = 0; index < totalLines - cRows; index++) {
                _th.append(blankRow);
            }
        }
        //滚动到最顶端
        $('.datatable').scrollTop(0);
    }

    function handleWSclosed(){
        console.log('handleWSclosed---');
        endReadCardFlow();
        shStore.popupTool.showErrorWin('重新连接Websocket失败，返回初始页面.', function(){
            forceStopCurrentFlow();
            loadTargetPage('welcome');
        });
    }

    function handleOpenDevice() {
        console.log('handleOpenDevice---');
        //设备开启后即开始不停的读取信息
        startReadCardFlow();
    }

    function startReadCardFlow() {
        if (shStore.visitorPage.readCardInterval != -1) {
            window.clearInterval(shStore.visitorPage.readCardInterval);
        }
        //先执行一次，interval中需要等待readCardIntervalTime后才第一次执行
        shStore.visitWS.sendReadCardMessage();
        var interval = window.setInterval(shStore.visitWS.sendReadCardMessage, cpage.readCardIntervalTime);
        console.log('Create ReadCard Interval at ' + new Date().toFmtStr() + ' and interval value is ' + interval);
        shStore.visitorPage.readCardInterval = interval;
    }

    function endReadCardFlow() {
        console.log('Clear ReadCard interval  and interval value is ' + shStore.visitorPage.readCardInterval);
        window.clearInterval(shStore.visitorPage.readCardInterval);
    }

    function handleCardInfoReady(evt) {
        console.log('handleCardInfoReady---');
        // endReadCardFlow();

        var strs = evt.data.split('|#|');
        // 0|#|成功|姓名|#|性别|#|民族|#|出生年月日|#|住址|#|公民身份号码|#|签发机关|#|有效期限起始日期|#|有效期限结束日期|#|有效期限|#|预留|#|证件版本号|#|证件类型代码|#|照片
        var nVisitor = {
            originalInfo: evt.data,
            name: strs[2],//姓名
            sex: strs[3],//性别
            // national: strs[4],//民族
            birthDate: strs[5],//出生日期
            address: strs[6],//地址
            idCardNo: strs[7],//身份证号码
            organization: strs[8],//发卡机构
            validStart: strs[9],//有效开始期
            validEnd: strs[10],//有效截止期
            image: strs[14]//图像
        };

        if(cpage.flowStarted){
            if(cpage.visitor.idCardNo == nVisitor.idCardNo) {
                console.log('Same IdCardNo. Skip it.');
                return;
            }

            console.log('Current process is not end.');
            //流程结束后，等待访客进入期间，不用弹出窗口
            if(!cpage.waitingVisitorEnter){
                shStore.popupTool.showErrorWin('当前处理尚未完成，请稍等')
            }
            return;
        }

        clearVisitorInfo();
        clearTargetInfo();
        clearOtherInfo();

        cpage.flowStarted = true;

        var waited = tryFindWaiting(nVisitor);
        cpage.visitor = waited ? $.extend({}, waited) : nVisitor;
        fillVisitorInfo();
        if(waited){
            if(!checkWaitedTime()){
                //没有超过等待时间则直接显示二维码并查询后台结果
                showErWeiImage(cpage.visitor.visitStatusDesc, cpage.visitor.erWeiImageStr, false, 60);
                cpage.waitingTimeout = window.setTimeout(waitingServerResponse, 2000);
                return;
            }
        }
        queryIdCard();
    }

    function loadPageElementAndEvent() {
        //时间栏位
        window.setInterval(function () {
            $('.timeSpan').text(new Date().toFmtStr());
        }, 1000);

        $('.schoolname').text(shStore.school);
        $('.deviceNo').text(shStore.deviceNo);
        $('.location').text(shStore.location);

        $('.quithref').on('click', function () {
            window.close();
        });
    }

    function queryIdCard() {
        var visitor = cpage.visitor;
        var requestSeq = new Date().toRequestSeq();
        var requestData = {
            TellerName: '',
            ACTION: '',
            TranCode: '',
            BRANCHCODE: '',
            "requestSeq": requestSeq,
            "description": "查询身份证信息",
            "deviceNo": shStore.visitorPage.deviceNo,
            "visitType": visitor.type,
            "chineseName": visitor.name,
            "englishName": "",
            "birthDate": visitor.birthDate,
            "idCardNo": visitor.idCardNo,
            "idCardImage": visitor.image,
            "capturedImage": "",
            "remarks": ""
        }
        sendRequest('queryIdCard', 'post', requestData, afterRequest, errorCallback);

        function afterRequest(response) {
            // {"trancode": "","action": "","code": "","status": "","visitStatus": "","visitStatusDesc": "","remarks":""}
            if (response.data.code == '0000') {
                //TODO 暂时以此次成功请求的requestSeq作为后续跟踪的waitingSeq
                cpage.visitor.waitingSeq = requestSeq;
                shStore.dispatchEvent('FETCHERWEIPICTURE', response.data);
                return;
            }
            //TODO show error info
            var errorStr = 'QueryIdCard error. ' + response.data.code + '---' + response.data.status;
            shStore.popupTool.showErrorWin(errorStr, forceStopCurrentFlow);
        }

        function errorCallback(error) {
            shStore.popupTool.showErrorWin('QueryIdCard error---' + error.message, forceStopCurrentFlow);
        }
    }

    function handleFetchErWeiPicture(evt){
        cpage.visitor.visitStatus = evt.data.visitStatus;
        cpage.visitor.visitStatusDesc = evt.data.visitStatusDesc;
        var requestData = {
            TellerName: '',
            ACTION: '',
            TranCode: '',
            BRANCHCODE: '',
            "requestSeq": new Date().toRequestSeq(),
            "description": "获取二维码",
            "type": cpage.visitor.visitStatus,
            "typeDescription": cpage.visitor.visitStatusDesc,
            " deviceNo ": shStore.deviceNo,
            "idCardNo": cpage.visitor.idCardNo,
            "remarks":""
        }
        sendRequest('queryErWei', 'post', requestData, afterRequest, errorCallback);
        function afterRequest(response) {
            //{"trancode": "","action": "","code": "","status": "","type": "","typeDescription":"","image": "","remarks":""}
            if (response.data.code == '0000') {
                cpage.waitingVisitor.push($.extend({}, cpage.visitor));
                cpage.visitor.erWeiImageStr = response.data.image;
                showErWeiImage(cpage.visitor.visitStatusDesc, response.data.image, false, 60);
                shStore.dispatchEvent('STARTWAITING');
                return;
            }
            //TODO show error info
            var errorStr = 'FetchErWeiPicture error. ' + response.data.code + '---' + response.data.status;
            shStore.popupTool.showErrorWin(errorStr, forceStopCurrentFlow);
        }

        function errorCallback(error) {
            shStore.popupTool.showErrorWin('FetchErWeiPicture error---' + error.message, forceStopCurrentFlow);
        }
    }

    function showErWeiImage(desc, imageStr, autoClose, totalTime) {
        cpage.erWeiEl = shStore.popupTool.showImageModal(desc, '请扫描以下二维码完成后续操作', imageStr, autoClose, totalTime)
    }

    function handleStartWaiting(evt) {
        console.log('handleStartWaiting---');
        cpage.visitor.startWaitingTime = new Date().getTime();
        cpage.waitingTimeout = window.setTimeout(waitingServerResponse, 5000);
    }

    function handleEndWaiting(evt) {
        console.log('handleEndWaiting---');
        shStore.dispatchEvent('FLOWEND');
    }

    function waitingServerResponse() {
        var visitor = cpage.visitor;
        var requestData = {
            TellerName: '',
            ACTION: '',
            TranCode: '',
            BRANCHCODE: '',
            "requestSeq": new Date().toRequestSeq(),
            "waitingSeq": visitor.waitingSeq,
            "description": "等待结果",
            "idCardNo": visitor.idCardNo,
            "deviceNo": shStore.deviceNo,
            "remarks":""
        }
        sendRequest('waitingResult', 'post', requestData, afterRequest, errorCallback);

        function afterRequest(response) {
            var data = response.data;
            if (data.code == '0000') {
                fillOthersInfo(data);
                fillVisitTargetInfo(data.visitTarget);
                fillChildrenInfo(data.children);
                fillHistoryRecords(data.historyVisitRecords);
                shStore.dispatchEvent('ENDWAITING');
                return;
            }
            //TODO WAITINGSEQ
            if(data.code == '0002'){
                if(checkWaitedTime()){
                    shStore.popupTool.showErrorWin('超过' + cpage.waitingTime/(60*1000) + '分钟没有响应，请重刷身份证', forceStopCurrentFlow);
                    return;
                }
                if(cpage.waitingTimeout != -1){
                    window.clearTimeout(cpage.waitingTimeout);
                }
                cpage.waitingTimeout = window.setTimeout(waitingServerResponse, 3000);
                return;
            }
            var errorStr = 'WaitingResult error. ' + response.data.code + '---' + response.data.status;
            shStore.popupTool.showErrorWin(errorStr, forceStopCurrentFlow);
        }

        function errorCallback(error) {
            shStore.popupTool.showErrorWin('Waiting response error---' + error.message, forceStopCurrentFlow);
        }
    }

    function handleFlowEnd() {
        console.log('---HandleFlowEnd---');
        //avoid in case
        window.clearTimeout(cpage.waitingTimeout);
        cpage.waitingTimeout = -1;

        $('.sysModal, .imageModal').modal('hide');
        cpage.erWeiEl = null;
        cpage.visitor.allDone = true;
        //确保完成后才执行状态重置
        cpage.waitingVisitorEnter = true;
        shStore.popupTool.showSuccessWin(' 您已登记成功，请进入！', function(){
            removeWaitingVisitor();
            cpage.visitor.allDone = false;
            cpage.flowStarted = false;
            cpage.waitingVisitorEnter = false;
            cpage.visitor.startWaitingTime = null;
        });
    }

    function forceStopCurrentFlow() {
        console.log('---forceStopCurrentFlow---');
        $('.sysModal, .imageModal').modal('hide');
        //avoid in case
        window.clearTimeout(cpage.waitingTimeout);
        cpage.waitingTimeout = -1;
        if(cpage.visitor){
            cpage.visitor.startWaitingTime = null;
            cpage.visitor.allDone = false;
        }
        cpage.erWeiEl = null;
        cpage.flowStarted = false;
        cpage.waitingVisitor = [];
        cpage.waitingVisitorEnter = false;
        resetPage();
    }

    function resetPage(){
        clearVisitorInfo();
        clearTargetInfo();
        clearOtherInfo();
    }

    function checkWaitedTime(){
        return new Date().beyondDefinedTime(cpage.visitor.startWaitingTime, cpage.waitingTime);
    }

    /**找到存储的等待记录*/
    function tryFindWaiting(cVisitor){
        var targetIndex = -1;
        for(var index in cpage.waitingVisitor){
            var visitor = cpage.waitingVisitor[index];
            if(cVisitor.idCardNo == visitor.idCardNo){
                targetIndex = index;
                break;
            }
        }

        if(targetIndex > 0){
            return (cpage.waitingVisitor[index]);
        }
        return null;
    }

    function removeWaitingVisitor(){
        var targetIndex = -1;
        for(var index in cpage.waitingVisitor){
            var visitor = cpage.waitingVisitor[index];
            if(cpage.visitor.idCardNo == visitor.idCardNo && cpage.visitor.allDone){
                targetIndex = index;
                break;
            }
        }
        if(targetIndex >= 0){
            cpage.waitingVisitor.splice(targetIndex, 1);
        }
        cpage.visitor = {};
    }

    function clearVisitorInfo(){
        $('.visitorName').val('');
        $('.visitorSex').val('');
        $('.visitorBirthDate').val('');
        $('.visitorIdCardNo').val('');
        $('.visitorAddress').val('');
        $('.visitorImage').attr('src', 'images/tx.png');
    }

    function clearTargetInfo(){
        $('.cname').val('');
        $('.cgrade').val('');
        $('.cclass').val('');
        $('.cimage').attr('src', 'images/tx.png');
    }

    function clearOtherInfo(){
        $('.cType').val('');
        $('.creason').val('');
        $('.cremark').val('');
    }

    function fillVisitorInfo() {
        var visitor = cpage.visitor;
        // visitorName  visitorSex visitorIdCardNo visitorAddress visitorImage
        $('.visitorName').val(visitor.name);
        $('.visitorSex').val(visitor.sex);
        $('.visitorIdCardNo').val(visitor.idCardNo);
        $('.visitorBirthDate').val(visitor.birthDate);
        $('.visitorAddress').val(visitor.address);
        if(visitor.image){
            $('.visitorImage').attr('src', 'data:image/png;base64,' + visitor.image);
        }else{
            $('.visitorImage').attr('src', 'images/tx.png');
        }
    }

    function fillOthersInfo(data) {
        var visitor = cpage.visitor;
        visitor.visitType = data.visitType;
        visitor.visitReason = data.visitReason;
        visitor.remark = data.remark;

        //cType creason cremark
        $('.cType').val(visitor.visitType);
        $('.creason').val(visitor.visitReason);
        $('.cremark').val(visitor.remark);
    }

    function fillVisitTargetInfo(target) {
        if (!target) {
            return;
        }
        $('.cname').val(target.name);
        $('.cgrade').val(target.grade);
        $('.cclass').val(target.class);
        if(target.image){
            $('.cimage').attr('src', 'data:image/png;base64,' + target.image);
        }else{
            $('.cimage').attr('src', 'images/tx.png');
        }
    }

    function fillChildrenInfo(children) {
        if (!children) {
            return;
        }
        var child = children;
        if(Array.isArray(children)){
            var size = children.length;
            //随机显示一个子女信息
            child = children[Math.floor(Math.random() * size)];
        }
        $('.cname').val(child.name);
        $('.cgrade').val(child.grade);
        $('.cclass').val(child.class);
        if(child.image){
            $('.cimage').attr('src', 'data:image/png;base64,' + child.image);
        }else{
            $('.cimage').attr('src', 'images/tx.png');
        }
    }

    function fillHistoryRecords(records) {
        if(!records){
            return;
        }
        //添加到访客记录队列里
        cpage.records.splice(0, 0, records);

        // $('.recordTable tr:not(.th)').remove();
        var _th = $('.recordTable');
        var template = '<tr><td>time</td><td>visitName</td><td>reason</td><td>name</td><td>grade</td><td>class</td></tr>';

        for (var index in records) {
            var record = records[index];
            var visitName = record.visitName,
                visitTime = record.visitTime,
                visitReason = record.visitReason,
                name = record.name;
            var grade = record.grade ? record.grade : '----';
            var classz = record.class ? record.class : '----';

            _th.prepend(
                template.replace('time', visitTime)
                    .replace('visitName', visitName)
                    .replace('reason', visitReason)
                    .replace('name', name)
                    .replace('grade', grade)
                    .replace('class', classz)
            );
        }
        $('.datatable').scrollTop(0);
    }
});