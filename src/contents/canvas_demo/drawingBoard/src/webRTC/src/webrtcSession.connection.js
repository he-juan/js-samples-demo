
/**
 * Decorate local sdp
 * @returns {string}
 */
WebRTCSession.prototype.getLocalSDP = function () {
    let This = this
    log.warn('decorate local sdp')

    let sdp = This.pc.localDescription.sdp
    let parsedSdp = SDPTools.parseSDP(sdp)

    // set max-compat bundle group
    if(This.bundlePolicy === 'max-compat'){
        SDPTools.setBundleMaxCompat(parsedSdp)
    }
    SDPTools.setMediaContentType(parsedSdp, ['slides','main'])

    // delete codec
    This.trimCodec(parsedSdp)

    // Save the session version, plus one for each re-invite
    SDPTools.increaseSessionVersion(parsedSdp)
    // Save the mid of your three media lines
    This.saveOwnMediasMid(parsedSdp)

    parsedSdp.groups[0].mids = ''
    // Set fingerprint/icePwd/iceUfrag to session level
    parsedSdp.fingerprint = parsedSdp.fingerprint || parsedSdp.media[0].fingerprint
    parsedSdp.icePwd = parsedSdp.icePwd || parsedSdp.media[0].icePwd
    parsedSdp.iceUfrag = parsedSdp.iceUfrag || parsedSdp.media[0].iceUfrag
    parsedSdp.setup =  parsedSdp.setup || parsedSdp.media[0].setup


    let trickleIce = GsRTC.prototype.getConfFromLocalStorage('trickle_ice')
    if(trickleIce === 'true'){
        parsedSdp.iceOptions = parsedSdp.iceOptions || parsedSdp.media[0].iceOptions
    }

    for (let i = 0; i < parsedSdp.media.length; i++) {
        let media = parsedSdp.media[i]
        delete media.fingerprint
        delete media.icePwd
        delete media.iceUfrag
        delete media.setup

        // todo: When the port sent to UCM is 0, UCM will not send stream
        if(parseInt(media.port) === 0){
            media.port = 9
        }

        if(!parsedSdp.groups[0].mids){
            parsedSdp.groups[0].mids = parsedSdp.groups[0].mids + media.mid
        }else {
            parsedSdp.groups[0].mids = parsedSdp.groups[0].mids + ' ' + media.mid
        }

        if(trickleIce === 'true' && media.endOfCandidates){
            delete media.endOfCandidates
        }
        if(media.iceOptions){
            delete media.iceOptions
        }

        if(media.type === 'audio'){
            if(This.action === 'stopShareScreen'){
                media.direction = 'inactive'
            }
        }else if(media.type === 'video'){
            if(This.action === 'stopShareScreen'){
                media.direction = 'inactive'
            }else if(This.action ==='shareScreen'){
                 if(!This.isRecvRequest){
                     media.direction = 'sendonly'
                 }else{
                     media.direction = 'recvonly'
                 }
            }

        }else if(media.type === 'application'){

        }

    }

    sdp = SDPTools.writeSDP(parsedSdp)
    return sdp
}

/**
 * modified sdp before setRemote
 * @param sdp: 只包含自己的三个媒体行SDP
 * @returns {*}
 */
WebRTCSession.prototype.getDecorateRo = function (sdp) {
    let This = this
    // delete reserved payload for audio
    sdp = This.removeReservedPayloads(sdp, 'audio', [2])
    let parsedSdp = SDPTools.parseSDP(sdp)
    // set remote profile-level-id to 42e0xx
    This.modifyRemoteProfileLevelId(parsedSdp)
    This.saveOwnMediasMid(parsedSdp)

    parsedSdp.setup = parsedSdp.setup || parsedSdp.media[0].setup

    for(let i = 0; i < parsedSdp.media.length; i++){
        let media = parsedSdp.media[i]
        // todo: Answerer must use either active or passive value for setup attribute.
        // media.setup = 'passive'
        delete media.setup

        if(media.type === 'audio'){

        }else if(media.type === 'video'){
            if(media.direction === 'inactive'){
                let type
                if(This.isRecvRequest){
                    type = false
                }else{
                    type = true
                }
                let stream = This.getStream('slides', type)
                if(stream){
                    log.info('clear local slides stream')
                    This.setStream(null, 'slides', type)
                }
            }
        }else if(media.type === 'application'){

        }
    }

    sdp = SDPTools.writeSDP(parsedSdp)
    return sdp
}

