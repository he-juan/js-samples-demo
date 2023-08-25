
/**
 * save video resolution
 * @param resolution
 * @param type
 */
WebRTCSession.prototype.setVideoResolution = function (resolution, type) {
    if (!resolution || !type) {
        log.warn('setVideoResolution: INVALID PARAMETERS')
        return
    }

    if (this.RESOLUTION[type]) {
        this.RESOLUTION[type] = resolution
        log.info('save expect ' + type + ' resolution: ' + resolution.height)
    } else {
        log.info('unknown resolution: ' + type)
    }
}

/**
 * get saved video resolution
 * @param type
 * @returns
 */
WebRTCSession.prototype.getVideoResolution = function (type) {
    if (!type) {
        log.warn('getVideoResolution: INVALID PARAMETER')
        return
    }
    let This = this
    let resolution

    if (this.RESOLUTION[type]) {
        resolution = This.RESOLUTION[type]
        log.info('get ' + type + ' resolution: ' + resolution)
    } else {
        log.warn('unknown resolution :' + type)
    }

    return resolution
}

/**
 * get max up resolution
 * @param resolution
 * @returns {*|{}}
 */
WebRTCSession.prototype.getMaxUpResolution = function (resolution) {
    log.info('This.o_resolution_up_sdp: ' + resolution)
    // Default is the resolution required by the server
    let result = resolution

    let maxResolution = gsRTC.getConfFromCookies('maxResolution')
    // 1080P mean auto, get resolution according server required
    if (maxResolution && maxResolution !== 'auto') {
        // When the resolution required by the server is greater than the user setting, the stream is taken according to the user setting
        let height
        if (!resolution) {
            result = {}
            height = maxResolution
        } else {
            if (resolution.height > maxResolution) {
                height = maxResolution
            }
        }

        if (height) {
            result = this.getResolutionByHeight(height)
        }
    }
    let browserDetails = gsRTC.getBrowserDetail()
    if (browserDetails.browser === 'firefox' && result.height >= 1080) {
        log.info('firefox 56 do not support 1080P.')
        result = this.getResolutionByHeight(720)
    }

    if (result) {
        log.info('Get max resolution = ' + result.height)
    } else {
        log.info('Get max resolution null ')
    }

    return result
}

/**
 * save current video up resolution when gum success
 * @param constraints
 *   { audio: false, video:{frameRate: 30, height: 360,width: 640 } }
 *   { audio: false, video:{frameRate: {exact: 30}, height: {exact: 360},width: {exact: 640} } }
 *   { audio: false, video:{frameRate: {ideal: 30}, height: {ideal: 360},width: {ideal: 640} } }
 *   { audio: false, video:{frameRate: {max: 30}, height: {max: 360},width: {max: 640} } }
 *   { audio: false, video: true}
 */
WebRTCSession.prototype.setVideoUpResolution = function (constraints) {
    if (!constraints || !constraints.video || !constraints.video.height || !constraints.video.width) {
        return
    }

    this.RESOLUTION.CLIENT_MAIN_CURRENT_UP = {
        width: constraints.video.width.exact || constraints.video.width.ideal || constraints.video.width.max || constraints.video.width,
        height: constraints.video.height.exact || constraints.video.height.ideal || constraints.video.height.max || constraints.video.height
    }
    log.info('set video up resolution: ' + JSON.stringify(this.RESOLUTION.CLIENT_MAIN_CURRENT_UP))
}

/**
 *  get resolution by given height
 * @param height
 * @returns {*}
 */
WebRTCSession.prototype.getResolutionByHeight = function (height) {
    if (!height) {
        log.warn('height is null')
        return null
    }
    let resolution

    height = parseInt(height)
    switch (height) {
        case 2160:
            log.info('3840 * 2160')
            resolution = {width: 3840, height: 2160}
            break
        case 1080:
            log.info('1920 * 1080')
            resolution = {width: 1920, height: 1080}
            break
        case 720:
            log.info('1280 * 720')
            resolution = {width: 1280, height: 720}
            break
        case 480:
            log.info('848 * 480')
            resolution = {width: 848, height: 480}
            break
        case 360:
            log.info('640 * 360')
            resolution = {width: 640, height: 360}
            break
        case 272:
            log.info('480 * 272')
            resolution = {width: 640, height: 360}
            break
        default:
            log.info(' Unknown resolution ' + height + ', default 640 * 360')
            resolution = {width: 640, height: 360}
            break
    }

    return resolution
}

/**
 * get resolution by given level_idc
 * @param levelIdc
 * @returns {{}}
 */
WebRTCSession.prototype.getResolutionByLevelIdc = function(levelIdc){
    log.info('get resolution by level idc ' + levelIdc)
    let resolution = {}
    let value = parseInt(levelIdc, 16)
    switch(value){
        case 21:
            resolution.width = 480
            resolution.height = 272
            break
        case 22:
            resolution.width = 640
            resolution.height = 360
            break
        case 30:
            resolution.width = 848
            resolution.height = 480
            break
        case 31:
            resolution.width = 1280
            resolution.height = 720
            break
        case 40:
            resolution.width = 1920
            resolution.height = 1080
            break
        default:
            resolution.width = 640
            resolution.height = 360
            log.warn("get resolution: The value is out of the range or invalid!" + levelIdc)
            break
    }

    log.info('resolution: ' + JSON.stringify(resolution))
    return resolution
}

/**
 * 获取分辨率协商结果
 * @returns {boolean}
 */
WebRTCSession.prototype.getResolutionNegotiationResult = function(){
    let This = this
    let result = false
    let localRes = {
        width: Number(This.RESOLUTION.CLIENT_MAIN_CURRENT_UP.width),
        height: Number(This.RESOLUTION.CLIENT_MAIN_CURRENT_UP.height)
    }
    let serverExpectRes = {
        width: Number(This.RESOLUTION.SERVER_MAIN_EXPECT_UP.width),
        height: Number(This.RESOLUTION.SERVER_MAIN_EXPECT_UP.height)
    }

    // Firefox上部分摄像头不支持640*360分辨率，只能取到640*480
    if((localRes.width === serverExpectRes.width && localRes.height === serverExpectRes.height)
        || (localRes.width === 640 && localRes.height === 480 && serverExpectRes.width === 640 && serverExpectRes.height === 360)
    ){
        result = true
    }else {
        log.warn('local up resolution ' + JSON.stringify(localRes))
        log.warn('server expect up resolution ' + JSON.stringify(serverExpectRes))
    }

    log.warn('resolution negotiation success? ' + result)
    return result
}
