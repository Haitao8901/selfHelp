//@ sourceURL=welcome_src.js
$(function(){
    initStatus();
    //初始化一些状态
    function initStatus(){
        shStore.currentpage = 'welcome';
        shStore.closeWindow = false;
        shStore.deviceNo = '';
        shStore.devicePort = '';
        shStore.location = '';
        shStore.school = '';
        shStore.events = [];
        shStore.eventListeners = [];
    }

    $('#deviceNo').on('change', function(){
        shStore.deviceNo = $(this).val();
    });

    $('body').on('keydown', enterHandler);
    $('#connect').on('click', doQueryDevice);

    function enterHandler(e){
        var which = e.which || e.keyCode;
        if(which == 13) {
            doQueryDevice();
        }
    }

    function doQueryDevice(){
        var deviceNo = $('#deviceNo').val();
        if(!deviceNo){
            shStore.popupTool.showErrorWin('请输入设备号');
            return;
        }
        queryDeviceInfo();
    }

    function queryDeviceInfo(){
        var deviceNo = $('#deviceNo').val();
        //just for test
        if(shStore.environment != 'prod'){
            deviceNo = '10020701';
        }
        var data = {
            TellerName: shStore.consts.VISIT_TellerName,
            ACTION: shStore.consts.VISIT_ACTION_QUERYDEVICE,
            TranCode: shStore.consts.VISIT_TRANCODE,
            BRANCHCODE: shStore.consts.VISIT_BRANCHCODE,
            // "requestSeq": new Date().toRequestSeq(),
            // "description": "查询设备详细信息",
            "DEVICE_NO": deviceNo,
            // "remarks":""
        }
        var suffix = shStore.consts.VISIT_TRANCODE + '/' + shStore.consts.VISIT_ACTION_QUERYDEVICE;
        sendRequest(suffix,'post', data, afterRequest, errorCallback);
    }

    function afterRequest(response){
        console.log(response);
        var code = response.data.CODE;
        var message = response.data.MESSAGE;
        //{"MESSAGE":"查询设备成功!",
        // "CODE":"0000",
        // "DEVICE_NO":"10020701",
        // "ERRMSG":"交易成功",
        // "TB_NAME":"湘乡树人中学",
        // "ADDRESS":"DC_NAME",
        // "TB_CODE":"1002",
        // "ERRCODE":"0000"}
        if(code == '0000'){
            shStore.deviceNo = response.data.DEVICE_NO;
            shStore.location = response.data.ADDRESS;
            shStore.school = response.data.TB_NAME;
            shStore.tbCode = response.data.TB_CODE;
            loadTargetPage('visitor');
            $('body').off('keydown', enterHandler);
            return;
        }
        if(!code){
            code = response.data.ERRCODE;
            message = response.data.ERRMSG;
        }
        shStore.popupTool.showErrorWin(code + '---' + message);
    }

    function errorCallback(error){
        shStore.popupTool.showErrorWin('获取设备信息错误---' + error.message);
    }
});
