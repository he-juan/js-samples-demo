/**
 * 创建data
 */
WebRTCSession.prototype.createSendDataChannel = function (){
   log.info('create send data channel')
    let optional = {ordered: true, binaryType: 'arraybuffer'}
    let dataChannel =  this.pc.createDataChannel('sendDataChannel', optional)
    this.subscribeChannelEvents(dataChannel)
}

/**
 * 处理 dataChannel 监听事件
 * @param channel
 */
WebRTCSession.prototype.subscribeChannelEvents = function (channel){
    let This = this
    channel.onopen = function(){
       log.info(" receive data channel is open and ready to be used.")

        if(sendText){ // 针对发送端：在onopen触发后开始发送数据
            This.sendMessageByDataChannel(fileInfo)
            This.readFileToSend({lineId: fileInfo.lineId, content: sendText})
        }
    }

    channel.onmessage = function (e){
        // log.info('channel receive message:', e.data)   // print too much
        if(e.data.byteLength){
            This.fileDownload(e)
        }else{
            This.handleChannelOnmessage(e.data)
        }
    }

    channel.onclosing = function (e){
        log.info('data channel close:', e)
        if(pageName === 'quicall'){
            gsRTC.clearSession({lineId: This.lineId})
        }
    }

    This.pc.dataChannel = channel
}

/**
 * 处理 data channel 收到的消息
 * @param message
 */
WebRTCSession.prototype.handleChannelOnmessage = function (message){
    log.info('handle channel on message', message)
    if(typeof message === 'string'){
        message = JSON.parse(message)
    }

    let This = this
    let lineId
    if(pageName === 'quicall'){
        remoteShareInfo.lineId = message.lineId
    }

    if(message.type){
      if(message.lineContent){
          lineId = This.getMatchLocalLineId({lineId: message.lineId})  || message.lineContent.remote
      }else{
          lineId = message.lineId
      }
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
              if(pageName === 'quicall'){
                  remoteShareInfo.shareType = 'shareFile'
              }
              if(message.state === 'receive'){
                 log.info('remote consent')
                  session.readFileToSend({lineId: session.lineId, content: sendText})
              }else if(message.state === 'reject') {
                 log.info('remote reject')
                  switchSendStatus('reject')
              }else if(message.state === 'cancel'){
                  if(pageName === 'shareScreen'){
                      notice({ type: 'warn', value: currentLocale['L127']})
                      fileCountDownTimer && countDownFile()
                  }else if(pageName === 'quicall') {
                      countDownTimer && countDown()
                  }
              }else if(message.state === 'timeout'){
                  switchSendStatus('timeout')
              }else{
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
                  if(pageName === 'shareScreen'){
                      gsRTC.trigger('shareScreenFileConfirmPopup', data)
                  }else if(pageName === 'quicall' && message.popup){
                      gsRTC.trigger('quicallFileConfirmPopup', data)
                  }
              }
              break;
          case 'mouseDown':
          case 'mouseMove':
          case 'mouseUp':
          case 'mouseLeave':
          case 'remotePosition':
          case 'areaDelete':
          case 'allDelete':
          case 'pausePainting':
          case 'textFlag':
          case 'noteFlag':
              gsRTC.trigger("onRemoteMousePosition", message)
              break
          case 'streamChange':
              gsRTC.trigger("onRemoteStreamChange", message)
              break;
          case 'socketStatus':
                if(message.state === 'close'){
                    // 对端ws连接异常，关闭共享页面
                    gsRTC.trigger('errorTip', gsRTC.CODE_TYPE.PEER_WEBSOCKET_CLOSED.codeType, message.lineId)
                }
              break
          default:
              log.info("get current type: " + message.type)
              break;
      }
    }else {
        This.handleShareRequestMessage(message)
    }
}

/**
 * 通过dataChannel发送消息
 * @param message
 * @param noStringify true: message不转换为字符串
 */
WebRTCSession.prototype.sendMessageByDataChannel = function (message, noStringify){
   log.info('send message by data channel:', message)
    let This = this
    if(!This.pc || !This.pc.dataChannel){
       log.info('send message by data channel error')
        return
    }
    let dataChannel = This.pc.dataChannel
    if(!noStringify){
        message = JSON.stringify(message)
    }

    switch(dataChannel.readyState) {
        case "connecting":
            log.info(`Connection not open, queueing: ${message}`);
            This.sendBuffer.push(message)
            break;
        case "open":
            // log.info(`The current connection is successful, and data can be sent`);
            // 先发送buffer数据
            while (This.sendBuffer.length > 0){
                const msg = This.sendBuffer.shift()
                dataChannel.send(msg)
            }

            dataChannel.send(message)
            break;
        case "closing":
            log.warn(`Attempted to send message while closing`);
            break;
        case "closed":
            log.warn("Error! Attempt to send while connection closed.");
            break;
        default:
            break
    }
}

/**
 * 读取文件并发送
 * @param data
 */
WebRTCSession.prototype.readFileToSend = function (data){
    if(!data || !data.content){
       log.info('nothing to process')
        return
    }

    let This = this
    let file = data.content
    let chunkSize = 16384
    let fileReader = new FileReader()
    let offset = 0
    let readSlice = o => {
        let slice = file.slice(offset, o + chunkSize)
        fileReader.readAsArrayBuffer(slice)
    }
    let fileReaderOnload = function (e){
        try {
            This.sendMessageByDataChannel(e.target.result, true)

            offset += e.target.result.byteLength
            progress.value = offset
            schedule.textContent = (offset/file.size*100).toFixed() + '%'
            if (offset < file.size) {
                readSlice(offset)
            }else if(offset === file.size){
               log.info('send success')
                switchSendStatus('success')
                fileInfo = null
                sendText = null
            }
        }catch(e){
           log.info('send fail')
            if(pageName === 'shareScreen'){
                notice({ type: 'warn', value: currentLocale['L129']})
            }
            switchSendStatus('fail')
        }
    }

    fileReader.addEventListener('error', error => log.error('Error reading file:', error))
    fileReader.addEventListener('abort', event => log.info('File reading aborted:', event))
    fileReader.addEventListener('load', fileReaderOnload)
    readSlice(0)

    This.fileReader = fileReader
}

/**
 * 自动下载共享文件
 * @param event
 */
WebRTCSession.prototype.fileDownload = function (event) {
    let This = this
    This.receiveBuffer.push(event.data)
    This.receivedSize += event.data.byteLength
    if (This.receivedSize === This.fileSize) {
       log.info('down load file: ', This.fileName)
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

