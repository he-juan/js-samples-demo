
/**
 * Set the media line of session level
 * @param sdp
 * @returns {string}
 */
WebRTCSession.prototype.setSessionLevelMediaLine = function(sdp){
    let This = this
    // todo: Solve the problem of incorrect createOffer SDP caused by
    //  different packetization-mode settings for the same PT in different media lines
    sdp = SDPTools.removeInvalidCode(sdp)

    let parsedSdp = SDPTools.parseSDP(sdp)
    // Delete codes other than H624 and H264 only keep one
    This.trimCodec(parsedSdp)

    // set media level
    parsedSdp.fingerprint = parsedSdp.fingerprint || parsedSdp.media[0].fingerprint
    parsedSdp.icePwd = parsedSdp.icePwd || parsedSdp.media[0].icePwd
    parsedSdp.iceUfrag = parsedSdp.iceUfrag || parsedSdp.media[0].iceUfrag
    parsedSdp.setup = parsedSdp.setup || parsedSdp.media[0].setup
    let trickleIce = GsRTC.prototype.getConfFromLocalStorage('trickle_ice')
    if(trickleIce === 'true'){
        parsedSdp.iceOptions = parsedSdp.iceOptions || parsedSdp.media[0].iceOptions
    }

    if(parsedSdp.media && parsedSdp.media.length && parsedSdp.media.length > 3){
        parsedSdp.groups[0].mids = ''
        for (let i = 0; i < parsedSdp.media.length; i++) {
            let media = parsedSdp.media[i]
            if(!parsedSdp.groups[0].mids){
                parsedSdp.groups[0].mids = parsedSdp.groups[0].mids + media.mid
            }else {
                parsedSdp.groups[0].mids = parsedSdp.groups[0].mids + ' ' + media.mid
            }

            // todo: (Firefox) When the port sent to UCM is 0, UCM will not send stream
            if(parseInt(media.port) === 0){
                media.port = 9
            }

            // delete session level
            delete media.iceOptions
            delete media.fingerprint
            delete media.icePwd
            delete media.iceUfrag
            delete media.setup
            delete media.ext
        }
        sdp = SDPTools.writeSDP(parsedSdp)
    }

    return sdp
}
/**
 * set default RTCP receiver report ssrc = remote_ssrc + 1
 * @param roSdp: remote sdp
 * @param loSdp: local sdp
 * @returns {string|*}
 */
