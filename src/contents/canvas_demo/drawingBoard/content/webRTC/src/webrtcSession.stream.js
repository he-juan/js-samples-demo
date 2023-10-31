
/***
 * Function that clear stream, free resources
 * @param stream
 */
WebRTCSession.prototype.closeStream = function (stream) {
    if (!stream) {
        log.info('closeStream:stream is null')
        return
    } else {
        log.info('close stream id: ' + stream.id)
    }

    try {
        stream.oninactive = null
        let tracks = stream.getTracks()
        for (let track in tracks) {
            tracks[track].onended = null
            log.info('close stream')
            tracks[track].stop()
        }
    } catch (error) {
        log.info('closeStream: Failed to close stream')
        log.info(error)
    }
    stream = null
}

/**
 * set stream
 * @param stream
 * @param type: audio, main, slides, localVideoShare
 * @param isLocal :true for the local stream and false for the accepted remote stream
 * @param msid: for received remote streams
 */
WebRTCSession.prototype.setStream = function (stream, type, isLocal, msid) {
    let This = this
    if (!type) {
        log.warn('setStream: Invalid parameter!')
        return
    }

    let streamId = stream ? stream.id : null
    log.info('set ' + type + ' stream id: ' + streamId)
    if(isLocal){
        if(This.localStreams[type]){
            This.closeStream(This.localStreams[type])  // clear before first
        }
        This.localStreams[type] = stream
    }else {
        if(type === 'audio' || type === 'main' || type === 'slides'){
            // if(This.remoteStreams[type]){
            //     This.closeStream(This.remoteStreams[type])  // clear before first
            // }
            This.remoteStreams[type] = stream
        } else {
            if(!stream){
                delete This.remoteStreams.mainVideos[type]
            } else {
                This.remoteStreams.mainVideos[type] = stream
            }
        }
    }

    let changeStream = stream
    // if(isLocal && type === 'main' && stream && gsRTC.backgroundEnabled()){
    //     changeStream = This.localStreams.effectStream
    // }

    gsRTC.trigger('streamChange',  {
        stream: changeStream,
        type: type,
        isLocal: isLocal,
        msid: msid,
        peerAccount: This.peerAccount,
        lineId: This.lineId
    })
}

/***
 * get stream
 * @param isLocal: true for the local stream and false for the accepted remote stream
 * @param type audio, main, slides
 * @returns {*}
 */
WebRTCSession.prototype.getStream = function (type, isLocal) {
    if (!type) {
        log.warn('getStream: Invalid parameter!')
        return
    }

    let stream
    if(isLocal){
        stream = this.localStreams[type]
    }else {
        if(type === 'audio' || type === 'main' || type === 'slides'){
          stream = this.remoteStreams[type]
        }else {
            stream = this.remoteStreams.mainVideos[type]
        }
    }

    if (stream) {
        log.info('get ' + type + ' stream id :' + stream.id)
    } else {
        log.warn(type + ' stream does not exist')
    }
    return stream
}

/**
 * 通过 MediastreamTrack label 判断当前共享类型
 */
WebRTCSession.prototype.getShareTypeByTrackSetting = function (stream){
    if(!stream){
        return ''
    }

    let type = ''
    let track = stream.getVideoTracks()[0]
    let browserDetails = GsRTC.prototype.getBrowserDetail()

    if(browserDetails.browser === 'firefox'){
        /**
         * Firefox track label:
         * label: "WebRTC samples - Google Chrome"   // tab 页
         * label: "GRP拨号插件问题列表.xlsx - WPS Office"   // 窗口
         * label: ""   // 屏幕
         */
        type = track.label || 'screen'
    }else {
        let displaySurface = track.getSettings().displaySurface
        switch (displaySurface){
            case 'browser':  // tab页
                type = 'tab'
                break
            case 'monitor':  // 屏幕
                type = 'screen'
                break
            case 'window':   // 窗口
                type = 'window'
                break
            default:
                break
        }
    }
    return type
}

/**
 * 获取取流错误的code
 * @param streamType: 取流类型 audio、video
 * @param errorName: 取流失败后返回的错误
 * @returns {number}
 */
