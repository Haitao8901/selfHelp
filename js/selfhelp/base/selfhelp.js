var shStore = {
    environment: 'localDev',
    fullScreenKey: 122,
    ipAddress: getIpAddress(),
    deviceNo: '',
    devicePort: '',
    location: '',
    school: '',
    events: [],
    eventListeners: [],
    addEvents: function (eventName) {
        for (var index in this.events) {
            if (eventName == this.events[index]) {
                return;
            }
        }
        this.events.push(eventName);
        this.eventListeners.push({name: eventName, listeners: []});
    },
    addEventListener: function (eventName, listener) {
        for (var index in this.eventListeners) {
            var eventObj = this.eventListeners[index];
            if (eventName == eventObj.name) {
                eventObj.listeners.push(listener);
            }
        }
    },
    clearEventListener: function (eventName) {
        for (var index in this.eventListeners) {
            var eventObj = this.eventListeners[index];
            if (eventName == eventObj.name) {
                eventObj.listeners = [];
            }
        }
    },
    dispatchEvent: function (eventName, eventData) {
        var registered = false;
        for (var index in this.events) {
            if (eventName == this.events[index]) {
                registered = true;
                break;
            }
        }
        if (!registered) {
            console.log("Not registered event name.");
            return;
        }
        var listeners;
        for (var index in this.eventListeners) {
            var eventObj = this.eventListeners[index];
            if (eventName == eventObj.name) {
                listeners = eventObj.listeners;
                break;
            }
        }
        if (!listeners) {
            console.log("No listener found for event " + eventName);
            return;
        }
        for (var index in listeners) {
            listeners[index]({data: eventData});
        }
    }
}

shStore.consts = {
    baseUrl_localDev: 'http://192.168.43.31:8008/restapi/',
    baseUrl_dev: 'http://193.112.60.169:8000/restapi/',
    baseUrl_sit: 'http://193.112.60.169:8000/restapi/',
    baseUrl_prod: 'http://193.112.60.169:8000/restapi/',

    basePagePath: 'pages/',
    websocketUrl: 'ws://localhost:8085',
    // websocketUrl: 'ws://192.168.43.31:8008/webSocket/msg',
    readCardTimeout: 30,//second
    //尝试重新连接Websocket的等待时间
    websocketReconnectionTime: 1.5 * 60 * 1000,
    readCardIntervalTime: 40 * 1000,

    PIC_TRANCODE: '0007',
    PIC_ACTION:'GETQR',

    VISIT_TRANCODE: '1048',
    VISIT_ACTION_QUERYDEVICE: 'QUERY',
    VISIT_ACTION_QUERYCHILDREN: 'CHILDREN',
    VISIT_ACTION_QUERYERWEICODE: 'queryErWei',
    VISIT_ACTION_WAITINGRESPONSE: 'HB',
    VISIT_TellerName: '999997',
    VISIT_BRANCHCODE: '9999'
}

shStore.getVisitImagePath = function(QR_IMG_PATH, TB_CODE, BRANCHCODE){
    if(QR_IMG_PATH) {
        var prefixUrl = shStore.getBaseUrl() + shStore.consts.PIC_TRANCODE + '/' +  shStore.consts.PIC_ACTION;
        var suffixUrl = '?TB_CODE=' + TB_CODE + '&BRANCHCODE=' + BRANCHCODE + '&QR_IMG_PATH=' + QR_IMG_PATH;
        return prefixUrl + suffixUrl;
    }
    return 'images/tx.png';
}

shStore.getBaseUrl = function(){
    if(shStore.environment == 'prod'){
        return shStore.consts.baseUrl_prod;
    }

    if(shStore.environment == 'sit'){
        return shStore.consts.baseUrl_sit;
    }

    if(shStore.environment == 'dev'){
        return shStore.consts.baseUrl_dev;
    }

    return shStore.consts.baseUrl_localDev;
}