WebRTCSession.prototype.setDefaultRtcpReceiverReportSsrc = function (roSdp, loSdp){
    let This = this
    log.info('set default RTCP receiver report ssrc')
    if(!roSdp || !loSdp){
        log.warn('Invalid sdp parameter')
        return  loSdp
    }
    let roParsedSdp = SDPTools.parseSDP(roSdp)
    let loParsedSdp = SDPTools.parseSDP(loSdp)

    if(roParsedSdp.media && roParsedSdp.media.length && loParsedSdp.media && loParsedSdp.media.length) {
        for (let i = 0; i < loParsedSdp.media.length; i++) {
            let roMedia = roParsedSdp.media[i]
            let loMedia = loParsedSdp.media[i]
            if (i >= 3) {
                /* TODO: set local_ssrc = remote_ssrc + 1, Avoid the problem that AVS cannot recognize PLI
                 *       for AVS judges the current stream through senderssrc
                 * ConfigureReceiverRtp:
                 *   1.webRTC set kDefaultRtcpReceiverReportSsrc = 1,
                 *   2.remote_ssrc and local_ssrc cannot be the same
                 * This protection is against setting the same local ssrc as
                 * remote which is not permitted by the lower-level API. RTCP requires a
                 * corresponding sender SSRC. Figure out what to do when we don't have
                 * (receive-only) or know a good local SSRC.
                 */
                let roRtpSSRC
                let roRtxSSRC
                if(roMedia.ssrcGroups && roMedia.ssrcGroups.length){
                    roRtpSSRC = parseInt(roMedia.ssrcGroups[0].ssrcs.split(' ')[0]) + 1
                    roRtxSSRC = parseInt(roMedia.ssrcGroups[0].ssrcs.split(' ')[1]) + 1
                }else if(roMedia.ssrcs && roMedia.ssrcs.length){
                    // When rtx is not supported, there is no ssrc -group
                    roRtpSSRC = parseInt(roMedia.ssrcs[0].id) + 1
                }

                let originRtpSSRC
                let originRtxSSRC
                if (loMedia && loMedia.ssrcGroups && loMedia.ssrcGroups.length) {
                    originRtpSSRC = parseInt(loMedia.ssrcGroups[0].ssrcs.split(' ')[0])
                    originRtxSSRC = parseInt(loMedia.ssrcGroups[0].ssrcs.split(' ')[1])
                }else if(loMedia.ssrcs && loMedia.ssrcs.length){
                    // When rtx is not supported, there is no ssrc -group
                    originRtpSSRC = parseInt(loMedia.ssrcs[0].id)
                }

                for (let j = 0; j < loMedia.ssrcs.length; j++) {
                    let ssrc = loMedia.ssrcs[j]
                    if (ssrc.id === originRtpSSRC) {
                        ssrc.id = roRtpSSRC
                    } else if (ssrc.id === originRtxSSRC) {
                        if(roRtxSSRC){
                            ssrc.id = roRtxSSRC
                        }
                    } else {
                        log.warn('Get unexpected ssrc ' + ssrc.id)
                    }
                }

                loMedia.ssrcGroups = roMedia.ssrcGroups || loMedia.ssrcGroups
                if(loMedia.ssrcGroups){
                    if(roRtxSSRC){
                        loMedia.ssrcGroups[0].ssrcs = roRtpSSRC + ' ' + roRtxSSRC
                    }else {
                        loMedia.ssrcGroups[0].ssrcs = roRtpSSRC + ' ' + originRtxSSRC
                    }
                }
                loMedia.msid = roMedia.msid || loMedia.msid
            }else {
                let mainMid = This.mids['main']
                if(parseInt(loMedia.mid) === parseInt(mainMid) && !This.getStream('main', true)){
                    log.warn('set main direction to inactive')
                    loMedia.direction = 'inactive'
                }
            }

            if(i>0){
                delete loMedia.setup
            }else {
                // Only keep the first setup in bundle mode, Offerer must use actpass value for setup attribute.
                loMedia.setup = 'actpass'
            }
        }
    }else {
        log.warn('set RTP/RTX SSRC failed, roParsedSdp: ' + roParsedSdp)
        log.warn('set RTP/RTX SSRC failed, loParsedSdp: ' + loParsedSdp)
    }

    return SDPTools.writeSDP(loParsedSdp)
}

/**
 * delete reserved payload
 * @param sdp
 * @param type: audio || video
 * @param reservedPayloads: Reserved value to delete
 */
WebRTCSession.prototype.removeReservedPayloads = function(sdp, type, reservedPayloads){
    log.info('delete reserved payload')
    let parsedSdp = SDPTools.parseSDP(sdp)
    if(parsedSdp && parsedSdp.media && parsedSdp.media.length){
        for(let j = 0; j<parsedSdp.media.length; j++){
            let media = parsedSdp.media[j]
            if(typeof(media.payloads) === 'number'){
                media.payloads = media.payloads.toString()
            }
            if(media.type === type && media.payloads && media.payloads.split(" ").length){
                let payloads = media.payloads.split(" ")
                for(let k = 0; k < payloads.length; k++){
                    if(reservedPayloads.includes(Number(payloads[k]))){
                        log.warn('Payload type 2 is marked reserved due to conflicting use')
                        SDPTools.removeCodecByPayload(parsedSdp, j, reservedPayloads)
                        break
                    }
                }
            }
        }
        sdp = SDPTools.writeSDP(parsedSdp)
    }

    return sdp
}

/**
 * Modify the direction, delete ssrcs, ssrcGroups
 * @param parsedSdp
 */
WebRTCSession.prototype.removeSSRC = function (parsedSdp) {
    let This = this
    for (let i = 0; i < parsedSdp.media.length; i++) {
        let type = parsedSdp.media[i].content || parsedSdp.media[i].type
        let stream = This.localStreams[type]
        if (!stream && type !== 'audio') {
            parsedSdp.media[i].direction = 'recvonly'
            delete parsedSdp.media[i].ssrcs
            delete parsedSdp.media[i].ssrcGroups
            delete parsedSdp.media[i].msid
        }
    }
}

/**
 * Modify msid && trackid
 * @param parsedSdp
 * @param msid
 */
