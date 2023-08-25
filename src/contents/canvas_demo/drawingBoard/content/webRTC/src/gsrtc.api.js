/**
 * GsRTC init
 */
window.addEventListener('load', function () {
    log.info('window onload!')
    if(!window.gsRTC){
        log.info('init...')
        GsRTC.prototype.preInit()
    }
})

/**
 * 开演示
 * @param data.constraints 取流参数， 可选
 * @param data.lineId 线路line
 * @param data.localShare 当前是否开启演示 可选
 * @param data.stream 演示流
 * @param data.shareType  共享类型（audio仅桌面音频、video仅桌面视频、audiovideo桌面音视频）
 * @param data.callback  回调
 */
GsRTC.prototype.screenShare = function (data = {}){
    let This = this
    This.action = 'shareScreen'
    log.info('share screen data: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.info('invalid parameters!')
        data && data.callback && data.callback({message: "screenShare failed"})
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
    let type = 'slides'
    if(!session){
        notice({ type: 'warn', value: currentLocale['L76']})
        log.warn("screenShare: session is not found")
        return
    }

    if(This.screenSharing){
        notice({type: 'info',  value: currentLocale['L74']})
        log.info("current open shareScreen")
        return
    }
    This.sharingPermission = 1

    let shareScreenCallback = function (evt){
        log.warn('share screen callback data: ' + JSON.stringify(evt, null, '   '))
        if(evt.message.codeType !== This.CODE_TYPE.ACTION_SUCCESS.codeType){
            log.info('share failed, clear session')
            This.clearSession({ lineId: session.lineId })
        }else {
            session.action = null
            session.actionCallback = null
            session.isSuccessUseWebsocket = true
            This.screenSharing = true
        }

        This.action = null
        if(data.callback ){
            data.callback(evt)
        }else {
            // 接口没有callback回调时，使用注册事件返回结果
            This.trigger(This.action, {type: This.action, message: { message: evt.message.message,  codeType:evt.message.codeType} })
        }

    }

    // 创建Session
    let getMediaCallBack = function (event){
        if (event.stream){
            let stream = event.stream
            log.info('get stream success, ' + event.stream.id)

            session.setStream(stream, type, true)
            session.localShare = true
            gsRTC.clickShareBar({ lineId: data.lineId, stream: stream})

            session.shareType = data.shareType || 'audio' // 默认仅共享音频
            session.action = This.action
            session.localShare = data.localShare === true ? data.localShare : true
            session.actionCallback = shareScreenCallback
            session.createRTCSession(type)
        }else {
            log.warn('Get present stream failed: ' + event.error)
            let codeType = WebRTCSession.prototype.getGumErrorCode('slides', event.error.name)
            shareScreenCallback({ message: codeType })
        }
    }

    // 取流
    if(data.stream){
        getMediaCallBack({stream: data.stream})
    }else {
        let param = {
            streamType: 'screenShare',
            constraints: {
                audio: false /*|| data.shareType.indexOf('audio') >= 0 */,
                video: {
                    width: 1920,
                    height: 1080,
                    framerate: 15
                }
            },
            callback: getMediaCallBack
        }
        session.getStreamFromDevice(param)
    }
}

/** 切换共享源
 * */
GsRTC.prototype.switchScreenSource = function (data) {
    let This = this
    log.info('switch screen source:' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId) {
        log.info('invalid parameters to switchScreen Source: ' + JSON.stringify(data, null, '    '))
        data && data.callback && data.callback({message: 'switch shareScreen failed'})
        return
    }

    let type = 'slides'
    let stream
    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.warn('switchScreenSource: no session found, lineId: ' + data.lineId)
        return
    }

    let pc = session.pc
    let switchScreenSourceCallback = function(evt){
        log.info('switch screen data: ' + JSON.stringify(evt, null, '    '))
        if(evt.codeType === 200){
            log.info('present switch success')
            session.setStream(stream, type, true)
            // session.setEncodingParameters(type)
        }else {
            log.warn('present switch failed')
        }
        data.callback && data.callback({ lineId: session.lineId, peerAccount: session.peerAccount, codeType: evt.codeType, stream: stream})
    }

    function getMediaCallBack(event) {
        if (event.stream) {
            stream = event.stream
            gsRTC.clickShareBar({ lineId: data.lineId, stream: stream})
            let preSlidesStream = session.getStream(type, true)
            if (preSlidesStream) {
                log.info('clear pre slides stream')
                session.processRemoveStream(preSlidesStream, pc, type)
            }
            session.processAddStream(stream, pc, type)
            switchScreenSourceCallback(This.CODE_TYPE.ACTION_SUCCESS)
        } else {
            log.warn(event.error.toString())
            switchScreenSourceCallback({codeType: WebRTCSession.prototype.getGumErrorCode('slides', event.error.name)})
        }
    }
    if(data.stream){
        getMediaCallBack({stream: data.stream})
    }else{
        let param = {
            streamType: 'screenShare',
            constraints: {
                audio: false /*|| data.shareType.indexOf('audio') >= 0 */,
                video: {
                    width: 1920,
                    height: 1080,
                    framerate: 15
                }
            },
            callback: getMediaCallBack
        }
        session.getStreamFromDevice(param)
    }
}

