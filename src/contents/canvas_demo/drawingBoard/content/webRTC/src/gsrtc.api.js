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
 * @param data.conf  当前线路是否是会议状态： 1（是） 0（否）
 * @param data.stream 演示流
 * @param data.shareType  共享类型（audio仅桌面音频、video仅桌面视频、audiovideo桌面音视频）
 * @param data.callback  回调
 */
GsRTC.prototype.screenShare = function (data = {}){
    let This = this
    log.info('share screen data: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.info('invalid parameters!')
        data && data.callback && data.callback({message: "screenShare failed"})
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
    if(!session){
        session = WebRTCSession.prototype.getSessionInstance(data.lineId)
    }

    let type = 'slides'
    let action = 'shareScreen'

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
            session.setEncodingParameters(type)
        }

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
            gsRTC.setStreamInactiveEvent({ lineId: data.lineId, stream: stream})

            session.shareType = data.shareType || 'audio' // 默认仅共享音频
            session.action = action
            session.localShare = data.localShare || true   // 默认是本地开启共享
            session.conf = data.conf
            session.actionCallback = shareScreenCallback
            session.createRTCSession(type,stream)
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
            session.setStream(evt.stream, type, true)
            session.setEncodingParameters(type)
        }else {
            log.warn('present switch failed')
        }
        data.callback && data.callback({ lineId: session.lineId, peerAccount: session.peerAccount, codeType: evt.codeType, stream: stream})
    }

    function getMediaCallBack(event) {
        if (event.stream) {
            stream = event.stream
            gsRTC.setStreamInactiveEvent({ lineId: data.lineId, stream: stream})
            let preSlidesStream = session.getStream(type, true)
            if (preSlidesStream) {
                log.info('clear pre slides stream')
                session.processRemoveStream(preSlidesStream, pc, type)
                session.closeStream(preSlidesStream)
            }
            session.processAddStream(stream, pc, type)
            switchScreenSourceCallback({codeType:This.CODE_TYPE.ACTION_SUCCESS.codeType, stream: stream})
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
 * 监听流的结束，如点击共享条结束共享
 * @param data
 */
GsRTC.prototype.setStreamInactiveEvent = function(data){
    log.info('click shareBar: ' + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId || !data.stream){
        log.info('set stream inactive event: invalid parameters!')
        return
    }
    let This = this
    let stream = data.stream
    let stopCallback = function(){
        log.info("click bar: stopShareScreen")
        gsRTC.trigger("stopShareScreen")
    }
    let streamOnInactive = function (){
        log.warn('user clicks the bottom share bar to stop sharing')
        log.warn('stream inactive, stop screen share.')
        This.stopScreenShare({ lineId: data.lineId, isInitiativeStopScreen: true, callback: stopCallback})
    }
    if (This.getBrowserDetail().browser === 'firefox') {
        let tracks = stream.getVideoTracks();
        tracks[0].onended = streamOnInactive
    }else {
        stream.oninactive = streamOnInactive
    }
}

/**
 * 暂停屏幕共享
 * @param data.isMute：true 暂停，false 取消暂停
 * @param data.lineId: 1 , 表示当前线路
 * @param data.callback
 */
GsRTC.prototype.pauseScreenShare = function(data){
    log.info("pause screen data: " + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.info('pause screen: invalid parameters')
        data && data.callback && data.callback({message: "accept screenShare failed"})
        return
    }
    let This = this
    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.info('pause screen: no session is found')
        return
    }

    if(!This.screenSharing){
        log.info('pause screen: no session is found')
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

    let type = 'slides'
    let action = 'stopShareScreen'
    let dataChannel = session.pc.dataChannel
    let stream = session.getStream(type, true)

    session.isInitiativeStopScreen = data.isInitiativeStopScreen
    let stopShareScreenCallback = function (evt){
        log.warn('stop share Screen callback data: ' + JSON.stringify(evt, null, '   '))
        if(evt.message.codeType !== This.CODE_TYPE.ACTION_SUCCESS.codeType){
            log.info('stopShare failed, clear session')
        }else {
            session.localShare = false
            This.screenSharing = false

            // 销毁窗口以及添加提示内容
            if(session.action === 'stopShareScreen'){
                let param = {
                    type: gsRTC.SIGNAL_EVENT_TYPE.BYE,
                    action: session.action,
                    line: session.lineId,
                    shareType: session.shareType,
                    reqId: parseInt(Math.round(Math.random() * 100)),
                    isLocalDestroy: true
                }
                session.handleSendMessage(param)
            }

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
        session.action = action
        session.actionCallback = stopShareScreenCallback
        session.processRemoveStream(stream, session.pc, type)
        session.doOffer()
    }
}

/**
 * 接受对端桌面共享请求
 * @param data.sdp  offer 端生成的sdp
 * @param data.action  当前动作类型（开启演示、关闭演示）
 * @param data.lineId 线路line，即本终端线路对应的lineId
 * @param data.remoteLineId 当前终端线路匹配的对端线路Id
 * @param data.reqId  事务reqId   必选
 * @param data.localShare  本地是否开共享  可选
 * @param data.conf    当前线路状态是否是会议模式 1（是） 0（否）
 * @param data.isUpdate  true 表示当前使用updateMediasession, 否则表示当前使用的是createMediaSession
 * @param data.shareType  开启演示类型（audio,video,audioVideo）
 * @param data.account   当前线路的id 和 name
 * @param data.callback  回调
 *
 */
GsRTC.prototype.acceptScreenShare = function(data){
    log.info("handle accept data: " + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId || !data.reqId){
        log.info('sipAccept: invalid parameters')
        data && data.callback && data.callback({message: "accept screenShare failed"})
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
    if(!session){
        session = WebRTCSession.prototype.getSessionInstance(data.lineId)
    }
    let action = 'sipAccept'
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

    session.shareType = data.shareType
    session.isRecvRequest = true
    session.localShare = data.localShare || false   // 默认是本地未开启共享
    session.action = action
    session.remoteShare = true
    session.reqId = data.reqId
    session.conf = data.conf
    session.account = data.account
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
 * 线路hold / unhold 切换
 * @param data.type   hold / unhold
 * @param data.lineId
 * @param data.callback
 */
GsRTC.prototype.lineHold = function(data){
    log.info('line hold data: ' + JSON.stringify(data, null, '    '))
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
                    gsRTC.pauseScreenShare({isMute: true, lineId: data.lineId})
                    gsRTC.trigger("holdStatus", {type: 'localHold' , localHold: session.isLocalHold, remoteHold: session.isRemoteHold})
                    gsRTC.isPausePainting({lineId: data.lineId})
                }
            } else{
                param.type = 'localHoldLine'
            }
            session.sendMessageByDataChannel(param)
            break
        case 'unHold':
            session.isLocalHold = false
            if(session.localShare){
                param.type = 'remoteUnHoldLine'
                if(session.isMute && !session.isRemoteHold){
                    gsRTC.pauseScreenShare({isMute: false, lineId: data.lineId})
                    gsRTC.isPausePainting({lineId: data.lineId})
                }
            } else{
                param.type = 'localUnHoldLine'
            }
            session.sendMessageByDataChannel(param)
            break
        default:
            log.info("get current type: " + data.type)
    }
}

/**
 * 创建仅包含dataChannel的 PC
 * @param data
 * {
 *     lineId: 1,
 *     localShare: true,
 *     shareType: 'shareFile'
 * }
 */
GsRTC.prototype.createSessionWithChannelOnly = function(data){
    log.info('create new data channel params:', data)
    let This = this
    This.action = 'dataChannel'
    log.info('dataChannel data: ' + JSON.stringify(data, null, '    '))
    if(!data.lineId){
        log.info('invalid parameters!')
        data && data.callback && data.callback({message: "dataChannel failed"})
        return
    }

    let session = WebRTCSession.prototype.getSessionInstance(data.lineId)
    let shareFileCallback = function (evt){
        log.warn('share file callback data: ' + JSON.stringify(evt, null, '   '))
        if(evt.message.codeType !== This.CODE_TYPE.ACTION_SUCCESS.codeType){
            log.info('dataChannel failed')
        }else {
            session.action = null
            session.actionCallback = null
            session.isSuccessUseWebsocket = true
            This.fileSharing = true
        }

        if(data.callback){
            data.callback(evt)
        }else {
            // 接口没有callback回调时，使用注册事件返回结果
            This.trigger(This.action, {type: This.action, message: { message: evt.message.message,  codeType:evt.message.codeType} })
        }
        This.action = null
    }

    // 创建Session
    session.shareType = data.shareType
    session.action = This.action
    session.actionCallback = shareFileCallback

    session.pc = session.createPeerConnection({})
    session.createSendDataChannel()
    session.doOffer(true)
}

/**
 * 针对未开启桌面共享场景下，直接在popup通话页面接收共享文件
 * @param data.content：文件内容
 * @param data.lineId: 1 , 表示当前线路
 * @param data.callback
 * @param data.reqId
 * @param data.remoteLineId
 * @param data.action
 * @param data.sdp
 */
GsRTC.prototype.acceptShareFile = function(data){
    log.info("file accept data: " + JSON.stringify(data, null, '    '))
    if(!data || !data.lineId){
        log.info('file accept: invalid parameters')
        data && data.callback && data.callback({message: "accept screenShare failed"})
        return
    }
    let session = WebRTCSession.prototype.getSessionInstance(peerInfoMessage.localLineId)
    function fileAcceptCallBack(event){
        event.lineId = session.lineId
        log.info('file accept callback data:' + JSON.stringify(event, null, '    '))
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

    session.isRecvRequest = true
    session.remoteShare = true
    session.reqId = data.reqId
    session.actionCallback = fileAcceptCallBack
    session.remoteLineId = data.remoteLineId
    session.action =  data.action

    let sdp = data.sdp
    if(sdp){
        session.handleServerRequestSdp(sdp)
    }else {
        log.warn('file accept: no sdp found')
    }
}

/**
 * 针对当前是hold场景告知对端  canvas不能绘制
 * **/
GsRTC.prototype.isPausePainting = function (data) {
    log.info("isPausePainting:", data?.lineId)
    if(!data || !data.lineId){
        log.info('isPausePainting: invalid parameters!')
        return
    }

    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: data.lineId })
    if(!session){
        log.warn("current isPausePainting: no session")
        return
    }

    can.pausePainting = session.isLocalHold || session.isRemoteHold  ? true: false

    if(can.pausePainting){
        document.body.style.cursor = 'not-allowed'
    }else{
        document.body.style.cursor = 'default'
    }
    session.sendMessageByDataChannel({
        type: 'pausePainting',
        lineId: session.remoteLineId,
        pause: can.pausePainting,
        account: session.account
    })

}