WebRTCSession.prototype.renameMediaMsid = function (parsedSdp, msid){
    let This = this
    for (let i = 0; i < parsedSdp.media.length; i++) {
        let media = parsedSdp.media[i]
        let randomSuffix = gsRTC.generateUUID()
        if(media.type === 'audio'){
            if(media.ssrcs && media.ssrcs.length){
                media.ssrcs.forEach(function (ssrc){
                    if(ssrc.attribute === 'msid'){
                        ssrc.value = msid + '_' + randomSuffix + ' audio'
                    }
                })
            }
            if(media.msid) {
                media.msid.msid = msid + '_' + randomSuffix
                media.msid.trackid = 'audio'
            }
        }else {
            if (media.content && media.content === 'main') {
                if(media.ssrcs && media.ssrcs.length){
                    media.ssrcs.forEach(function (ssrc){
                        if(ssrc.attribute === 'msid'){
                            ssrc.value = msid + '_' + randomSuffix + ' main-video'
                        }
                    })
                }
                if(media.msid) {
                    media.msid.msid = msid + '_' + randomSuffix
                    media.msid.trackid = 'main-video'
                }
            } else if (media.content && media.content === 'slides') {
                if(media.ssrcs && media.ssrcs.length){
                    media.ssrcs.forEach(function (ssrc){
                        if(ssrc.attribute === 'msid'){
                            ssrc.value = msid + '_' + randomSuffix + ' slides-video'
                        }
                    })
                }
                if(media.msid) {
                    media.msid.msid = msid + '_' + randomSuffix
                    media.msid.trackid = 'slides-video'
                }
            }
        }
    }
}

/**
 * 保存自己的三个媒体行的MID值，key 为audio/main/slides
 * @param parsedSdp
 */
WebRTCSession.prototype.saveOwnMediasMid = function (parsedSdp){
    let This = this
    let isMidSaved = true
    Object.keys(This.mids).forEach(function (key){
        if(This.mids[key] === ''){
            isMidSaved = false
        }
    })

    if(!isMidSaved){
        for (let i = 0; i < parsedSdp.media.length; i++) {
            let media = parsedSdp.media[i]
            let type
            if(media.type === 'audio'){
                type = 'audio'
                This.mids[type] = media.mid
            }else if(media.content){
                type = media.content
                This.mids[type] = media.mid
            }
        }
        log.info("save Medias Mid: " + JSON.stringify(This.mids, null, '    '))
    }
}

/**
 * Remove redundant codes
 * @param parsedSdp
 */
WebRTCSession.prototype.trimCodec = function (parsedSdp) {
    let This = this
    if (parsedSdp.media && parsedSdp.media.length) {
        for (let i = 0; i < parsedSdp.media.length; i++) {
            let media = parsedSdp.media[i]
            let codec = ['VP8', 'VP9']
            if (media.type === 'video'){
                // move red_ulpfec
                if (localStorage.getItem('redulpfecEnabled') !== 'true') {
                    log.info('move red && ulpfec')
                    codec.push('red', 'ulpfec')
                }

                This.trimH264Codec(parsedSdp, i)
                SDPTools.removeCodecByName(parsedSdp, i, codec)
            }
        }
    } else {
        log.warn('trimCodec error media: ' + parsedSdp.media)
    }
}

/**
 * delete H264 codec，only keep the first one
 * @param parsedSdp
 * @param index
 */
WebRTCSession.prototype.trimH264Codec = function (parsedSdp, index) {
    let media = parsedSdp.media[index]
    let priorityCodec = this.getExternalEncoder(media)

    let h264Codec = SDPTools.getCodecByName(parsedSdp, index, ['H264'])
    if (h264Codec && h264Codec.length) {
        let removeList = []
        if (!priorityCodec) {
            let topPriorityCodec = h264Codec.splice(1, h264Codec.length)
            removeList.push(topPriorityCodec)

            // If profile-level-id does not exist, set to 42e028
            for (let i = 0; i < media.fmtp.length; i++) {
                if (media.fmtp[i].payload === topPriorityCodec) {
                    let config = media.fmtp[i].config
                    if (config.indexOf('profile-level-id') < 0) {
                        config = config + ';profile-level-id=42e028'
                    }
                }
            }
        } else {
            h264Codec.forEach(function (pt) {
                if (pt !== priorityCodec) {
                    removeList.push(pt)
                }
            })
        }
        SDPTools.removeCodecByPayload(parsedSdp, index, removeList)
    }
}

/**
 * get codec to enable ExternalEncoder
 * @param media
 * @returns {*}
 */