/**
 *  deal with sdp and pc.signalingState: stable ----> have-local-offer  ------> stable
 * @param sdp
 */
WebRTCSession.prototype.updateRemoteSdp =  async function (sdp){
    log.info('update remote sdp')
    let This = this
    if (!sdp) {
        log.error('handle TemporaryTone process Sdp: Invalid Argument')
        return
    }
    if(!This || !This.pc){
        log.warn('pc is not exist')
        return
    }
    sdp = This.getDecorateRo(sdp)

    if(sdp){
        try{
            log.info('onSignalingStateChange type: ' + This.pc.type + ', signalingState: ' + This.pc.signalingState)
            let offer = await This.pc.createOffer();
            offer.sdp = This.addUsedtx(offer.sdp, 'opus')
            offer.sdp = This.setSessionLevelMediaLine(offer.sdp)
            await This.pc.setLocalDescription(offer)
            log.info('updateRemoteSdp set local sdp:\r\n' + offer.sdp)
            let desc = new window.RTCSessionDescription({type: 'answer', sdp: sdp})
            await This.pc.setRemoteDescription(desc)
            log.info('updateRemoteSdp set remote sdp:\r\n' + sdp)
            if(This.actionCallback && This.action){
                log.info('Call callback')
                This.actionCallback({codeType: gsRTC.CODE_TYPE.ACTION_SUCCESS})
            }
            if( This.isExist183Process === true){
                This.isExist183Process = false
            }
        }catch(error){
            log.error('handle TemporaryTone process sdp error: ' + error.name)
            log.error('handle TemporaryTone process sdp error: ' + error.message)
        }
    }else{
        log.warn('no sdp to process')
    }
}

/**
 * decorate server response sdp
 * @param sdp
 */
WebRTCSession.prototype.handleServerResponseSdp = async function (sdp) {
    log.info('handle Server Response Sdp: ', sdp)
    let This = this
    if (!sdp) {
        log.error('handle Server Response Sdp: Invalid Argument')
        return
    }
    if(!This || !This.pc){
        log.warn('pc is not exist')
        return
    }
    sdp = This.getDecorateRo(sdp)

    if(sdp) {
        try {
            log.info('setRemoteDescription')
            log.info('onSignalingStateChange type: ' + This.pc.type + ', signalingState: ' + This.pc.signalingState)
            if (This.pc.signalingState !== 'have-local-offer') {
                log.warn('handleServerResponseSdp: Called in wrong state ' + This.pc.signalingState)
                return
            }

            log.info(`Server Response setRemoteDescription sdp: ` + ` \n${sdp}`)
            let desc = new window.RTCSessionDescription({ type: 'answer', sdp: sdp })
            await This.pc.setRemoteDescription(desc)
            This.setRemoteDescriptionSuccess(This.pc)
        } catch (e) {
            This.onSetRemoteDescriptionError(e)
        }
    }else {
        log.warn('ServerResponse: no sdp to process')
    }
}

/**
 * decorate server request sdp, Include outbound calls and re-invite received
 * @param sdp
 * @returns {Promise<void>}
 */
WebRTCSession.prototype.handleServerRequestSdp = async function (sdp) {
    log.info('handle server request sdp ')
    let This = this
    if (!This.pc) {
        log.info('createPeerConnection')
        This.pc = This.createPeerConnection(gsRTC.conf, This.callType)
    }
    if(!sdp){
        log.error('sdp is empty ...')
        return
    }
    sdp = This.getDecorateRo(sdp)

    if(sdp) {
        try {
            let pc = This.pc
            log.info('handle setRemoteDescription')
            log.info(`Server request setRemoteDescription sdp: ` + ` \n${sdp}`)
            let desc = new window.RTCSessionDescription({type: 'offer', sdp: sdp})
            await pc.setRemoteDescription(desc)
            This.setRemoteDescriptionSuccess(pc)

            await This.doAnswer()
            This.remotePendingSdp = ''
        } catch (e) {
            This.onSetRemoteDescriptionError(e)
        }
    }else {
        log.warn('ServerRequest: no sdp to process')
    }
}


/***
 * 解析消息体:Parse message body
 *@param message 消息体
 *@return
 */
