
WebRTCSession.prototype.onConnectionStateChange = function () {
    log.info('onConnectionStateChange, connectionState: ' + this.pc.connectionState)

    let browserDetails = gsRTC.getBrowserDetail()
    if (this.pc.connectionState === 'failed' && ((browserDetails.browser === 'chrome' && browserDetails.version >= 76) || (browserDetails.browser === 'opera' && browserDetails.chromeVersion >= 76))) {
        this.iceConnectFailed()
    }
}

WebRTCSession.prototype.onIceConnectionStateChange = function () {
    let This = this
    let pc = This.pc
    let iceState = pc.iceConnectionState
    log.info('onIceConnectionStateChange, iceConnectionState: ' + iceState)
    gsRTC.trigger("iceConnectionStateChange", {
        lineId: This.lineId,
        iceConnectionState: iceState
    })
    switch (iceState) {
        case 'connected':
            let browserDetails = gsRTC.getBrowserDetail()
            if(browserDetails.browser === 'chrome' && browserDetails.version <= 74){
                break;
            }
        case 'completed':
            if (pc.isIceFailed && (pc.action === 'iceRestart')) {
                This.onIceRestartSuccess()
            }else {
                log.info('isIceFailed: ' + pc.isIceFailed)
                log.info('pc action: ' + pc.action)
            }
            break
        case 'failed':
            this.iceConnectFailed()
            break
        default:
            break
    }
}

WebRTCSession.prototype.onSignalingStateChange = function () {
    if (!this.pc) {
        log.info('WebRTCSession is null: unexpected')
        return
    }
    log.info('onSignalingStateChange, signalingState: ' + this.pc.signalingState)
}

WebRTCSession.prototype.onIceGatheringStateChange = function () {
    if (!this.pc) {
        log.info('WebRTCSession is null: unexpected')
        return
    }

    log.info('onicegatheringstatechange, iceGatheringState: ' + this.pc.iceGatheringState)
}

WebRTCSession.prototype.doIceRestart = function () {
    let This = this
    let pc = This.pc
    log.info('Prepare start do ice restart!')
    // if (!gsRTC.socket || !gsRTC.socket.wsIsConnected()){
    //     log.warn('webSocket is unavailable and for ice restart.')
    //     This.onIceRestartFailed()
    //     return
    // }

    let iceRestartInvite = This.sendInviteQueue.filter(item => {return item.action = 'iceRestart'})[0]
    if(!iceRestartInvite){
        This.sendInviteQueue.push({ action: 'iceRestart', sdp: null, type: This.shareType })
    }

    pc.isIceFailed = true
    pc.action = 'iceRestart'
    This.actionCallback = function (event){
        log.warn('ice restart callback data: ' + JSON.stringify(event, null, '    '))
        if(event.message.codeType !== gsRTC.CODE_TYPE.ACTION_SUCCESS.codeType){
            if(event.rspWithoutSdp){
                // 请求被回复4xx等，结束演示
                log.warn('ice restart without sdp!')
                This.onIceRestartFailed()
            }
        }
        pc.action = null
        This.actionCallback = null
    }
    This.isInviteBeingProcessed = false
    This.doOffer()
    pc.iceFailureNum++
}

WebRTCSession.prototype.iceConnectFailed = function () {
    let This = this
    let pc = This.pc
    // if (!gsRTC.socket || !gsRTC.socket.wsIsConnected()){
    //     pc.isIceFailed = true
    //     pc.action = 'iceRestart'
    //     log.warn('webSocket is unavailable and for ice connect failed.')
    //     return
    // }

    log.warn('iceConnectFailed, o_failure_num: ' + pc.iceFailureNum + '  (line:' + This.lineId + ')')
    // Re-connected three times without success is considered a failure
    if (pc.iceFailureNum >= 3) {
        log.warn("Failed to do ice restart(line: " + This.lineId + ")");
        This.onIceRestartFailed();
    } else{
        gsRTC.trigger('iceReconnect', {
            lineId: This.lineId,
            peerAccount: This.peerAccount,
            message: gsRTC.CODE_TYPE.ICE_RECONNECTING
        })
        This.doIceRestart()
    }
}

WebRTCSession.prototype.onIceRestartSuccess = function () {
    let This = this
    log.info('ice restart success' + '  (PC:' + This.pc.type + ')')
    This.pc.iceFailureNum = 0
    This.pc.isIceFailed = false
    gsRTC.trigger('iceReconnect', {
        lineId: This.lineId,
        peerAccount: This.peerAccount,
        message: gsRTC.CODE_TYPE.ACTION_SUCCESS
    })

    This.removeInviteAction({ action: This.pc.action })
    This.pc.action = null
}

WebRTCSession.prototype.onIceRestartFailed = function () {
    let This = this
    log.warn('ice restart failed')
    This.pc.iceFailureNum = 0
    This.pc.isIceFailed = true
    log.info('ice reconnect failed, need to hang up the line ' + This.lineId)
    if(This.remoteShare || This.localShare){
        gsRTC.trigger('errorTip', gsRTC.CODE_TYPE.ICE_CONNECTION_FAILED.codeType, This.lineId)
    }
    gsRTC.clearSession({lineId: This.lineId})

    // gsRTC.trigger('iceReconnect', {
    //     lineId: This.lineId,
    //     peerAccount: This.peerAccount,
    //     message: gsRTC.CODE_TYPE.ICE_RECONNECTED_FAILED
    // })

    // gsRTC.onSipEventStack({ type: 'iceRestartFailed', rspCode: gsRTC.CODE_TYPE.ICE_RECONNECTED_FAILED })
}

