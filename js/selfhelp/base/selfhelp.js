var shStore = {
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
    clearEventListener: function(eventName){
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

function sendRequest(suffix, method, data, callback, errorCallback) {
    var axiosParam = {};
    axiosParam.url = shStore.consts.baseUrl + (suffix ? suffix : '');
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

function getFullModulePath(moduleName) {
    return shStore.consts.basePagePath + moduleName + '.html';
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
        + this.toTimeString().substr(0, 8).replaceAll(':', '');
}

Date.prototype.beyondDefinedTime = function (startedTime, definedTime) {
    if(!startedTime){
        return false;
    }
    var current = this.getTime();
    return (current - startedTime) > definedTime;
}