WebRTCSession.prototype.getGumErrorCode = function (streamType, errorName){
    let errorCode
    if(streamType === 'audio'){
        if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
            //required track is missing
            errorCode = GsRTC.prototype.CODE_TYPE.MIC_NOT_FOUND
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
            //webcam or mic are already in use
            errorCode = GsRTC.prototype.CODE_TYPE.MIC_NOT_READABLE
        } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || (errorName && errorName.indexOf("denied") !== -1)) {
            //permission denied in browser
            errorCode = GsRTC.prototype.CODE_TYPE.MIC_REQUEST_REFUSE;
        } else if (errorName === "TypeError") {
            //empty constraints object
            errorCode = GsRTC.prototype.CODE_TYPE.MIC_TYPE_ERROR;
        } else if(errorName === 'TimeOutError'){
            errorCode = GsRTC.prototype.CODE_TYPE.MIC_GUM_TIMEOUT;
        } else {
            //other errors
            errorCode = GsRTC.prototype.CODE_TYPE.MIC_REQUEST_FAIL
        }
    }else if(streamType === 'video'){
        if (errorName === "OverconstrainedError" || errorName === "ConstraintNotSatisfiedError" || errorName === "InternalError") {
            //constraints can not be satisfied by avb. devices
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_REQUEST_OVER_CONSTRAINTS
        }else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
            //required track is missing
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_NOT_FOUND
        } else if (errorName === "NotReadableError" || errorName === "TrackStartError") {
            //webcam or mic are already in use
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_NOT_READABLE_OR_TRACK_START_ERROR
        } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || (errorName && errorName.indexOf("denied") !== -1)) {
            //permission denied in browser
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_REQUEST_REFUSE;
        } else if (errorName === "TypeError") {
            //empty constraints object
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_TYPE_ERROR
        } else if(errorName === 'TimeOutError'){
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_GUM_TIMEOUT;
        } else {
            //other errors
            errorCode = GsRTC.prototype.CODE_TYPE.VIDEO_REQUEST_FAIL
        }
    } else if(streamType === 'slides'){
        if(errorName === 'NotReadableError'){
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_NOT_READABLE
        }else if(errorName === 'NotAllowedError'){
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_REQUEST_REFUSE
        }else if(errorName === 'OverconstrainedError'){
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_REQUEST_OVER_CONSTRAINTS
        }else if(errorName === 'NotFoundError'){
            // There is no screen video source available for capture
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_NOT_FOUND
        }else if(errorName === 'InvalidStateError'){
            // The document in the context is not fully activated
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_INVALID_STATE
        }else if(errorName === 'AbortError'){
            // Mismatched errors or malfunctions.
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_ABORT_ERROR
        }else if(errorName === 'TypeError'){
            // Unsupported constraints
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_TYPE_ERROR
        }else {
            //other errors
            errorCode = GsRTC.prototype.CODE_TYPE.SCREEN_REQUEST_FAIL
        }
    }

    log.info("gum error " + errorName + ", code " + errorCode)
    return errorCode
}

/**
 * 从摄像头获取音视频流：初始建立通话，创建媒体行和加流时调用
 * @param data.type: audio 音频， video 视频
 * @param data.callback
 * @returns {Promise<MediaStream>}
 */
