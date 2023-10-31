
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
