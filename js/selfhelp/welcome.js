//@ sourceURL=welcome_src.js
$(function(){
    initStatus();

    //初始化一些状态
    function initStatus(){
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

    $('#connect').on('click', function () {
        var deviceNo = $('#deviceNo').val();
        if(!deviceNo){
            shStore.popupTool.showErrorWin('请输入设备号');
            return;
        }
        queryDeviceInfo();
    });

    function queryDeviceInfo(){
        var deviceNo = $('#deviceNo').val();
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
        sendRequest(shStore.consts.VISIT_ACTION_QUERYDEVICE,'post', data, afterRequest, errorCallback);
    }

    function afterRequest(response){
        console.log(response);
        if(response.data.CODE == '0'){
            shStore.deviceNo = response.data.DEVICE_NO;
            shStore.location = response.data.ADDRESS;
            shStore.school = response.data.TB_NAME;
            shStore.tbCode = response.data.TB_CODE;
            loadTargetPage('visitor');
            return;
        }

        shStore.popupTool.showErrorWin(response.data.CODE + '---' + response.data.MESSAGE);
    }

    function errorCallback(error){
        shStore.popupTool.showErrorWin('获取设备信息错误---' + error.message);
    }
});