WebRTCSession.prototype.getUserMediaStream = async function (data){
    let This = this
    let constraints = {}
    let type = data.type

    if(type === 'audio'){
        constraints = {
            audio: true,
            video: false,
        }
        if(gsRTC.device.currentDev.audioDeviceId){
            constraints.audio = {
                deviceId: {
                    exact: gsRTC.device.currentDev.audioDeviceId
                }
            }
        }
        let enableRnnNoise = localStorage.getItem('enableRnnNoiseSuppression')
        if(enableRnnNoise === 'true'){
            if(typeof constraints.audio !== 'object'){
                constraints.audio = {}
            }
            constraints.audio.noiseSuppression = { exact: true }
            constraints.audio.rnnNoiseSuppression = { exact: true }
            log.info('rnnNoise is enabled for get user media stream.')
        }
    } else if(type === 'video'){
        constraints = {
            audio: false,
            video: {
                width: This.RESOLUTION.CLIENT_MAIN_DEFAULT_UP.width,
                height: This.RESOLUTION.CLIENT_MAIN_DEFAULT_UP.height,
                frameRate: 15
            }
        }

        if(gsRTC.device.currentDev.videoDeviceId){
            constraints.video.deviceId = {
                exact: gsRTC.device.currentDev.videoDeviceId
            }
        }
    }

    function onGetStreamSuccess (stream) {
        if(!This.pc || (This.pc && This.pc.signalingState === 'closed')){
            log.info('getUserMediaStream: RTCPeerConnection is not available')
            WebRTCSession.prototype.closeStream(stream)
            return
        }

        log.info('get stream success constraints: ' + JSON.stringify(constraints, null, '  '))
        data.callback({stream: stream, constraints: constraints })
    }

    function onGetStreamFailed (error) {
        log.warn('failed of getUserMediaStream: ' + JSON.stringify(constraints, null, '  '))
        data.callback({error: error})
    }
    await gsRTC.device.getUserMediaWithTimeout(constraints).then(onGetStreamSuccess).catch(onGetStreamFailed)
}

/**
 * 获取音频、视频或桌面流：开摄像头、切换摄像头设备、切换分辨率时调用
 * @param data.streamType: audio、video、screenShare
 * @param data.constraints
 * @param data.shareAudio
 * @param data.callback
 */
WebRTCSession.prototype.getStreamFromDevice = function (data){
    let This = this
    if(!data || !data.streamType || !data.constraints || (!data.constraints.audio && !data.constraints.video)){
        log.error('getStreamFromDevice: invalid parameters')
        return
    }

    let constraints = {}
    switch (data.streamType){
        case 'audio':
            constraints = {
                audio: data.constraints.audio.deviceId ? { deviceId: { exact: data.constraints.audio.deviceId }}: true,
                video: false
            }

            if(data.constraints.audio.rnnNoiseSuppression === true || data.constraints.audio.rnnNoiseSuppression === 'true'){
                if(typeof constraints.audio !== 'object'){
                    constraints.audio = {}
                }
                constraints.audio.noiseSuppression = { exact: true }
                constraints.audio.rnnNoiseSuppression = { exact: true }
                log.info('rnnNoise is enabled for get audio stream.')
            }
            break
        case 'video':
            constraints = {
                audio: false,
                video: {
                    width: { exact: data.constraints.video.width ? data.constraints.video.width : 640 },
                    height: { exact: data.constraints.video.height ? data.constraints.video.height : 360 },
                    deviceId: data.constraints.video.deviceId ? { exact: data.constraints.video.deviceId } : ''
                }
            }
            if(GsRTC.prototype.getBrowserDetail().browser !== 'firefox'){
                constraints.video.frameRate = { exact: (data.constraints.video.frameRate ? data.constraints.video.frameRate : 15) }
            }
            break
        case 'screenShare':
            constraints = {
                audio: data.constraints.audio && GsRTC.prototype.isSystemAudioShareSupport(),
                video: {
                    width: { max: data.constraints.video.width ? data.constraints.video.width : 1920 },
                    height: { max: data.constraints.video.height ? data.constraints.video.height : 1080 },
                    frameRate: { max: data.constraints.video.frameRate ? data.constraints.video.frameRate : 15 }
                }
            }
            if(gsRTC.getBrowserDetail().browser === 'safari' && gsRTC.getBrowserDetail().UIVersion === '12.1.2'){
                // Safari 12.1.2 special handling below
                log.info('Safari 12.1.2 special handling below')
                constraints.video.frameRate.ideal = constraints.video.frameRate.max
                delete constraints.video.frameRate.max
            }
            break
        default:
            log.warn('Unknown type: ' + data.streamType)
            break
    }

    let parameters = {
        streamType: data.streamType,
        stream: data.stream,
        isFirefox: GsRTC.prototype.getBrowserDetail().browser === 'firefox',
        callback: data.callback
    }
    gsRTC.device.getMedia(parameters, constraints)
}
/***
 * 取流失败后重新取流时，修改取流参数限制条件
 * @ data
 * @ lastConstraints: 上一次取流的constraints限制
 * */