/**
 * 停止桌面共享
 * @param data
 */
GsRTC.prototype.stopScreenShare = function (data = {}){
    log.info('stop screen: ' +  JSON.stringify(data, null, '    '))
    let This = this

    if(!data || !data.lineId){
        log.info("stopScreenShare: invalid parameters")
        return
    }
    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.info("stopScreenShare: no session is found")
        data && data.callback ?  data && data.callback({ message: This.CODE_TYPE.ACTION_FAILED}): null;
        return
     }
    if(!This.screenSharing){
        log.info("current no open shareScreen")
        gsRTC.trigger('closeScreenTab',{lineId: data.lineId})
        return
    }
    This.action = 'stopShareScreen'
    session.isInitiativeStopScreen = data.isInitiativeStopScreen
    let type = 'slides'
    let dataChannel = session.pc.dataChannel
    let stream = session.getStream(type, true)

    let stopShareScreenCallback = function (evt){
        log.warn('stop share Screen callback data: ' + JSON.stringify(evt, null, '   '))
        if(evt.message.codeType !== This.CODE_TYPE.ACTION_SUCCESS.codeType){
            log.info('stopShare failed, clear session')
        }else {
            session.localShare = false
            This.screenSharing = false
            gsRTC.closeShareWindow({lineId: session.lineId, action: session.action})
            session.action = null
            session.actionCallback = null
        }
        session.isInitiativeStopScreen = false
        session.isSuccessUseWebsocket = true
        This.action = null
        let stream = session.getStream(type, true)
        if (stream) {
            log.warn('clear slides stream.')
            session.setStream(null, type, true)
        }

        if(data.callback){
            data.callback(evt)
        }else {
            // 接口没有callback回调时，使用注册事件返回结果
            This.trigger(This.action, {type: This.action, message: { message: evt.message.message,  codeType:evt.message.codeType} })
        }
    }
    if (dataChannel){
        session.isInviteBeingProcessed = false
        session.action = This.action
        session.actionCallback = stopShareScreenCallback
        session.processRemoveStream(stream, session.pc, type)
        session.doOffer()
    }
}

/**
 * 接受演示
 * @param data.sdp  offer 端生成的sdp
 * @param data.action  当前动作类型（开启演示、关闭演示）
 * @param data.lineId 线路line，即本终端线路对应的lineId
 * @param data.remoteLineId 当前终端线路匹配的对端线路Id
 * @param data.reqId  事务reqId   必选
 * @param data.isUpdate  true 表示当前使用updateMediasession, 否则表示当前使用的是createMediaSession
 * @param data.shareType  开启演示类型（audio,video,audioVideo）
 * @param data.callback  回调
 *
 */

GsRTC.prototype.handleAccept = function(data){
    let This = this
    log.info("handleAccept data: " + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.info('sipAccept: invalid parameters')
        data && data.callback && data.callback({message: "accept screenShare failed"})
        return
    }
    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.info('sipAccept: no session is found')
        return
    }

    async function sipAcceptCallBack(event){
        event.lineId = session.lineId
        log.info('call accept data ' + JSON.stringify(event, null, '    '))
        if(event.message.codeType === gsRTC.CODE_TYPE.ACTION_SUCCESS.codeType){
            log.info(session.action + " success")
        }else{
            log.info(session.action + " Failed")
        }
        session.actionCallback = null
        session.action = null
        session.reqId = null
        data.callback && data.callback(event)
    }

    // session.isIncomingCall = true
    session.shareType = data.shareType
    session.isRecvRequest = true
    session.localShare = data.localShare
    session.remoteShare = true
    session.reqId = data.reqId
    session.actionCallback = sipAcceptCallBack
    if(!data.isUpdate){
        session.remoteLineId = data.remoteLineId
        session.action =  data.action || 'sipAccept'
    }else{
        session.localShare = data.localShare
        session.action = data.action
    }

    let sdp = data.sdp
    if(sdp){
        session.handleServerRequestSdp(sdp)
    }else {
        log.warn('sipAccept: no sdp found')
    }
}

/**
 * 暂停屏幕共享
 * @param data.isMute：true 暂停，false 取消暂停
 * @param data.lineId: 1 , 表示当前线路
 * @param data.callback
 */
