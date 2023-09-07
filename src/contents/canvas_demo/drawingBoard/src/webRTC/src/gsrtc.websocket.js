let WebRTCSocketInstance = function (url, protocol, callback = null) {
    console.info('create new webSocket.')
    this.websocketId = null
    this.wsReconnectTimeoutEvent = null
    this.wsReconnectTime = 2
    this.WS_RECONNECTED_TIMEOUT_TIME = 120
    this.wsKeepAliveInterval = null
    this.wasWebsocketClosed = false
    this.keepAliveWithoutResponse = 0
    this.WS_KEEP_ALIVE_TIMEOUT_FLAG = 5
    this.WS_KEEP_ALIVE_MILLISEC = 5*1000 // ping pong 保活周期（以毫秒计）
    this.WS_KEEP_ALIVE_CLOSE_TYPE = false // 保活失败主动close的状态

    if (WebRTCSocketInstance.prototype.tskStringIsNullOrEmpty(url)) {
        throw new Error("ERR_INVALID_PARAMETER_VALUE: '" + url + "' is not valid as webSocket url value")
    }
    if (WebRTCSocketInstance.prototype.tskStringIsNullOrEmpty(protocol)) {
        throw new Error("ERR_INVALID_PARAMETER_VALUE: '" + protocol + "' is not valid as protocol value")
    }

    if (this instanceof WebRTCSocketInstance) {
        this.isChannelOpen = false
        this.ws = this.createWebSocket(url, protocol, callback)
    } else {
        return new WebRTCSocketInstance(url, protocol, callback)
    }
}

/**
 * Determine if the input string is empty or all spaces
 * @param str
 * @returns {boolean}
 */
WebRTCSocketInstance.prototype.tskStringIsNullOrEmpty = function (str) {
    return typeof str === 'undefined' || str == null || str === '';
}

WebRTCSocketInstance.prototype.createWebSocket = function (url, protocols, callback = null) {
    console.info('create webSocket')
    if (WebRTCSocketInstance.prototype.tskStringIsNullOrEmpty(url)) {
        throw new Error("ERR_INVALID_PARAMETER_VALUE: '" + url + "' is not valid as webSocket url value")
    }

    let This = this
    console.info('webSocket Connecting to ' + url + ', protocols: ' + protocols)
    let ws = new WebSocket(url, protocols)
    ws.onopen = function (event) {
        console.log('websocket onopen!')
        if(grpDialingApi.sid){
            // websocket连接之后发送sid字符串进行鉴权
            console.log('send sid')
            This.sendMessage({sid: grpDialingApi.sid})
        }
    }

    ws.onmessage = function (event) {
        if (typeof (event.data) === 'string') {
            if (event.data === 'pong' || event.data === 'ping' || event.data === '\r\n' || event.data === '\r\n\r\n') {
                if(event.data === 'pong' || event.data === '\r\n\r\n'){
                    This.keepAliveWithoutResponse = 0
                }
            } else {
                console.info('Recv:  \r\n' + event.data)
                let data = JSON.parse(event.data)
                if(data){
                    if(data.hasOwnProperty('allow')){
                        if(data.allow){
                            console.log('create ws success.')
                            ws.keepAlive()
                            This.isChannelOpen = true
                        }else {
                            console.log('create ws failed, cause: ', data.reason)
                            This.wsCleanUp()
                        }

                        if(callback){
                            callback({code: data.allow ? 999 : '', data: data})
                            callback = null
                        }
                    }else {
                        if(This.isChannelOpen){
                            This.handleRecvMessage(data)
                        }

                    }
                }
            }
        }
    }

    ws.keepAlive = function (type) {
        if(!This.wsIsConnected()){
            clearInterval(This.wsKeepAliveInterval)
            This.wsKeepAliveInterval = null
            return
        }

        This.wsKeepAliveInterval = setInterval(function () {
            if(This.keepAliveWithoutResponse >= This.WS_KEEP_ALIVE_TIMEOUT_FLAG){
                console.log('Keep alive failed, close webSocket')
                ws.close(4000)
                clearInterval(This.wsKeepAliveInterval)
                This.wsKeepAliveInterval = null
                This.WS_KEEP_ALIVE_CLOSE_TYPE = true
                return
            }
            ws.send('\r\n')
            This.keepAliveWithoutResponse += 1
        }, This.WS_KEEP_ALIVE_MILLISEC)
    }

    ws.onclose = function (event) {
        console.log('websocket onclose code: ' + event.code)
        if(callback){
            callback({code: event.code})
            callback = null
        }
        This.isChannelOpen = false
    }

    return ws
}