WebRTCSession.prototype.reGetStreamWidthChangeConstraints = function(data, lastConstraints, actionCallback){
    log.info("re-getStream width new constraints")
    let This = this
    let newConstraints = {}
    switch (data.streamType) {
        case 'audio':
            newConstraints = data.constraints
            break
        case 'video':
            let browserDetail = gsRTC.getBrowserDetail()
            if (!data.action) {
                newConstraints = {
                    audio: false,
                    video: {
                        width: { ideal: lastConstraints.video.width.exact },
                        height: { ideal: lastConstraints.video.height.exact },
                        frameRate: { exact: lastConstraints.video.frameRate && lastConstraints.video.frameRate.exact || ' ' },
                        deviceId: { exact: lastConstraints.video.deviceId && lastConstraints.video.deviceId.exact || ' ' },
                    },
                }
            } else if (data.action === 'adjustResolution') {
                newConstraints = {
                    audio: false,
                    video: {
                        width: { exact: lastConstraints.video.width.exact },
                        height: { exact: lastConstraints.video.height.exact },
                        frameRate: { exact: lastConstraints.video.frameRate && lastConstraints.video.frameRate.exact || ' ' },
                        deviceId: { exact: lastConstraints.video.deviceId.exact },
                    },
                }
                if(Number(lastConstraints.video.width.exact) === 640) {
                    delete newConstraints.video.height.exact
                    newConstraints.video.height.ideal = lastConstraints.video.height.exact
                }
            } else if (data.action === 'switchLocalVideoDevice') {
                if(Number(lastConstraints.video.width.exact) === 1920) {
                    lastConstraints.video.width.exact = 1280
                    lastConstraints.video.height.exact = 720
                }else if (Number(lastConstraints.video.width.exact) === 1280) {
                    lastConstraints.video.width.exact = 640
                    lastConstraints.video.height.exact = 360
                }else if (Number(lastConstraints.video.width.exact) === 640) {
                    lastConstraints.video.width.ideal = lastConstraints.video.width.exact
                    lastConstraints.video.height.ideal = lastConstraints.video.height.exact
                    delete lastConstraints.video.width.exact
                    delete lastConstraints.video.height.exact
                }else {
                    log.warn(' The constraints parameter is not satisfied ')
                    data.callback({ error: data.error })
                    return
                }
                newConstraints = lastConstraints
            }
            if(browserDetail.browser === 'safari') {
                // Bug 207284 - Wave_Web_1.0.11.6_Safari 13 browser failed to open camera
                if(browserDetail.UIVersion < '14.0' && data.error.constraint === 'frameRate') {
                    log.info('Special treatment under Safari 14')
                    newConstraints.video.frameRate.ideal = newConstraints.video.frameRate.exact
                    delete newConstraints.video.frameRate.exact
                }else if (browserDetail.UIVersion === '14.1.2' || browserDetail.UIVersion === '15.2') {
                    //Bug 210903 - Wave_Web_1.0.12.7_Safari 15 browser failed to open camera
                    newConstraints.video.frameRate.max = 30
                    newConstraints.video.frameRate.min = 5
                    delete newConstraints.video.frameRate.exact
                }
            }else if (browserDetail.browser === 'firefox') {
                delete newConstraints.video.frameRate
            }
            break
        case 'screenShare':
            newConstraints = This.getScreenShareConstraints(data)
            break
        default:
            log.warn('unknown type ' + data.streamType)
            break
    }
    gsRTC.device.getMedia(data, newConstraints)
}

/***
 * Function that stream mute and unmute switch
 * @param data 示例{
 *   stream: stream
 *   type: 'audio'
 *   mute: true
 * }
 */