GsRTC.prototype.pauseScreen = function(data){
    log.info("pauseScreen data: " + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.info('pauseScreen: invalid parameters')
        data && data.callback && data.callback({message: "accept screenShare failed"})
        return
    }
    let This = this
    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.info('pauseScreen: no session is found')
        return
    }

    if(!This.screenSharing){
        log.info('pauseScreen: no session is found')
        return
    }

    let type = 'slides'
    let stream = session.getStream(type, true)
    log.info('pause present stream')
    session.streamMuteSwitch({type: type, stream: stream, mute: data.isMute})
    if(data.callback){
        data.callback({message: 'pausePresent success'})
    }
}

GsRTC.prototype.dataChannel = function(data){
    let This = this
    This.action = 'dataChannel'
    log.info('dataChannel data: ' + JSON.stringify(data, null, '    '))
    if(!data.lineId){
        log.info('invalid parameters!')
        data && data.callback && data.callback({message: "dataChannel failed"})
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
    if(!session){
        notice({type: 'warn',value: currentLocale['L76'] })
        log.warn("dataChannel: session is not found")
        return
    }

    if(This.fileSharing){
        notice({ type: 'info', value: currentLocale['L74'] })
        log.info("currently sharing")
        return
    }

    let shareScreenCallback = function (evt){
        log.warn('share screen callback data: ' + JSON.stringify(evt, null, '   '))
        if(evt.message.codeType !== This.CODE_TYPE.ACTION_SUCCESS.codeType){
            log.info('dataChannel failed')
        }else {
            session.action = null
            session.actionCallback = null
            session.isSuccessUseWebsocket = true
            This.fileSharing = true
        }

        This.action = null
        if(data.callback ){
            data.callback(evt)
        }else {
            // 接口没有callback回调时，使用注册事件返回结果
            This.trigger(This.action, {type: This.action, message: { message: evt.message.message,  codeType:evt.message.codeType} })
        }

    }

    // 创建Session
    session.shareType = data.shareType
    session.action = This.action
    session.localShare = data.localShare === true ? data.localShare : true
    if(!session.isSuccessUseWebsocket){
        session.actionCallback = shareScreenCallback
        session.createRTCSession()
    }else{
        session.dataChannelSendMessage(data)
    }
}

/** hold 线路
 * */
GsRTC.prototype.holdStream = function(data){
    log.info('holdLine: ' + JSON.stringify(data, null, '    '))
    if (!data || !data.lineId ) {
        log.info('hold invalid parameters!')
        data && data.callback && data.callback({message: "holdLine failed"})
        return
    }

    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if (!session) {
        log.warn("holdLine:no session")
        return
    }
    let param = {  lineId: session.remoteLineId }

    switch(data.type){
        case 'hold':
            session.isLocalHold = true
            if(session.localShare){
                param.type = 'remoteHoldLine'
                if(!session.isMute && !session.isRemoteHold){
                    gsRTC.pauseScreen({isMute: true, lineId: data.lineId})
                    gsRTC.trigger("holdStatus", {type: 'localHold' , localHold: session.isLocalHold, remoteHold: session.isRemoteHold})
                }
            } else{
                param.type = 'localHoldLine'
            }
            session.dataChannelSendMessage(param)
            break
        case 'unHold':
            session.isLocalHold = false
            if(session.localShare){
                param.type = 'remoteUnHoldLine'
                if(session.isMute && !session.isRemoteHold){
                    gsRTC.pauseScreen({isMute: false, lineId: data.lineId})
                }
            } else{
                param.type = 'localUnHoldLine'
            }
            session.dataChannelSendMessage(param)
            break
        default:
            log.info("get current type: " + data.type)
    }
}

/**
 * 发送文件
 * @param data.content：文件内容
 * @param data.lineId: 1 , 表示当前线路
 */
GsRTC.prototype.sendFile = function(data){
    log.info('send file')
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
    if(!session){
        log.warn("screenShare: session is not found")
        return
    }
    if(data.type){
        session.pc.dataChannel.send(JSON.stringify(data))
    }else{
        let file = data.content
        let chunkSize = 16384
        fileReader = new FileReader()
        let offset = 0
        fileReader.addEventListener('error', error => log.error('Error reading file:', error))
        fileReader.addEventListener('abort', event => log.info('File reading aborted:', event))
        fileReader.addEventListener('load', e => {
            try {
                session.pc.dataChannel.send(e.target.result)
                offset += e.target.result.byteLength
                progress.value = offset
                schedule.textContent = (offset/file.size*100).toFixed() + '%'
            if (offset < file.size) {
                readSlice(offset)
            }else if(offset === file.size){
                console.log('send success')
                switchSendstatus('success')
            }
            }catch(e){
                console.log('send fail')
                notice({ type: 'warn', value: currentLocale['L129']})
                switchSendstatus('fail')
            }
        })
        let readSlice = o => {
            let slice = file.slice(offset, o + chunkSize)
            fileReader.readAsArrayBuffer(slice)
        }
        readSlice(0)
    }
}