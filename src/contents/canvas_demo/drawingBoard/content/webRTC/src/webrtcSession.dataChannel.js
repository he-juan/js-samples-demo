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

        if(localAccountLists){
            let param ={
                type: 'remoteAccount',
                lineContent: {local: This.lineId, remote: This.remoteLineId},
                lineData: lineData,
                accountLists: localAccountLists
            }
            This.sendMessageByDataChannel(param)
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

    if(pageName === 'quicall'){
        remoteShareInfo.lineId = message.lineId
    }

    if(!message.type){
        this.handleShareRequestMessage(message)
    }else{
        let lineId
        if(message.lineContent && message.lineContent.remote){
            lineId =  message.lineContent.remote
        }else{
            lineId = message.lineId
        }
        gsRTC.handleEventContent({lineId: lineId, msg: message})
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
    if(message.state === 'timeout'){
        log.warn('receive timeout ' + This.fileName)
        let file = This.receiveTimeoutFileList.find(item => {
            return item.name === This.fileName
        })
        if(!file){
            This.receiveTimeoutFileList.push({
                name: This.fileName,
                size: This.fileSize
            })
        }
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

            /** 针对 浏览器 websocket 断开， 自动检测到当前是连接状态为failed 且 dataChannel 状态为closed状态 **/
            if(This.pc.connectionState === 'failed'){
               log.warn("The current browser peerconnection detected connection status failed. ")
               gsRTC.trigger("closeAllShareLine", {lineId: This.lineId})
               for(let session of gsRTC.webrtcSessions){
                   gsRTC.clearSession({lineId: session.lineId})
               }
            }
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
                for(let i in This.sendTimeoutFileList){
                    if(This.sendTimeoutFileList[i].name === file.name){
                        This.sendTimeoutFileList.splice(i, 1)
                    }
                }
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
        if(SelectedList.length > 0 && isresendFile){
            log.info('received completed, delete corresponding files: ' + This.fileName)
            This.removeFileList(This.fileName)
        }
    }
}

WebRTCSession.prototype.removeFileList = function(name){
    log.info('removeFileList: ' + name)
    let This = this
    // 移除接收完成的文件以及子节点
    for(let i = 0; i < SelectedList.length; i++){
        if(SelectedList[i].name === name){
            remoteFileNode(SelectedList[i].name)
            SelectedList.splice(i, 1)
        }
    }
    // 移除接收列表里对应的文件
    for(let n in This.receiveTimeoutFileList){
        if(This.receiveTimeoutFileList[n].name === name){
            This.receiveTimeoutFileList.splice(n, 1)
        }
    }
    // 如果列表中还存在 那就代表用户选了多个，那就继续请求发送
    if(SelectedList.length > 0){
        This.fileName = SelectedList[0].name
        This.fileSize = Number(SelectedList[0].size)
        This.receiveBuffer = []
        This.receivedSize = 0
        This.sendMessageByDataChannel({
            lineId: clickContent.localLineId,
            type: 'fileInfo',
            state: 'resend',
            content: {
                name: SelectedList[0].name,
                size: SelectedList[0].size
            }
        })
    }else {
        // 如果选择的文件发送完了，就将是否重传文件的状态设置回去
        isresendFile = false
    }
}