GsRTC.prototype.onSipEventStack = function (e) {
    log.info('==session event = ' + e.type)
    let This = this

    switch (e.type) {
        case 'iceRestartFailed':
        case 'websocketClose':
            if(This.screenSharing){
                // This.stopScreenShare()
            }else {
                log.warn('Sharing is not currently enabled')
            }
            break
        case 'hangupRequest':
            // This.stopScreenShare()
            break
        default:
            break
    }
}