WebRTCSession.prototype.getExternalEncoder = function (media) {
    let codec
    if (media && media.fmtp && media.fmtp.length) {
        for (let i = 0; i < media.fmtp.length; i++) {
            let config = media.fmtp[i].config
            if (config.indexOf('packetization-mode=1') >= 0 && config.indexOf('profile-level-id=42e0') >= 0) {
                codec = media.fmtp[i].payload
                break
            }
        }
        if (!codec) {
            for (let i = 0; i < media.fmtp.length; i++) {
                let config = media.fmtp[i].config
                if (config.indexOf('packetization-mode=1') >= 0 && config.indexOf('profile-level-id=4200') >= 0) {
                    codec = media.fmtp[i].payload
                    break
                }
            }
        }
    }

    return codec
}

/**
 * 主流不同分辨率对应的videoBitrate设置
 * （1）分辨率为 360P 或 会中视频数量已超过4个时，maxBitRate 设置 为172K
 * （2）分辨率为 720P 时，maxBitRate 设置为 512K
 * （3）)分辨率为 1080P 时，maxBitRate 设置为 1024K
 * @param resolution
 * @returns {null}
 */
WebRTCSession.prototype.getMaxBitRate = function (resolution){
    log.info('getMaxBitRate resolution ' + resolution)
    if(!resolution){
        log.warn('Invalid resolution parameter: ' + resolution)
        return null
    }

    let maxBitRate = null
    resolution = parseInt(resolution)
    let currentVideoStreamCount = parseInt(sessionStorage.getItem('currentVideoStreamCount'))
    log.info('currentVideoStreamCount ' + currentVideoStreamCount)
    if((resolution === 360) || currentVideoStreamCount > 4){
        maxBitRate = 172000;
    }else if(resolution === 720){
        maxBitRate = 512000;
    }else if(resolution === 1080){
        maxBitRate = 1024000;
    }

    log.info("get maxBitRate:  " + maxBitRate);
    return maxBitRate
}

/**
 * 在用户带宽不足的时候，使用DSCP来标记和优先化WebRTC数据包
 * @param type Enum: audio/main/slides
 * @returns {{networkPriority: string, priority: string}}
 */
WebRTCSession.prototype.getPreferredDscp = function(type){
    let rtcPriorityType = ['very-low', 'low', 'medium', 'high']
    let preferredDscp = {
        priority: '',
        networkPriority: ''
    }

    let priority = localStorage.getItem(type + 'EncodingsPriority')
    let networkPriority = localStorage.getItem(type + 'EncodingsNetworkPriority')
    if(priority && priority.trim){
        priority = priority.trim()
    }
    if(networkPriority && networkPriority.trim){
        networkPriority = networkPriority.trim()
    }

    // priority and networkPriority are set to high by default to enable DSCP
    if(rtcPriorityType.includes(priority)){
        preferredDscp.priority = priority
    }else {
        log.info('Invalid priority value, ' + priority)
        preferredDscp.priority = 'high'
    }
    if(rtcPriorityType.includes(networkPriority)){
        preferredDscp.networkPriority = networkPriority
    }else {
        log.info('Invalid networkPriority value, ' + priority)
        preferredDscp.networkPriority = 'high'
    }

    log.info('get preferred dscp:' + JSON.stringify(preferredDscp, null, '   '))
    return preferredDscp
}

/**
 * 设置上行编码码率参数，setLocalDescription 成功后设置
 * @param type
 */
