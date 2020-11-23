shStore.consts = {
    baseUrl: 'http://192.168.43.31:8008/api/',
    basePagePath: 'pages/',
    websocketUrl: 'ws://192.168.43.31:8085',
    // websocketUrl: 'ws://192.168.43.31:8008/webSocket/msg',
    readCardTimeout: 30,
    //尝试重新连接Websocket的等待时间
    websocketReconnectionTime: 1.5 * 60 * 1000,
    readCardIntervalTime: 40 * 1000,

    VISIT_TRANCODE: '1048',
    VISIT_ACTION_QUERYDEVICE: 'QUERY',
    VISIT_ACTION_QUERYCHILDREN: 'CHILDREN',
    VISIT_ACTION_QUERYERWEICODE: 'queryErWei',
    VISIT_ACTION_WAITINGRESPONSE: 'waitingResult',
    VISIT_TellerName: '999997',
    VISIT_BRANCHCODE: '9999'
}
shStore.progress = {
    initialed: false,
    spinner: null,
    target: null,
    modalEl: '<div class="spinner-back"></div>',
    myDefaults: {
        lines: 12,
        length: 15,
        width: 6,
        radius: 10,
        scale: 1.0,
        color: '#000',
        zIndex: 1030,
        className: 'spinner',
        top: '50%',
        left: '50%',
        position: 'fixed',
    },
    init: function(){
        var spinner = new Spinner(this.myDefaults);
        var target = $('body')[0];
        this.initialed = true;
        this.spinner = spinner;
        this.target = target;
    },
    show: function(){
        if(!this.initialed){
            this.init();
        }
        $('body').append(this.modalEl);
        this.spinner.spin(this.target);
    },
    hide: function(){
        if(!this.initialed){
            this.init();
        }
        this.spinner.spin();
        $('.spinner-back').remove();
    }
}
shStore.popupTool = {
    modalTemplate:
        '<div class="modal fade sysModal" data-backdrop="static" tabindex="-1" role="dialog"  aria-hidden="true" >'
        + '<div class="modal-dialog">'
        + '<div class="modal-content">'
        + '<h5 class="titleInfo"></h5>'
        + '<p class="otherMessage"></p>'
        + '<p class="closeMessage"><small><span class="timeCount" style="color:blue;"></span>&nbsp;秒后关闭</small></p>'
        + '</div>'
        + '<div class="modal-footer" style="display: none;">'
        + '<button type="button" class="btn btn-primary">确认</button>'
        + '</div></div></div>',
    imageModalTemplate:
        '<div class="modal fade imageModal" data-backdrop="static" tabindex="-1" role="dialog"  aria-hidden="true" >'
        + '<div class="modal-dialog">'
        + '<div class="modal-content">'
        + '<h5 class="titleInfo"></h5>'
        + '<h5 class="otherMessage"></h5>'
        + '<p class="closeMessage"><small><span class="timeCount" style="color:blue;"></span>&nbsp;秒后关闭</small></p>'
        + '<p><img class="t_image" src="images/cszy.png"/></p>'
        + '</div></div></div>',
    showImageModal: function (title, message, imageStr, autoClose, totalTime) {
        $('body').append(this.imageModalTemplate);

        var _this = $('body .modal:last');
        _this.find('.titleInfo').text(title);
        _this.find('.otherMessage').text(message);
        _this.find('.closeMessage').hide();
        _this.find('.t_image').attr('src', 'data:image/png;base64,' + imageStr);
        //背景色
        _this.find('.modal-content').addClass('alert-info');
        _this.modal('show');

        _this.on('hidden.bs.modal', function(){
            _this.next('.modal-backdrop').remove();
            _this.remove();
        });

        if(autoClose){
            var showTimeCount = function () {
                if (totalTime == 0) {
                    _this.modal('hide');
                    return;
                }
                if (!totalTime) totalTime = 5;
                _this.find('.timeCount').text(totalTime < 10 ? ('0' + totalTime) : totalTime);
                _this.find('.closeMessage').show();
                totalTime--;
                window.setTimeout(showTimeCount, 1000);
            }
            showTimeCount();
        }
        return _this;
    },
    showTimeErrorWin: function (message, totalTime, callback) {
        this.showModalWin('error', message, true, totalTime, callback);
    },
    showErrorWin: function (message, callback) {
        this.showModalWin('error', message, true, 5, callback);
    },

    showSuccessWin: function (message, callback) {
        this.showModalWin('success', message, true, 5, callback);
    },

    showInfoWin: function (message, callback) {
        this.showModalWin('info', message, true, 5, callback);
    },

    showWarningWin: function (message, callback) {
        this.showModalWin('warning', message, true, 5, callback);
    },

    showModalWin: function (type, message, autoClose, totalTime, callback) {
        $('body').append(this.modalTemplate);

        var classez;
        switch (type) {
            case 'success':
                classez = 'alert-success';
                break;
            case 'warning':
                classez = 'alert-warning';
                break;
            case 'error':
                classez = 'alert-danger';
                break;
            default:
                classez = 'alert-info';
                break;
        }

        var _this = $('body .modal:last');
        _this.find('.otherMessage').hide();
        _this.find('.titleInfo').text(message);
        //背景色
        _this.find('.modal-content').addClass(classez);
        _this.modal('show');

        _this.on('hidden.bs.modal', function(){
            _this.next('.modal-backdrop').remove();
            _this.remove();
        });

        if (autoClose) {
            var showTimeCount = function () {
                if (totalTime == 0) {
                    _this.modal('hide');
                    callback && callback();
                    return;
                }
                if (!totalTime) totalTime = 5;
                _this.find('.timeCount').text(totalTime < 10 ? ('0' + totalTime) : totalTime);
                _this.find('.closeMessage').show();
                totalTime--;
                window.setTimeout(showTimeCount, 1000);
            }
            showTimeCount();
            return;
        }

        _this.find('.modal-footer .btn').off('click');
        _this.find('.modal-footer .btn').on('click', clearSelf);
        _this.find('.modal-footer').show();
    }
}