let WebRTCSocketInstance = function (url, protocol, callback = null) {
    console.info('create new webSocket.')
    this.websocketUrl = url
    this.websocketProtocol = protocol
    this.websocketId = null
    this.wsReconnectTimeoutEvent = null
    this.wsReconnecting = false
    this.wsReconnectTime =6*1000   // 非保活状态下，后台10秒后断开连接
    this.wsReconnectCount = 0
    this.WS_RECONNECTED_TIMEOUT_TIME = 120
    this.wsKeepAliveTimeProcessor = null
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
                    ws.keepAlive()
                }
            } else {
                console.info('Recv:  \r\n' + event.data)
                let data = JSON.parse(event.data)
                if(data){
                    if(data.hasOwnProperty('allow')){
                        if(data.allow){
                            console.log('***************************** create ws success *****************************')
                            ws.keepAlive()
                            This.isChannelOpen = true
                            This.wsReconnecting = false
                            grpDialingApi.websocketStatus = 1
                            callback && callback({code: 999, data: data})
                        }else {
                            console.log('create ws failed, cause: ', data.reason)
                            This.wsCleanUp()

                            if(!This.wsReconnecting){
                                callback && callback({code: '', data: data})
                            }
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
        if (!This.wsIsConnected()) {
            clearTimeout(This.wsKeepAliveTimeProcessor)
            This.wsKeepAliveTimeProcessor = null
            return
        }

        // safari extension使用setInterval或setTimeout递归调用时不按设置时间触发，导致ws保活失败
        This.wsKeepAliveTimeProcessor = setTimeout(function () {
            if (This.keepAliveWithoutResponse >= This.WS_KEEP_ALIVE_TIMEOUT_FLAG) {
                console.log('Keep alive failed, close webSocket')
                ws.close(4000)
                clearTimeout(This.wsKeepAliveTimeProcessor)
                This.wsKeepAliveTimeProcessor = null
                This.WS_KEEP_ALIVE_CLOSE_TYPE = true
                return
            }
            ws.send('\r\n')
            This.keepAliveWithoutResponse += 1
        }, This.WS_KEEP_ALIVE_MILLISEC)
    }

    ws.onclose = function (event) {
        console.log('websocket onclose code: ' + event.code)
        This.isChannelOpen = false

        if(grpDialingApi.isLogin){
            // 已登录，尝试重连
            console.log('Already logged in, try to reconnect')
            This.wsReconnecting = true
            grpDialingApi.websocketStatus = 2
            grpDialingApi.socketOnClose({status: grpDialingApi.websocketStatus, code: event.code})
            This.wsReconnect(This.wsReconnectTime, callback)
        }else {
            console.log('Logged out and will not reconnect. . .')
        }
    }

    return ws
}

WebRTCSocketInstance.prototype.wsReconnect = function (timer, callback){
    let This = this
    console.log('webSocket reConnect within time ' + timer)
    This.wsReconnectTimeoutEvent = setTimeout(function(){
        if(grpDialingApi.isLogin){
            if(!This.wsIsConnected()){
                This.wsReconnectCount++
                This.ws = This.createWebSocket(This.websocketUrl, This.websocketProtocol, callback)
            }else {
                // Todo: 第一次登录时ws未连接成功，触发重连，定时器触发前账号被抢占登出，重新登录后定时器触发，会覆盖新登录创建的ws，并导致后续的ws一直无法连接
                console.log('ws connection already exists.')
            }
        }else {
            console.log('Currently logged out, will not reconnect')
        }
    }, timer)
}

/**
 * 发送 webSocket 消息
 * 请求类型：开启演示、挂断
 * @param data
 */
WebRTCSocketInstance.prototype.sendMessage = function (data) {
    let This = this
    if(!This.ws || !This.wsIsConnected()){
        console.log('websocket unavailable')
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
                if(message.data){
                    grpDialingApi.handleLineContents({cmd: 'setLineStatus', lines: message.data})
                    grpDialingApi.handleShareScreenRequest({cmd: 'setLineStatus', lines: message.data})
                }
                break
            case 'accounts':
                if(message.data && message.data.length){
                    grpDialingApi.loginData.accountLists = message.data
                    grpDialingApi.sendMessage2Popup({cmd: 'updateAccountLists', accountLists: message.data})
                    grpDialingApi.extensionNamespace.storage.local.set({ 'updateAccountLists': message.data}, function () {
                        console.log("set accountLists success")
                    })
                }
                break
            default:
                break
        }
    }else{

        let data = This.parseMessageBody(message)
        let action = data.type
        let cmd

        console.info("receive " + action +" message:" + JSON.stringify(message, null, '  '))

        switch (action) {
            case 'createMediaSession':
                console.info("start handle createMediaSession content")
                if(message.createMediaSession.shareType === 'shareFile'){
                    cmd = 'quicallReceiveShareFileRequest'
                }else {
                    cmd = 'receiveShareScreenRequest'
                }
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: cmd, content: message, localShare: false}))
                break;
            case 'createMediaSessionRet':
                console.info("start handle createMediaSessionRet content")

                if(message.createMediaSessionRet.shareType === 'shareFile'){
                    cmd = 'quicallRemoteAnswerSdp'
                }else {
                    cmd = 'remoteAnswerSdp'
                }
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: cmd, content: message}))
                break;
            case 'destroyMediaSession':
                console.info("start handle destroyMediaSession content")
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'receiveScreenHangupRequest', content: message}))
                break
            case 'destroyMediaSessionRet':
                console.info("start handle destroyMediaSessionRet content")
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'localShareScreenHangup', content: message}))
                break;
            case 'detectMediaSession':
            case 'detectMediaSessionRet':
                console.info("start handle detectMediaSessionRet content")
                grpDialingApi.handleDetectMediaSession(JSON.stringify({cmd: 'handleMediaSession', content: message}))
                break
            case 'cancelRequest':
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'cancelRequest', content: message}))
                break;
            case 'cancelRequestRet':
                grpDialingApi.handleShareScreenRequest(JSON.stringify({cmd: 'cancelRequestRet', content: message}))
                break
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
        message.hasOwnProperty('destroyMediaSession') ||  message.hasOwnProperty('destroyMediaSessionRet') ||
        message.hasOwnProperty('detectMediaSession') ||  message.hasOwnProperty('detectMediaSessionRet') ||
        message.hasOwnProperty('cancelRequest') || message.hasOwnProperty('cancelRequestRet')
    ){
        for(let key in getAttributeArray){
            action = getAttributeArray[key]
            if(action.indexOf('MediaSession') > 0 || action.indexOf('cancel') >= 0){
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
                // console.log('The connection is open and ready to communicate.')
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
    clearTimeout(This.wsKeepAliveTimeProcessor)
    This.wsKeepAliveTimeProcessor = null
    This.wsReconnectCount = 0
    This.keepAliveWithoutResponse = 0
    This.wasWebsocketClosed = false
    This.isChannelOpen = true
    // grpDialingApi.socket = null
}

export { WebRTCSocketInstance }