WebRTCSession.prototype.setEncodingParameters = function (type){
    log.info(type + ' set encoding..')
    let This = this
    if(!GsRTC.prototype.isSetEncodingSupport()){
        return
    }

    let mid = This.mids[type]
    let transceiver = This.getTransceiver(type)
    if(!transceiver){
        log.warn(type + ' set encoding parameters: transceiver is not found')
        return
    }

    let sender = transceiver.sender
    if(sender && sender.getParameters){
        let videoParameters = sender.getParameters()
        let { browser, UIVersion} = gsRTC.getBrowserDetail();
        if (JSON.stringify(videoParameters) === '{}') {
            videoParameters.encodings = [{}]
        }else if(!videoParameters.encodings.length || !videoParameters.encodings[0]){
            videoParameters.encodings[0] = {}
        }
        let preferredDscp = This.getPreferredDscp(type)
        videoParameters.encodings[0].priority = preferredDscp.priority
        videoParameters.encodings[0].networkPriority = preferredDscp.networkPriority

        if(type === 'main'){
            let height = (This.RESOLUTION.CLIENT_MAIN_CURRENT_UP && This.RESOLUTION.CLIENT_MAIN_CURRENT_UP.height) || 360
            let maxBitrate = WebRTCSession.prototype.getMaxBitRate(height)
            videoParameters.encodings[0].maxBitrate = maxBitrate || 250000;
            if(browser !== 'safari' || (browser === 'safari' && UIVersion !== '13.1.2')){
                videoParameters.degradationPreference = 'maintain-framerate';
            }else{
                log.info('main: Safari browser does not support degradationPreference parameter modification')
            }
        } else if (type === 'slides') {
            videoParameters.encodings[0].maxBitrate = 512000;
            if(browser !== 'safari' || (browser === 'safari' && UIVersion !== '13.1.2')){
                videoParameters.degradationPreference = 'maintain-resolution';
            }else{
                log.info('slides: Safari browser does not support degradationPreference parameter modification')
            }
        }

        log.info(type + " set setParameters: " +  JSON.stringify(videoParameters, null, '    '))
        sender.setParameters(videoParameters).then(function () {
            log.info('set encoding parameters success')
        }).catch(function (error) {
            log.info('set encoding parameters error')
            log.error(error)
        })
    }else {
        log.info(type + ' set encoding parameters: sender or getParameters is null')
    }
}

/**
 * Control up bitrate bitrateControl, set before setRemoteDescription
 * @param parsedSdp
 * @param i
 * @param type
 *  B行AS|TIAS计算：(带宽换算 1Mbps=1000Kbps、1Kbps=1000bps)
 *  1、TIAS=获取的值：如 512kbps时，TIAS=512000 bps
 *  2、AS = TIAS/1000 + 192
 *  2022-03-23 带宽调整，规则如下:
 *  （1）本地视频开启时，媒体行 x-google-{min|start|max}-bitrate 设置为 1024K + videoBitrate
 *  （2）本地视频关闭时，默认设置 x-google-{min|start|max}-bitrate为 1024K
 * @returns {*}
 */
WebRTCSession.prototype.bitrateControl = function (parsedSdp, i, type){
    let This = this
    log.info('bitrate control type ' + type)
    if (!parsedSdp || !type) {
        log.warn("bitrate control: Invalid argument");
        return
    }

    let maxBitRate = 1024000
    if(type === 'video' && This.isLocalVideoOn){
        let height = (This.RESOLUTION.CLIENT_MAIN_CURRENT_UP && This.RESOLUTION.CLIENT_MAIN_CURRENT_UP.height) || 360
        let videoBitrate = WebRTCSession.prototype.getMaxBitRate(height)
        maxBitRate = maxBitRate + videoBitrate
    }

    log.info("set video bitrate: " + maxBitRate);
    SDPTools.setMediaBandwidth(parsedSdp, i, maxBitRate)
    SDPTools.setXgoogleBitrate(parsedSdp, maxBitRate, i)
    SDPTools.removeRembAndTransportCC(parsedSdp, i)
}

/**
 * add useDTX
 * @param sdp
 * @param codec
 */
WebRTCSession.prototype.addUsedtx  = function(sdp, codec){
    if(localStorage.getItem('usedtxEnabled') !== 'true'){
        log.info('usedtx enabled false')
        return sdp
    }

    let session = SDPTools.parseSDP(sdp)
    let payloads = []
    for(let i = 0; i < session.media.length; i++){
        let mediaSession = session.media[i]
        if(mediaSession.type === 'audio') {
            log.info(codec + ' codec enable usedtx')
            for (let j = 0; j < mediaSession.rtp.length; j++) {
                let rtp = mediaSession.rtp[j]
                if (rtp.codec === codec) {
                    payloads.push(rtp.payload)
                }
            }
            for (let index = 0; index < payloads.length; index++) {
                let pt = payloads[index]
                for (let item = 0; item < mediaSession.fmtp.length; item++) {
                    let fmtp = mediaSession.fmtp[item]
                    if (fmtp.payload === pt) {
                        if (fmtp.config === '') {
                            fmtp.config = 'usedtx=1'
                        } else {
                            if (fmtp.config.indexOf('usedtx=1') < 0) {
                                fmtp.config = fmtp.config + ';usedtx=1'
                            }
                        }
                    }
                }
            }
            break
        }
    }
    sdp = SDPTools.writeSDP(session)
    return sdp
}

/**
 * deal with levelId
 * @param parsedSdp
 * @param type
 * @param  resolution
 */
