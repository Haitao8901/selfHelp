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

    $('#connect').on('click', function () {
        var deviceNo = $('#deviceNo').val();
        if(!deviceNo){
            shStore.popupTool.showErrorWin('请输入设备号');
            return;
        }
        var data = {
            TellerName: '',
            ACTION: '',
            TranCode: '',
            BRANCHCODE: '',
            "requestSeq": new Date().toRequestSeq(),
            "description": "查询设备详细信息",
            "deviceNo": deviceNo,
            "remarks":""
        }
        sendRequest('queryDevice','post', data, afterRequest, errorCallback);
    })

    $('#deviceNo').on('change', function(){
        shStore.deviceNo = $(this).val();
    });

    function afterRequest(response){
        console.log(response);
        shStore.devicePort = response.data.devicePort;
        shStore.location = response.data.location;
        shStore.school = response.data.school;
        loadTargetPage('visitor');
    }

    function errorCallback(error){
        shStore.popupTool.showErrorWin('获取设备信息错误---' + error.message);
    }
});