WebRTCSession.prototype.onIceCandidate = function (event) {
    let This = this
    log.info(`ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`)
    let iceState = This.pc.iceGatheringState
    if (iceState === 'completed' || iceState === 'complete' || (event && !event.candidate)) {
        log.warn('onIceCandidate: ICE GATHERING COMPLETED')
        this.onIceGatheringCompleted()
    } else if (iceState === 'failed') {
        log.warn("onIceCandidate: ice state is 'failed'");
        return
    }

    // if (GsRTC.prototype.getConfFromLocalStorage('trickle_ice') === 'true') {
    //     // todo: Filter the host tcp address with port 9 and 169.254. network segment address
    //     if (event.candidate && (event.candidate.candidate.indexOf(' 9 typ host tcp') >= 0 || event.candidate.candidate.indexOf('169.254.') >= 0)) {
    //         return
    //     }
    //
    //     This.sendInfoForTrickleIce({candidate: event.candidate ? event.candidate.candidate : null})
    // }
}

WebRTCSession.prototype.onIceGatheringCompleted = function () {
    let This = this
    if (!This.localSdpPending) {
        log.info("onIceGatheringCompleted but no local sdp request is pending")
        return false
    }
    This.localSdpPending = false

    let sdp = This.getLocalSDP()
    This.lastReInviteSdp = sdp
    log.warn('ready to send INVITE or 200OK: \r\n' + sdp)

    This.localSendMessage(sdp)

}

/**
 *
 * @param candidate
 * @param gathering true: candidate 收集完成， false candidate正在收集中
 * @private
 */
WebRTCSession.prototype.getContentForTrickleIce = function(candidate, gathering){
    log.warn('getContentForTrickleIce')
    let This = this
    let localDescription = This.pc.localDescription
    let generateContent = function(result){
        if(!result){
            return
        }
        let content;
        for(let i = 0; i < result.length; i++){
            if(content){
                content += result[i]
            }else {
                content = result[i]
            }
        }
        return content
    }

    let getContent = function(sdp){
        let result
        let content = 'm=audio 9 RTP/AVP 0' + '\r\n' + 'a=mid:0' + '\r\n';
        let regs = [/a=ice-ufrag:[\w\/\+\-]+\r\n/, /a=ice-pwd:[\w\/\+\-]+\r\n/]
        for(let i = 0; i < regs.length; i++){
            result = sdp.match(regs[i])
            if(content){
                content += generateContent(result)
            } else{
                content = generateContent(result)
            }
        }

        if(candidate && candidate.length > 0){
            for(let i = 0; i < candidate.length; i++){
                content += candidate[i]
            }
        }

        if(gathering){
            content += 'a=end-of-candidates\r\n'
        }
        return content;
    }


    if(!localDescription){
        log.error("getContentForTrickleIce: localDescription is null")
        return
    }

    return getContent(localDescription.sdp)
}

WebRTCSession.prototype.sendInfoForTrickleIce = function(data){
    let This = this
    if(!data){
        log.info('sendInfoForTrickleIce: Invalid Argument')
        return
    }

    log.warn('send info for trickle ice, candidate is gathered ' + !!data.candiGathered)
    if(!This.trickleIceInfo){
        let sessionInfo = {completed: false, candidates: [], contents: ''}
        let candidate = 'a=' + data.candidate + '\r\n'
        sessionInfo.candidates.push(candidate)
        sessionInfo.contents = This.getContentForTrickleIce(sessionInfo.candidates, false)

        This.trickleIceInfo = sessionInfo
    } else if(!data.candiGathered){
        if(data.candidate){
            let candidate = 'a=' + data.candidate + '\r\n'
            This.trickleIceInfo.candidates.push(candidate)
            This.trickleIceInfo.contents = This.getContentForTrickleIce(This.trickleIceInfo.candidates, false)
        }else {
            This.trickleIceInfo.contents = This.getContentForTrickleIce(This.trickleIceInfo.candidates, true)
            This.trickleIceInfo.completed = true
        }
    }

    log.warn('isReadySendIceInfo ' + This.isReadySendIceInfo)
    if(This.isReadySendIceInfo){
        if(!data.candidate && This.isReadySendIceInfo){
            log.info('candidate gathering completed, set isReadySendIceInfo false')
            This.isReadySendIceInfo = false
        }

        let headAddList = [{name: 'Info-Package', value: 'trickle-ice'}, {name: 'Content-Disposition', value: 'Info-Package'}]
        gsRTC.sipStack && gsRTC.sipStack.jsSipSendInfo(This.lineId, headAddList, 'application/trickle-ice-sdpfrag', This.trickleIceInfo.contents)

        if(!This.isIceInfoHasSent){
            This.isIceInfoHasSent = true
        }
    }
}

WebRTCSession.prototype.sendInfoWithCandidate = function(){
    log.info('send info with candidate')
    let This = this
    if(GsRTC.prototype.getConfFromLocalStorage('trickle_ice') === 'true'){
        let iceState = This.pc.iceGatheringState
        log.warn("ready to send ice info, iceGatheringState: " + iceState + ', isIceInfoHasSent: ' + This.isIceInfoHasSent)
        This.isReadySendIceInfo = true

        if(!This.isIceInfoHasSent){
            log.warn('candidate info was not sent before')
            // TODO: When tcp && udp reconnects, the candidates have been collected but not sent
            if(iceState === 'completed' || iceState === 'complete'){
                This.sendInfoForTrickleIce({candidate: null})
            }else if(This.trickleIceInfo && This.trickleIceInfo.candidates && This.trickleIceInfo.candidates.length){
                log.warn('send the collected candidates')
                // TODO: iceGatheringState Complete state does not trigger in the turn environment
                This.sendInfoForTrickleIce({candidate: This.trickleIceInfo.candidates[0], candiGathered: true})
            }
        }
    }
}