WebRTCSession.prototype.modifyLevelId = function(parsedSdp, type, resolution){
    log.info("modify profile-level-id")
    let levelIdc = null
    switch (Number(resolution.height)) {
        case 2160:
            levelIdc = '33'
            break
        case 1080:
            levelIdc = '28'
            break
        case 720:
            levelIdc = '1f'
            break
        case 480:
            if(Number(resolution.width) === 640){
                levelIdc = '16'
            }else {
                levelIdc = '1e'
            }
            break
        case 360:
            levelIdc = '16'
            break
        case 272:
            levelIdc = '15'
            break
        default:
            levelIdc = '16'
            log.info('set default levelIdc, ' + levelIdc)
            break
    }
    log.info('set levelId of local sdp ' + levelIdc)

    for(let i = 0; i < parsedSdp.media.length; i++) {
        let media= parsedSdp.media[i]
        if(media.content && media.content === type){
            for(let j= 0 ; j < media.fmtp.length; j++){
                let index  = media.fmtp[j].config.indexOf('profile-level-id')
                if(index >= 0){
                    let str = media.fmtp[j].config.substr(index, 21);
                    let replacement =  str + levelIdc ;
                    media.fmtp[j].config = media.fmtp[j].config.replace(/profile-level-id=([a-zA-Z0-9]{6})/, replacement);
                }
            }
        }
    }
}

/**
 * The first 4 bits of remote sdp profile-level-id are changed to 42e0
 *     Because the profile-level-id carried by other app terminals may be 6400xx, win7 does not support 64 settings
 * @param parsedSdp
 */
WebRTCSession.prototype.modifyRemoteProfileLevelId = function(parsedSdp){
    let This = this
    log.info('set remote profile-level-id to 42e0xx')
    for (let i = 0; i < parsedSdp.media.length; i++){
        let media = parsedSdp.media[i]
        if(media && media.type === 'video' && media.fmtp && media.fmtp.length){
            media.fmtp.forEach(function(fmtp){
                if(fmtp.config){
                    let index  = fmtp.config.indexOf('profile-level-id')
                    if(index >= 0){
                        let levelIdc = fmtp.config.substr(index + 21, 2)
                        let replacement = 'profile-level-id=42e0' + levelIdc
                        fmtp.config = fmtp.config.replace(/profile-level-id=([a-zA-Z0-9]{6})/, replacement)

                        if(media.content === 'main'){
                            This.RESOLUTION.SERVER_MAIN_EXPECT_UP = This.getResolutionByLevelIdc(levelIdc)
                        }
                    }
                }
            })
        }
    }
}

/**
 * 调整m行顺序，创建多个m行时，audio会在最后面
 * 根据m行数量，修改 a=group:BUNDLE 和a=msid-semantic:
 * @param sdp
 * @returns {*}
 */
WebRTCSession.prototype.adjustOrderOfMLines = function (sdp) {
    log.info('Adjust the order of m lines')
    let This = this
    let parseSDP = SDPTools.parseSDP(sdp)
    let audioArray
    let applicationArray
    let videoArray = []
    let videoMid = 1
    let type = ''
    let originalMid
    parseSDP.msidSemantics = []
    parseSDP.groups = [{type: "BUNDLE", mids: 0}]

    for(let i=0; i< parseSDP.media.length; i++){
        originalMid = parseSDP.media[i].mid
        if(parseSDP.media[i].type === 'audio'){
            type = 'audio'
            // parseSDP.media[i].mid = This.getModifiedMid('audio')
            audioArray = parseSDP.media[i]
        }else if(parseSDP.media[i].type === 'application'){
            type = 'application'
            applicationArray = parseSDP.media[i]
        }
        else{
            type = This.getTypeByMid(videoMid)
            parseSDP.media[i].mid = videoMid
            parseSDP.media[i].content = type
            parseSDP.groups.push({type: "BUNDLE", mids: parseSDP.media[i].mid})
            videoArray.push(parseSDP.media[i])
            videoMid ++
        }
        parseSDP.msidSemantics.push( {semantic: "", token: "WMS"})
        This.saveMid(type, originalMid)
        This.mLineOrder.push(type)
    }
    This.mLineOrder = [...new Set(This.mLineOrder)];

    parseSDP.media = [audioArray]
    parseSDP.media = parseSDP.media.concat(videoArray)
    sdp = SDPTools.writeSDP(parseSDP)

    return sdp
}