/**
 * 发送 webSocket 消息
 * 请求类型：开启演示、挂断
 * @param data
 */
WebRTCSocketInstance.prototype.sendMessage = function (data) {
    let This = this
    if(!This.ws){
        console.log('websocket has not been created yet to send message')
        return
    }
    if(!data){
        console.info('no message need send!')
        return
    }

    console.info('ws send message: ', JSON.stringify(data, null, '    '))
    This.ws.send(JSON.stringify(data))
}



WebRTCSocketInstance.prototype.handleRecvMessage = function (message){
    let This = this
    if(typeof message === 'string'){
        message = JSON.parse(message)
    }
    if(message.api){
        switch (message.api){
            case 'phone_state':
                if(message.state === "unauthorized"){
                    grpDialingApi.autoReLogin()
                }
                break
            case 'line_status':
                if(message.data && message.data.length){
                    grpDialingApi.sendMessage2Popup({cmd: 'setLineStatus', lines: message.data})
                    grpDialingApi.handleShareScreenRequest({cmd: 'setLineStatus', lines: message.data})
                }
                break
            case 'accounts':
                if(message.data && message.data.length){
                    grpDialingApi.loginData.accountLists = message.data
                    grpDialingApi.sendMessage2Popup({cmd: 'updateAccountLists', accountLists: message.data})
                }
                break
            default:
                break
        }
    }else{

        let data = This.parseMessageBody(message)
        let action = data.type
        let requestType = data.message && data.message.actionType

        console.info("receive " + action +" message:" + JSON.stringify(message, null, '  '))

        switch (action) {
            case 'createMediaSession':
                console.info("start handle createMediaSession content")
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'receiveShareScreenRequest', content: message, localShare: false}))
                break;
            case 'createMediaSessionRet':
                console.info("start handle createMediaSessionRet content")
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'remoteAnswerSdp', content: message}))
                break;
            case 'destroyMediaSession':
                console.info("start handle destroyMediaSession content")
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'receiveScreenHangupRequest', content: message}))
            case 'destroyMediaSessionRet':
                console.info("start handle destroyMediaSessionRet content")
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'remoteShareScreenHangup', content: message}))
                break;
            default:
                console.log("get current requestType is " + action)
                break;
        }
    }

}

/**
 * 解析消息体:Parse message body
 *@param message 消息体
 *@return
 */
WebRTCSocketInstance.prototype.parseMessageBody = function(message){
    console.info('parse message body')

    if(typeof message === 'string'){
        message = JSON.parse(message)
    }

    let action
    let data
    let getAttributeArray = Object.keys(message)   // ect: local_line、(createMediaSession、createMediaSessionRet)
    if(message.hasOwnProperty('createMediaSession') || message.hasOwnProperty('createMediaSessionRet') ||
        message.hasOwnProperty('updateMediaSession') ||  message.hasOwnProperty('updateMediaSessionRet') ||
        message.hasOwnProperty('destroyMediaSession') ||  message.hasOwnProperty('destroyMediaSessionRet')){
        for(let key in getAttributeArray){
            action = getAttributeArray[key]
            if(action.indexOf('MediaSession') > 0){
                data = message[action]
                break
            }
        }
    }
    return { type: action,  message: data }
}

/**
 * Determine whether the webSocket is connected
 */
WebRTCSocketInstance.prototype.wsIsConnected = function(){
    let This = this
    let connected = false
    if(This.ws){
        switch (This.ws.readyState){
            case WebSocket.OPEN:
                // The connection is open and ready to communicate.
                console.log('The connection is open and ready to communicate.')
                connected = true
                break
            case WebSocket.CONNECTING:
                console.log('Socket has been created. The connection is not yet open.')
                break
            case WebSocket.CLOSING:
                console.log('The connection is in the process of closing.')
                break
            case WebSocket.CLOSED:
                console.log('The connection is closed or could not be opened.')
                break
            default:
                break
        }
    }

    return connected
}

WebRTCSocketInstance.prototype.wsCleanUp = function(){
    let This = this
    console.log('clean ws && Reconnection timer')
    if(This.ws){
        This.ws.close(4000)
        This.ws = null
    }
    clearTimeout(This.wsReconnectTimeoutEvent)
    This.wsReconnectTimeoutEvent = null
    clearInterval(This.wsKeepAliveInterval)
    This.wsKeepAliveInterval = null
    This.wsReconnectTime = 2
    This.keepAliveWithoutResponse = 0
    This.wasWebsocketClosed = false
    This.isChannelOpen = true
    grpDialingApi.socket = null
}


