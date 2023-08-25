/**
 * Function that subscribes a listener to an event.
 * @method on
 * @param {String} eventName The event.
 * @param {Function} callback The listener.
 */
WebRTCSession.prototype.on = function (eventName, callback) {
    if (typeof callback === 'function') {
        this.EVENTS[eventName] = this.EVENTS[eventName] || []
        this.EVENTS[eventName].push(callback)
    } else {
        throw new Error('Provided parameter is not a function')
    }
}

/**
 * Function that unsubscribes listeners from an event.
 * @method off
 * @param {String} [eventName] The event.
 * - When not provided, all listeners to all events will be unsubscribed.
 * @param {Function} [callback] The listener to unsubscribe.
 * - When not provided, all listeners associated to the event will be unsubscribed.
 */
WebRTCSession.prototype.off = function (eventName, callback) {
    if (!(eventName && typeof eventName === 'string')) {
        this.EVENTS = {}
    } else {
        if (callback === undefined) {
            this.EVENTS[eventName] = []
            return
        }
        let arr = this.EVENTS[eventName] || []

        // unsubscribe events that is triggered always
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === callback) {
                arr.splice(i, 1)
                break
            }
        }
    }
}

/**
 * Function that triggers an event.
 * The rest of the parameters after the <code>eventName</code> parameter is considered as the event parameter payloads.
 * @method trigger
 */
WebRTCSession.prototype.trigger = function (eventName) {
    // convert the arguments into an array
    let args = Array.prototype.slice.call(arguments)
    let arr = this.EVENTS[eventName]
    args.shift() // Omit the first argument since it's the event name
    if (arr) {
        // for events subscribed forever
        for (let i = 0; i < arr.length; i++) {
            try {
                if (arr[i].apply(this, args) === false) {
                    break
                }
                this.EVENTS[eventName].shift()
            } catch (error) {
                throw error
            }
        }
    }
}

/**
 * 删除re-invite元素
 * @param data
 */
WebRTCSession.prototype.removeInviteAction = function (data){
    let This = this
    log.info('remote invite action ' + JSON.stringify(data, null, '    '))
    if(!data || !data.action){
        log.info('removeInviteAction: Invalid Argument');
        return;
    }

    if(This.sendInviteQueue.length > 0){
        for(let i = 0; i < This.sendInviteQueue.length; i++){
            if(This.sendInviteQueue[i].action === data.action) {
                This.sendInviteQueue.splice(i,1);
                log.info("sendInviteQueue length: " + This.sendInviteQueue.length + ', (' +  data.action + ')');
                break;
            }
        }

        if(This.sendInviteQueue.length > 0) {
            This.action = This.sendInviteQueue[0].action
            This.actionCallback = This.sendInviteQueue[0].callback
            log.info('prepare send invite ' + This.action)
            This.doOffer()
        }
    }else {
        log.info('removeInviteAction: remove already');
    }
}

/**
 * 获取或创建session
 * @param lineId
 * @returns
 */
WebRTCSession.prototype.getSessionInstance = function (lineId ) {
    log.info('get new session ' + lineId)
    if(!lineId){
        lineId = ++gsRTC.lineIdCount
    }

    log.info('get session instance of line (' + lineId + ')')

    log.warn('create new webRTC session ' + lineId)
    let session = new WebRTCSession(lineId)
    gsRTC.webrtcSessions.push(session)
    return session
}

/**
 * 查找session
 * @param data.key
 * @param data.value
 * @param data.role
 * @returns {unknown}
 */
WebRTCSession.prototype.getSession = function(data){
    log.info('get Session: ' + JSON.stringify(data, null, '    '))
    if(!gsRTC || !gsRTC.webrtcSessions || !gsRTC.webrtcSessions.length){
        return
    }
    if(!data || !data.key || !data.value){
        log.info('get session: invalid parameters: ' + JSON.stringify(data, null, '    '))
        return
    }
    // && item.role === data.role
    return gsRTC.webrtcSessions.find(item =>{return  (String(item[data.key]) === String(data.value))});
}

/** 处理发送和接收的消息体
 * @param sdp: 本端生成的sdp
 * ***/
WebRTCSession.prototype.localSendMessage = function (sdp) {
    let This = this
    let reqId = parseInt(Math.round(Math.random() * 100));
    let data ={
        line: This.lineId,
        mediaSession: sdp,
        shareType: This.shareType,
        action: This.action,
        reqId: This.reqId ? This.reqId: reqId
    }
    // if(data.type === gsRTC.SIGNAL_EVENT_TYPE.INVITE_RET){
    //     data.reqId = This.reqId
    // }
    if (This.isRecvRequest) {                                     // 表示接收端
        if (!This.isSendReInvite) {
            log.info('recv: Accept shareScreen of (' + This.lineId + ')')
            data.type = gsRTC.SIGNAL_EVENT_TYPE.INVITE_RET
            This.isRecvRequest = false
            This.isSendReInvite = true
        } else {
            log.warn('recv: send invite(' + This.lineId + ')')
            data.type =  gsRTC.SIGNAL_EVENT_TYPE.RE_INVITE_RET
            This.isRecvRequest = false
        }

    } else {                                                       // 表示发送端
        if (!This.isSendReInvite) {
            log.warn('send: send invite(' + This.lineId + ')')
            data.type = gsRTC.SIGNAL_EVENT_TYPE.INVITE
            This.isSendReInvite = true
        } else {
            log.warn('send: send sip re-invite(' + This.lineId + ')')
            data.type =   gsRTC.SIGNAL_EVENT_TYPE.RE_INVITE
        }
    }

    This.handleSendMessage(data)
}