//发送请求，若不兼容Axios写法，则采用jquery ajax
function sendRequest(suffix, method, data, callback, errorCallback) {
    var baseUrl = shStore.getBaseUrl();
    baseUrl += (suffix ? suffix : '');

    if (typeof Promise == 'undefined') {
        shStore.progress.show();
        $.ajax({
                url: baseUrl,
                method: method ? method : 'post',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify(data),
                success: function (response) {
                    shStore.progress.hide();
                    response = {data: response};
                    console.log('Server response is: ' + response);
                    callback && callback(response);
                },
                error: function (error) {
                    shStore.progress.hide();
                    console.log(error);
                    error.message = error.status + '-' + error.statusText;
                    errorCallback && errorCallback(error);
                }
            }
        );
        return;
    }

    var axiosParam = {};
    axiosParam.url = baseUrl;
    axiosParam.method = method ? method : 'post';
    'get' == method ? axiosParam.params = data : axiosParam.data = data;

    axios(axiosParam).then(function (response) {
        shStore.progress.hide();
        console.log('Server response is: ' + response);
        callback && callback(response);
    }).catch(function (error) {
        shStore.progress.hide();
        console.log(error);
        errorCallback && errorCallback(error);
    });
}

axios.interceptors.request.use(function (config) {
    shStore.progress.show();
    return config;
}, function (error) {
    shStore.progress.hide();
    return Promise.reject(error);
});

axios.interceptors.response.use(function (response) {
    shStore.progress.hide();
    return response;
}, function (error) {
    shStore.progress.hide();
    return Promise.reject(error);
});

function loadTargetPage(moduleName, callback) {
    $('#content').load(getFullModulePath(moduleName), function () {
        callback && callback.apply(this, arguments);
    });
}

function fullScreen() {
    var el = document.getElementsByTagName('HTML')[0];
    var rfs = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullScreen,
        wscript;

    if(typeof rfs != "undefined" && rfs) {
        rfs.call(el);
        return;
    }

    if(typeof window.ActiveXObject != "undefined") {
        wscript = new ActiveXObject("WScript.Shell");
        if(wscript) {
            wscript.SendKeys("{F11}");
        }
    }
}

function exitFullScreen() {
    var el = document,
        cfs = el.cancelFullScreen || el.webkitCancelFullScreen || el.mozCancelFullScreen || el.exitFullScreen,
        wscript;

    if (typeof cfs != "undefined" && cfs) {
        cfs.call(el);
        return;
    }

    if (typeof window.ActiveXObject != "undefined") {
        wscript = new ActiveXObject("WScript.Shell");
        if (wscript != null) {
            wscript.SendKeys("{F11}");
        }
    }
}

function getFullModulePath(moduleName) {
    return shStore.consts.basePagePath + moduleName + '.html';
}

function getIpAddress(){
    if (returnCitySN) {
       return returnCitySN.cip;
    }
    return '';
}

Date.prototype.toFmtStr = function () {
    var y = this.getFullYear(),
        m = this.getMonth() + 1,
        d = this.getDate();
    return y
        + "-" + (m < 10 ? "0" + m : m)
        + "-" + (d < 10 ? "0" + d : d)
        + " " + this.toTimeString().substr(0, 8);
}

Date.prototype.toRequestSeq = function () {
    var y = this.getFullYear(),
        m = this.getMonth() + 1,
        d = this.getDate();
    return '' + y
        + (m < 10 ? "0" + m : m)
        + (d < 10 ? "0" + d : d)
        + this.toTimeString().substr(0, 8).replace(/:/ig, '');
}

Date.prototype.beyondDefinedTime = function (startedTime, definedTime) {
    if (!startedTime) {
        return false;
    }
    var current = this.getTime();
    return (current - startedTime) > definedTime;
}

String.prototype.toYMD = function() {
    var reg = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\d*/ig;
    if(reg.test(this)){
        return this.replace(reg, '$1年$2月$3日$4时$5分$6秒');
    }
    return this;
}

//spinner进度条
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
//bootstrap的Modal,用于弹窗显示相关信息
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
        // _this.find('.t_image').attr('src', 'data:image/png;base64,' + imageStr);
        _this.find('.t_image').attr('src', imageStr);
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
        //存在相同信息的窗口则不必再显示
        if($('.sysModal').length > 0
            && $('.sysModal .titleInfo').text() == message){
                return;
        }

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