WebRTCSession.prototype.streamMuteSwitch = function (data) {
    let This = this
    if (data.stream != null) {
        log.info('MuteStream: stream id = ' + data.stream.id)
    }

    if (data && data.stream && data.type === 'audio' && data.stream.getAudioTracks().length > 0) {
        for (let i = 0; i < data.stream.getAudioTracks().length; i++) {
            if (data.mute) {
                if (data.stream.getAudioTracks()[i].enabled === true) {
                    log.info('MuteStream exec mute audio')
                    data.stream.getAudioTracks()[i].enabled = false
                }
            } else {
                if (data.stream.getAudioTracks()[i].enabled === false) {
                    log.info('MuteStream exec unmute audio')
                    data.stream.getAudioTracks()[i].enabled = true
                }
            }
        }
    } else if ((data.type === 'video' || data.type === 'slides' || data.type === 'main') && data.stream.getVideoTracks().length > 0) {
        for (let j = 0; j < data.stream.getVideoTracks().length; j++) {
            if (data.mute) {
                if (data.stream.getVideoTracks()[j].enabled === true) {
                    log.info('MuteStream exec mute video/slides')
                    data.stream.getVideoTracks()[j].enabled = false
                    This.isMute = true
                }
            } else {
                if (data.stream.getVideoTracks()[j].enabled === false) {
                    log.info('MuteStream exec unmute video/slides')
                    data.stream.getVideoTracks()[j].enabled = true
                    This.isMute = false
                }
            }
        }
    }
}

WebRTCSession.prototype.getTransceiver = function(type){
    let This = this
    let mid = parseInt(This.mids[type])
    if(!mid && mid !== 0){
        log.info(type + ' mid is not found, mids: ' + This.mids[type])
        return  null
    }

    return  This.pc.getTransceivers().find(item =>{return mid === parseInt(item.mid)});
}

/***
 * Function that add stream
 * @param stream
 * @param pc
 * @param type
 * @param callback
 */
WebRTCSession.prototype.processAddStream = function (stream, pc, type, callback) {
    log.info('process add stream, type ' + type)
    try {
        let This = this
        let transceiverTarget = This.getTransceiver(type)
        if(!transceiverTarget){
            log.info('processAddStream: transceiver is not found')
            return
        }

        if (pc.getTransceivers().length > 0) {
            if (!window.RTCRtpTransceiver.prototype.setDirection) {
                /** Direction setting occasionally does not trigger onnegotiationneeded */
                transceiverTarget.direction = 'sendonly'
                transceiverTarget.direction = 'inactive'

                let track = (type === 'audio') ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
                transceiverTarget.sender.replaceTrack(track)
                    .then(function () {
                        log.info('use replaceTrack to add stream ')
                        callback && callback()
                    })
                    .catch(function (error) {
                        log.warn(error)
                    })
                transceiverTarget.direction = 'sendrecv'
            } else {
                log.info('use replaceTrack to add stream ')
                transceiverTarget.setDirection('sendrecv')
                callback && callback()
            }
        } else {
            /** see bug 137445 for safari 11.0.2 and 11.1.2 * */
            let browserDetail = gsRTC.getBrowserDetail()
            if (browserDetail.browser === 'safari' && (browserDetail.UIVersion === '11.0.2' || browserDetail.UIVersion === '11.1.2') && transceiverTarget) {
                let track = (type === 'audio') ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
                transceiverTarget.sender.replaceTrack(track)
                    .then(function () {
                        log.info('use replaceTrack to add stream ')
                        callback && callback()
                    })
                    .catch(function (error) {
                        log.warn(error)
                    })
            } else if (stream) {
                // Todo: safari do not have addStream api
                if (!('addStream' in window.RTCPeerConnection.prototype)) {
                    let _addTrack = window.RTCPeerConnection.prototype.addTrack
                    stream.getTracks().forEach(function (track) {
                        _addTrack.call(pc, track, stream)
                    })
                    log.info('use addTrack to add stream.')
                } else {
                    pc.addStream(stream)
                    log.info('use addStream to add stream.')
                }
                callback && callback()
            }
        }
    } catch (e) {
        log.warn(e)
        log.warn('process add stream error, ' + e)
    }
}

