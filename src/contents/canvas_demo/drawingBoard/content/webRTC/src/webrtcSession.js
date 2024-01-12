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
    if(!window.gsRTC || !gsRTC.webrtcSessions || !gsRTC.webrtcSessions.length){
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

    if(!This.reqId && pageName === 'quicall'){
        This.reqId = reqId
    }
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
    if(sendText){
        info.fileInfo = {
            name: sendText.name,
            size: sendText.size
        }
    }
    let rspInfo = data.rspInfo
    if(data.mediaSession){
        info.sdp = {
            length: data.mediaSession.length,
            data: data.mediaSession,
        }
    }

    if(data.type.name === 'createMediaSession' || data.type.name === 'updateMediaSession'  || data.type.name === 'destroyMediaSession'){
        if(data.isLocalDestroy){
            info.isLocalDestroy = data.isLocalDestroy
        }
    }else if(data.type.name === 'createMediaSessionRet' || data.type.name === 'updateMediaSessionRet' || data.type.name === 'destroyMediaSessionRet'){
        info.rspInfo = rspInfo || {
            rspCode: gsRTC.CODE_TYPE.ACTION_SUCCESS.codeType,
            rspMsg: gsRTC.CODE_TYPE.ACTION_SUCCESS.message
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

    if(!This.isSuccessUseWebsocket){
        if(data.type.name === 'createMediaSession' || data.type.name === 'createMediaSessionRet'){
            log.warn("use websocket send message, createMediaSession/createMediaSessionRet:", This.localShare)
            if(pageName === 'shareScreen'){
                gsRTC.trigger('localSDPCompleted', message, This.localShare)
            }else if(pageName === 'quicall'){
                if(message.createMediaSessionRet){
                    message.createMediaSessionRet.shareType = 'shareFile'
                }
                gsRTC.trigger('quicallLocalSDPCompleted', message, This.localShare)
            }
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
        message['remote_line'] = This.remoteLineId
        if(data.type.name === 'destroyMediaSession' || data.type.name === 'destroyMediaSessionRet'){
            log.warn("use dataChannel send message, destroyMediaSession/destroyMediaSessionRet: isLocalDestroy " + data.isLocalDestroy)
            This.sendMessageByDataChannel(message)

        }else if(data.type.name === 'updateMediaSession' || data.type.name === 'updateMediaSessionRet'){
            log.warn("use dataChannel send message, localShare:" + This.localShare + ", session.action: " + This.action)
            This.sendMessageByDataChannel(message)
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

/**
 * 处理共享请求
 * @param message
 */
WebRTCSession.prototype.handleShareRequestMessage = function (message) {
    log.info('handle  receive dataChannel sdp')
    if (typeof message === 'string') {
        message = JSON.parse(message)
    }

    let data = gsRTC.parseMessageBody(message)
    if (Object.keys(data).length === 0) {
        log.warn("get current data is null")
        return
    }

    let content = data.message
    let type = data.type
    let lineId = content.line

    log.info("receive " + type + " message:" + JSON.stringify(message, null, '  '))

    let isExist = type.includes('createMediaSession')
    if (isExist) {
        gsRTC.createShareContentMessage({lineId: lineId, msg: message})
    } else {
        gsRTC.updateShareContentMessage({lineId: message['remote_line'], msg: message})
    }
}

/**
 * 处理文件内容
 * @param message
 * **/
WebRTCSession.prototype.handleFileContent = function(message) {
    if (pageName === 'quicall') {
        remoteShareInfo.lineId = message.lineId
        remoteShareInfo.shareType = 'shareFile'
    }

    let This = this
    switch (message.state) {
        case 'receive':
            log.info('remote consent')
            This.readFileToSend({lineId: This.lineId, content: sendText})
            break
        case 'reject':
            log.info('remote reject')
            switchSendStatus('reject')
            break
        case 'cancel':
            if (pageName === 'shareScreen') {
                notice({type: 'warn', value: currentLocale['L127']})
                fileCountDownTimer && countDownFile()
            } else if (pageName === 'quicall') {
                countDownTimer && countDown()
            }
            break
        case 'timeout':
            switchSendStatus('timeout')
            log.info('send timeout ' + sendText.name)
            let file = This.sendTimeoutFileList.find(item => {
                return item.name === sendText.name
            })
            if (!file) {
                This.sendTimeoutFileList.push({
                    name: sendText.name,
                    size: sendText.size,
                    content: sendText
                })
            }
            break
        case 'resend':
            log.info('resend file ' + message.content.name)
            for (let i in This.sendTimeoutFileList) {
                if (message.content.name === This.sendTimeoutFileList[i].name) {
                    This.readFileToSend({
                        lineId: This.lineId,
                        content: This.sendTimeoutFileList[i].content
                    })
                } else {
                    // 本地没有这个文件需要重新选择
                }
            }
            break
        case 'removeFile':
            log.info('remove file ' + message.content.name)
            for (let i in This.sendTimeoutFileList) {
                if (message.content.name === This.sendTimeoutFileList[i].name) {
                    This.sendTimeoutFileList.splice(i, 1)
                } else {
                    // 本地没有这个文件需要重新选择
                }
            }
            break
        default:
            This.fileSize = message.size
            This.fileName = message.name
            This.receiveBuffer = []
            This.receivedSize = 0
            log.info("Receive the presentation, whether to accept the presentation")
            let data = {
                lineId: message.lineId,
                fileName: This.fileName,
                fileSize: This.fileSize
            }

            if (pageName === 'shareScreen') {
                gsRTC.trigger('shareScreenFileConfirmPopup', data)
            } else if (pageName === 'quicall' && message.popup) {
                gsRTC.trigger('quicallFileConfirmPopup', data)
            }
            break
    }
 }

/**
 * 告知其他线路删除会议列成员
 * @param data.account 成员信息
 ***/
WebRTCSession.prototype.updateMemberList = function(data){

    //查看当前其他线路
    let sessions = gsRTC.webrtcSessions.filter((item)=>item.lineId !== this.lineId)

    if(sessions.length){
        for(let session of sessions){
            let param ={
                type: 'updateMemberList',
                lineContent:{local: session.lineId, remote: session.remoteLineId},
                account: data.account
            }
            session.sendMessageByDataChannel(param)
        }
    }
}