WebRTCSession.prototype.parseMessageBody = function(message){
    log.info('WebRTCSession: parse message body')

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
 * handle receive dataChannel Message
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
WebRTCSession.prototype.handleDataChannelMessage = function(message){
    log.info('handle  receive dataChannel sdp ')
    if(typeof message === 'string'){
        message = JSON.parse(message)
    }

    let This = this
    let lineId
    if(message.type){
        lineId = message.lineId
        let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: lineId })
        if(!session){
            log.info( message.type + ': no session is found')
            return
        }
        let stream = This.getStream("slides", true)
        switch(message.type){
            case 'localHoldLine':
                session.isRemoteHold = true
                if(!session.isMute && !session.isLocalHold){
                    session.streamMuteSwitch({type: 'slides', stream: stream, mute: true})
                    gsRTC.trigger("holdStatus", {type: message.type , localHold: session.isLocalHold, remoteHold: session.isRemoteHold})
                }
                break
            case 'localUnHoldLine':
                session.isRemoteHold= false
                if(session.isMute && !session.isLocalHold){
                    session.streamMuteSwitch({type: 'slides', stream: stream, mute: false})
                }
               break
            case 'remoteHoldLine':
                session.isRemoteHold = true
                gsRTC.trigger("holdStatus", {type: message.type})
                break;
            case 'remoteUnHoldLine':
                session.isRemoteHold = false
                break;
            case 'fileInfo':
                if(message.state === 'receive'){
                    console.log('remote consent')
                    gsRTC.sendFile({lineId: currentLine, content: sendText})
                }else if(message.state === 'reject') {
                    console.log('remote reject')
                    switchSendstatus('fail')
                    notice({ type: 'error', value: currentLocale['L126']})
                }else if(message.state === 'cancel'){
                    notice({ type: 'warn', value: currentLocale['L127']})
                    fileCountDownTimer && countDownFile()
                }else if(message.state === 'timeout'){
                    notice({ type: 'error', value: currentLocale['L128']})
                    switchSendstatus('fail')
                }else{
                    This.fileSize = message.size
                    This.fileName = message.name
                    This.receiveBuffer = []
                    This.receivedSize = 0
                    console.warn("Receive the presentation, whether to accept the presentation")
                    refuseShareBtn.innerText = currentLocale['L83']
                    refuseShareBtn.classList.toggle('requestShare-bottom-cancel', false)
                    acceptShareBtn.innerText = currentLocale['L84']
                    let remoteName
                    for(let i in lineData){
                        if(lineData[i].state !== 'idle' && lineData[i].line == message.lineId){
                            remoteName = lineData[i].remotename || lineData[i].remotenumber
                        }
                    }
                    requestShareText.innerHTML = currentLocale['L123'].replace('{0}', remoteName)
                    shareFile = false
                    sharePopup.classList.toggle('requestShareBox-show',true)
                    countDownFile()
                }
                break;
            case 'mousedown':
            case 'mousemove':
            case 'mouseup':
            case 'mouseleave':
            case 'remotePosition':
                gsRTC.trigger("currentMousePosition", message)
                break
        }

    }else{
        let data = This.parseMessageBody(message)
        if(Object.keys(data).length === 0){
            log.warn("get current data is null")
            return
        }

        let type  = data.type
        let content = data.message
        let code = content.rspInfo && content.rspInfo.rspCode

        lineId = content.line

        let sdp
        let session
        log.info("receive " + type +" message:" + JSON.stringify(message, null, '  '))

        if(content.action === 'shareScreen' &&(type === 'updateMediaSession' || type === 'updateMediaSessionRet')){
            if(!message.isFromBackground){
                gsRTC.trigger("updateScreen", message, This.localShare)
                return
            }
        }


        if(content.sdp && content.sdp.data){
            sdp = content.sdp.data         // 类型 createMediaSession、createMediaSessionRet、updateMediaSession、updateMediaSessionRet
        }

        if(!lineId){
            log.warn("handle DataChannel Message: no lineId is currently ")
            return
        }
        session = WebRTCSession.prototype.getSession({key: 'lineId', value: lineId })

        if(!session){
            log.warn("current DataChannelMessage: no session")
            return
        }

        switch(type) {
            case gsRTC.SIGNAL_EVENT_TYPE.INVITE.name:
                log.info("start handle createMediaSession content")
                session.action = content.action
                session.isRecvRequest = true
                session.shareType = content.shareType
                session.reqId = content.reqId
                session.handleServerRequestSdp(sdp)
                break;
            case gsRTC.SIGNAL_EVENT_TYPE.INVITE_RET.name:
                log.info("start handle createMediaSessionRet content")
                if (gsRTC.isNxx(2, code)) {
                    log.info(session.action + ' success')
                    session.handleServerResponseSdp(sdp)
                } else {
                    log.warn(" createMediaSessionRet error ")
                }
                break;
            case gsRTC.SIGNAL_EVENT_TYPE.RE_INVITE.name:
                log.info("start handle updateMediaSession content")
                session.action = content.action
                session.shareType = content.shareType
                session.reqId = content.reqId

                session.actionCallback = function (event) {
                    event.lineId = session.lineId
                    log.warn('accept ' + session.action + ' callback data: ' + JSON.stringify(event, null, '    '))
                    if (event.message.codeType === gsRTC.CODE_TYPE.ACTION_SUCCESS.codeType) {
                        log.info(session.action + " success")
                        gsRTC.trigger(session.action, true)
                    } else {
                        log.info(session.action + " Failed")
                        gsRTC.trigger(session.action, false)
                    }
                    session.actionCallback = null
                    session.action = null
                }

                if (!code) {
                    log.info("current handle reply ")
                    session.isRecvRequest = true
                    if (session.action === 'stopShareScreen') {
                        session.remoteShare = false
                    } else if (session.action === 'shareScreen') {
                        session.remoteShare = true
                    }
                    session.handleServerRequestSdp(sdp)
                } else {
                    log.info("updateMediaSession: current get codeType : " + code + " cause: " + content.rspInfo.rspMsg)
                    This.handleSendMessage({
                        type: gsRTC.SIGNAL_EVENT_TYPE.RE_INVITE_RET,
                        mediaSession: content.sdp.data,
                        action: content.action,
                        shareType: content.shareType,
                        line: content.line,
                        reqId: content.reqId,
                        rspInfo: {
                            rspCode: code,
                            rspMsg: content.rspInfo.rspMsg
                        }
                    })
                    log.info("current codeType:" + code)
                }
                break
            case gsRTC.SIGNAL_EVENT_TYPE.RE_INVITE_RET.name:
                log.info("start handle updateMediaSessionRet content")
                if (gsRTC.isNxx(2, code)) {
                    if (session.action === 'stopShareScreen') {
                        session.localShare = false
                    } else if (session.action === 'shareScreen') {
                        session.localShare = true
                    }
                    log.info(session.action + ' success')
                    session.handleServerResponseSdp(sdp)
                } else {
                    log.warn("updateMediaSessionRet error ")
                }
                break
            case gsRTC.SIGNAL_EVENT_TYPE.BYE.name:
                log.info("start handle destroyMediaSession content, Share the line to end the call")
                session.action = content.action
                session.isRecvRequest = true
                session.shareType = content.shareType
                session.reqId = content.reqId
                let param = {
                    type: gsRTC.SIGNAL_EVENT_TYPE.BYE_RET,
                    action: session.action,
                    line: session.lineId,
                    shareType: session.shareType,
                    reqId: session.reqId
                }
                session.handleSendMessage(param)
                break
            case gsRTC.SIGNAL_EVENT_TYPE.BYE_RET.name:
                if (gsRTC.isNxx(2, code)) {
                    log.info("start handle destroyMediaSessionRet content,Share the line to end the call")
                    session.action = content.action
                    session.shareType = content.shareType
                    session.reqId = content.reqId
                    session.isHandleDestroy = true
                    gsRTC.clearSession({lineId: session.lineId})
                    gsRTC.trigger('closeScreenTab', {lineId: session.lineId})
                }
                break
            default:
                log.warn("current exist problem: " + type)
                break
        }
    }

}

WebRTCSession.prototype.handleDataChannelFile = function (event) {
    let This = this
    This.receiveBuffer.push(event.data)
    This.receivedSize += event.data.byteLength
    if (This.receivedSize === This.fileSize) {
        let received = new Blob(This.receiveBuffer)
        This.receiveBuffer = []
        This.receivedSize = 0
        This.fileSize = 0
        let href = URL.createObjectURL(received)
        let a = document.createElement('a')
        a.href = href
        a.download = This.fileName
        a.textContent = This.fileName
        a.click()
    }
}