/***
 * Function that remove stream
 * @param stream
 * @param pc
 * @param type
 */
WebRTCSession.prototype.processRemoveStream = function (stream, pc, type) {
    try {
        let This = this
        log.info('process remove stream, type ' + type)
        let transceiverTarget = This.getTransceiver(type)
        if(!transceiverTarget){
            log.warn('processRemoveStream: transceiver is not found')
            return
        }

        if (pc.getTransceivers().length > 0) {
            if (!window.RTCRtpTransceiver.prototype.setDirection) {
                /** Direction setting occasionally does not trigger onnegotiationneeded */
                if(type === 'slides'){
                    transceiverTarget.direction = 'sendrecv'
                } else {
                    transceiverTarget.direction = 'sendonly'
                    transceiverTarget.direction = 'inactive'
                    transceiverTarget.direction = 'recvonly'
                }
                transceiverTarget.sender.replaceTrack(null)
                    .then(function () {
                        log.info('use replaceTrack to remove stream ')
                    })
                    .catch(function (error) {
                        log.warn(error)
                    })
            } else {
                log.info('use replaceTrack to remove stream.')
                transceiverTarget.setDirection('recvonly')
            }
        } else {
            /** see bug 137445 for safari 11.0.2 and 11.1.2 * */
            let browserDetail = gsRTC.getBrowserDetail()
            if (browserDetail.browser === 'safari' && (browserDetail.UIVersion === '11.0.2' || browserDetail.UIVersion === '11.1.2') && transceiverTarget) {
                transceiverTarget.sender.track.enabled = false
            } else if (stream) {
                // Todo: safari do not have removeStream api
                if (!('removeStream' in window.RTCPeerConnection.prototype)) {
                    let tracks = stream.getTracks()
                    pc.getSenders().forEach(function (sender) {
                        if (tracks.indexOf(sender.track) !== -1) {
                            pc.removeTrack(sender)
                        }
                    })
                    log.info('use removeTrack to remove stream ')
                } else {
                    pc.removeStream(stream)
                    log.info('use removeStream to remove stream ')
                }
            }
        }
    } catch (e) {
        log.warn(e)
        log.warn('process remove stream error, ' + e)
    }
}

/**
 * get capture stream from canvas
 * @returns {Promise<*>}
 */
WebRTCSession.prototype.getCaptureStreams = function (canvas){
    log.info("Prepare to obtain other streams through CaptureStream!")
    let stream
    if(!canvas){
        canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.style.cssText = "display: none"
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#0000FF";
        ctx.fillRect(0, 0, 1, 1);
    }

    try{
        if(canvas.captureStream){
            stream = canvas.captureStream(5);
        }else if(canvas.mozCaptureStream){
            stream = canvas.mozCaptureStream(5)
        }else{
            log.info('Current browser does not support captureStream!!')
            log.error({codeType: 'Current browser does not support captureStream!! can not send whiteboard by slides'})
        }
        log.info("get captureStream: ", stream);
    }catch(e){
        log.error("canvas captureStream get " + e.name)
        log.info("can not canvas stream and can share screen")
    }
    return stream
}

/**
 * 音频混音
 */
WebRTCSession.prototype.mixingStream = function (stream1, stream2) {
    log.info('mixing audio stream')
    if(!stream1 || !stream2){
        log.info("invalid parameters to mixStream")
        return
    }
    let This = this
    // 混音参数
    window.AudioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)

    if (window.AudioContext) {
        if(This.mixStreamContext){
            This.mixStreamContext.close()
            This.mixStreamContext = null
        }
        This.mixStreamContext = new window.AudioContext()
    } else {
        log.error('not support web audio api')
    }

    // 混音
    let destinationParticipant1 = This.mixStreamContext.createMediaStreamDestination()
    if (stream1) {
        let source1 = This.mixStreamContext.createMediaStreamSource(stream1)
        source1.connect(destinationParticipant1)
    }
    if (stream2) {
        let source2 = This.mixStreamContext.createMediaStreamSource(stream2)
        source2.connect(destinationParticipant1)
    }

    return destinationParticipant1.stream
}