/**
 * 对发送和接受的消息体进行处理，转换成以下格式
 * @param: message
 * let message = {
 *     local_line: int 型参数
 *     createMediaSessionRet: {
 *         sdp: {
 *             length: 552,
 *             data: ""
 *         },
 *         rspInfo: {
 *             rspCode: 200,
 *             rspMsg: "OK",
 *             showCode: 0
 *         },
 *         userName: "webRTC_Client",
 *         reqId: 26,
 *         line: 1,
 *         action: "stopShareScreen",
 *         shareType: "audioVideo"
 *     },
 *
 *     createMediaSession: {
 *         sdp: {
 *             length: 552,
 *             data: ""
 *         },
 *         reqId: 26,
 *         line: 1,
 *         action: "stopShareScreen",
 *         shareType: "audioVideo"
 *
 *     },
 *
 * }
 */

WebRTCSession.prototype.handleSendMessage = function (data) {
    let This = this
    let info = {
        action: data.action,
        line: data.line,
        shareType: data.shareType,
        reqId: data.reqId
    }
    let rspInfo = data.rspInfo
    if(data.mediaSession){
        info.sdp = {
            length: data.mediaSession.length,
            data: data.mediaSession,
        }
    }

    if(data.type.name === 'createMediaSession' || data.type.name === 'updateMediaSession'  || data.type.name === 'destroyMediaSession'){
        if(!data.isLocalDestroy){
            log.info('send present control message: \n' + JSON.stringify(info))
        }else{

            if(data.isLocalDestroy){
                info.isLocalDestroy = data.isLocalDestroy
            }
            log.info('send hangup control message: \n' + JSON.stringify(info))
        }

    }else if(data.type.name === 'createMediaSessionRet' || data.type.name === 'updateMediaSessionRet' || data.type.name === 'destroyMediaSessionRet'){
        if(!rspInfo){
            info.rspInfo = {
                rspCode: gsRTC.CODE_TYPE.ACTION_SUCCESS.codeType,
                rspMsg: gsRTC.CODE_TYPE.ACTION_SUCCESS.message
            }
        }else{
            info.rspInfo = rspInfo
        }
        info.localLineId = This.lineId
        info.remoteLineId = This.remoteLineId

        This.reqId = null
        log.info('send present response message: \n' + JSON.stringify(info))
    }

    let message = {}
    message[data.type.name] = info
    message['local_line'] = This.lineId
    log.info("handle sendMessage:" + JSON.stringify(message, null, '    '))

    if(!This.isSuccessUseWebsocket || This.isHandleDestroy){
        if(data.type.name === 'createMediaSession' || data.type.name === 'createMediaSessionRet'){
            log.warn("use websocket send message, createMediaSession/createMediaSessionRet:", This.localShare)
            gsRTC.trigger('localSDPCompleted', message, This.localShare)
            if(!This.localShare){
                if(This.action && This.actionCallback){
                    This.actionCallback({message: gsRTC.CODE_TYPE.ACTION_SUCCESS})
                }
            }
            This.isSuccessUseWebsocket = true
        }else if(data.type.name === 'destroyMediaSession' || data.type.name === 'destroyMediaSessionRet'){
            log.warn("use websocket send message, destroyMediaSession/destroyMediaSessionRet:", This.localShare)
            if(data && data.callback){
                data && data.callback ({codeType: gsRTC.CODE_TYPE.ACTION_SUCCESS.codeType, message: message})
            }
        }
    }else {
        if(data.type.name === 'destroyMediaSession' || data.type.name === 'destroyMediaSessionRet'){
            log.warn("use dataChannel send message, destroyMediaSession/destroyMediaSessionRet: isLocalDestroy " + data.isLocalDestroy)
            This.getCurrentDataChannelState(message)

            if(!data.isLocalDestroy){
                gsRTC.clearSession({lineId: This.lineId})
            }

            This.isHandleDestroy = true
            gsRTC.trigger('closeScreenTab',{lineId: This.lineId})
        }else if(data.type.name === 'updateMediaSession' || data.type.name === 'updateMediaSessionRet'){
            log.warn("use dataChannel send message, localShare:" + This.localShare + ", session.action: " + This.action)
            This.getCurrentDataChannelState(message)
            if(!This.localShare){
                if(This.action && This.actionCallback){
                    if(rspInfo){
                        This.actionCallback({message: {codeType: rspInfo.rspCode, message: rspInfo.rspMsg}})
                    }else{
                        This.actionCallback({message: gsRTC.CODE_TYPE.ACTION_SUCCESS})
                    }
                }
            }
        }
    }
}

/** 处理 dataChannel发送数据内容
 * **/

WebRTCSession.prototype.dataChannelSendMessage = function (data) {
    log.info('dataChannelSendMessage data: ' + JSON.stringify(data, null, '    '))
    if (!data || !data.lineId || !data.type) {
        log.info('invalid parameters!')
        data && data.callback && data.callback({message: "dataChannelSendMessage failed"})
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
    if (!session || !session.pc || !session.pc.dataChannel) {
        notice({type: 'warn', value: currentLocale['L76']})
        log.warn("dataChannelSendMessage: session is not found")
        return
    }
    session.getCurrentDataChannelState(data)
}