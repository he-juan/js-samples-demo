/**
 * 打开文件弹窗
 */
function openFilePopup (){
    filePopup.classList.toggle('minimized', true)
    filePopupState = true
}

/**
 *  关闭文件弹窗
 */
function closeFilePopup (){
    filePopup.classList.toggle('minimized', false)
    if(sendStatus === 'end'){
        fileNameIcon.classList.toggle('file-name-icon_show', true)
        fileContent.classList.toggle('file-content_selected', false)
        fileTailButton.classList.toggle('file-tail-button-show', false)
        fileBodyContent.classList.toggle('file-body-content_disable', false)
        fileContent.textContent = currentLocale['L125']
        fileBodyTips.innerHTML = ''
        schedule.textContent = '0%'
        progress.value = 0
        fileInfo = null
        sendText = null
    }
    filePopupState = false
}

/**
 * 计算文件大小，bytes转换到KB,MB,GB
 * @param limit
 * @returns {string}
 */
function formatFileSize (limit){
    var size = "";
    if(limit < 0.1 * 1024){                            //小于0.1KB，则转化成B
        size = limit.toFixed(2) + "B"
    }else if(limit < 0.1 * 1024 * 1024){            //小于0.1MB，则转化成KB
        size = (limit/1024).toFixed(2) + "KB"
    }else if(limit < 0.1 * 1024 * 1024 * 1024){        //小于0.1GB，则转化成MB
        size = (limit/(1024 * 1024)).toFixed(2) + "MB"
    }else{                                            //其他转化成GB
        size = (limit/(1024 * 1024 * 1024)).toFixed(2) + "GB"
    }

    var sizeStr = size + "";                        //转成字符串
    var index = sizeStr.indexOf(".");                    //获取小数点处的索引
    var dou = sizeStr.substr(index + 1 ,2)            //获取小数点后两位的值
    if(dou == "00"){                                //判断后两位是否为00，如果是则删除00
        return sizeStr.substring(0, index) + sizeStr.substr(index + 3, 2)
    }
    return size
}

/**
 * 选择文件
 * @param param
 * {
 *     lineId:1,
 *     localShare:true,
 *     shareType:"shareFile"
 * }
 **/
function fileUploadOnClick (param){
    console.log('file upload onclick param:', param)
    if(sendText && !filePopupState){
        openFilePopup()
    }else{
        if(sendStatus === 'start'){
            console.log('Selecting files is not allowed during sending')
        }else{
            console.log('select file')
            let fileBtn = document.createElement('input')
            fileBtn.type = 'file'
            fileBtn.onchange = function (){
                sendText = this.files[0]
                console.log(`file upload onselect. File is ${[sendText.name, sendText.size, sendText.type, sendText.lastModified].join(' ')}`);
                progress.max = sendText.size
                fileInfo = {
                    type: 'fileInfo',
                    name: sendText.name,
                    size: sendText.size
                }

                sendFile(param)

                if(!filePopupState){
                    openFilePopup()
                }
            }
            fileBtn.click()
        }
    }
}

/**
 * 取消或者重新发送
 */
function handleFileAction (){
    console.log('handle file action')
    if(sendStatus === 'start'){
        console.log('cancel file send.')
        cancelFileSend()
    }else if(sendText){
        console.log('file resend')
        sendFile()
    }
}

/**
 * 发送文件数据
 */
function sendFile(param = {}){
    switchSendStatus('start')

    let session
    if(pageName === 'shareScreen'){
        // 共享桌面时，popup页面也可能存在session
        fileInfo.lineId = currentLocalLine
        session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
        if(session){
            session.sendMessageByDataChannel(fileInfo)
        }
    }else {
        fileInfo.lineId = param.lineId || clickContent.lineId

        // 发送失败后重新发送
        session = WebRTCSession.prototype.getSession({key: 'lineId', value: clickContent.lineId})
        if(!session){
            let data =  {
                lineId: param.lineId || clickContent.lineId,
                localShare: true,
                shareType:  'shareFile'
            }
            gsRTC.createSessionWithChannelOnly(data)
        }else {
            console.log('start send')
            fileInfo.popup = true
            session.sendMessageByDataChannel(fileInfo)
        }
    }
    sendStatus = 'start'
}


/**
 * 取消发送文件
 */
function cancelFileSend(){
    fileInfo = null
    sendText = null
    sendStatus = 'end'
    fileUpload.classList.remove('GRP-icon-upload-ash')
    fileUpload.classList.add('GRP-icon-upload')

    let session
    if(pageName === 'shareScreen'){
        session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
        session.sendMessageByDataChannel({lineId: currentLocalLine, type: 'fileInfo', state: 'cancel'})
        closeFilePopup()
        session.fileReader?.abort()
    }else {
        let session = WebRTCSession.prototype.getSession({key: 'lineId', value: clickContent.lineId})
        if(!session){
            closeFilePopup()
            return
        }
      
        if(session.pc && session.pc.dataChannel && session.pc.dataChannel.readyState !== 'open'){
            let message =  {
                cancelRequest: {line: clickContent.lineId, cancelReqId: session.reqId, cancelReqCmd: 'Cancel sending files', reqId: parseInt(Math.round(Math.random() * 100))},
                local_line: clickContent.lineId
            }
            popupSendMessage2Background({ cmd: 'cancelRequest', data: JSON.stringify(message) })
        }else {
            session.sendMessageByDataChannel({lineId: clickContent.lineId, type: 'fileInfo', state: 'cancel'})
            closeFilePopup()
            session.fileReader?.abort()
        }
    }
}

/**
 * 切换发送状态
 * @param e
 */
function switchSendStatus (e){
    console.log('switch send status: ' + e)
    switch(e){
        case 'start':
            // 1、移除成功或失败的提示以及样式
            fileBodyTips.textContent = ''
            fileBodyTips.classList.remove('file-body-tips-failed')
            fileBodyTips.classList.remove('file-body-tips-success')
            // 2、添加进度条和进度
            fileBodyTips.appendChild(progress)
            fileBodyTips.appendChild(schedule)
            schedule.textContent = '0%'
            // 3、修改按钮的文案
            fileTailButton.innerHTML = currentLocale['L124']
            // 4、将上传图标和文件选择区域替换成禁用状态
            fileUpload.classList.remove('GRP-icon-upload')                                  // 上传可用图标
            fileUpload.classList.add('GRP-icon-upload-ash')                                 // 上传禁用图标
            fileBodyContent.classList.toggle('file-body-content_disable', true)             // 上传模块禁用状态
            // 5、修改文件的名称以及显示样式
            fileContent.textContent = sendText.name + ' ' + formatFileSize(sendText.size)           // 文件名称
            fileNameIcon.classList.toggle('file-name-icon_show', false)                     // 文件图标可用状态
            fileTailButton.classList.toggle('file-tail-button-none', false)                 // 取消按钮可见状态
            fileContent.classList.toggle('file-content_selected', true)                     // 文件名称样式
            fileTailButton.classList.toggle('file-tail-button-show', true)                  // 取消按钮可用状态
            break
        case 'reject':
        case 'timeout':
        case 'success':
        case 'fail':
            // 1、将上传图标和文件选择区域替换成可用状态
            fileBodyContent.classList.toggle('file-body-content_disable', false)            // 上传模块可用
            fileUpload.classList.remove('GRP-icon-upload-ash')                              // 上传禁用图标
            fileUpload.classList.add('GRP-icon-upload')                                     // 上传可用图标
            // 2、重置进度条
            schedule.textContent = '0%'
            progress.value = 0
            // 3、将发送状态置为“ 结束 ”
            sendStatus = 'end'
            // 4、切换发送结果，以及提示文案
            fileBodyTips.innerHTML = ''
            if(e === 'success'){
                fileBodyTips.classList.remove('file-body-tips-failed')                      // 发送失败的样式
                fileBodyTips.classList.add('file-body-tips-success')                        // 发送成功的样式
                fileTailButton.classList.toggle('file-tail-button-none', true)              // 取消按钮可见状态
                fileBodyTips.textContent = currentLocale['L130']
            }else {
                fileBodyTips.classList.remove('file-body-tips-success')                     // 发送成功的样式
                fileBodyTips.classList.add('file-body-tips-failed')                         // 发送失败的样式
                fileTailButton.innerHTML = currentLocale['L120']
                if(e === 'reject'){
                    fileBodyTips.textContent = currentLocale['L126']
                }else if(e === 'timeout'){
                    fileBodyTips.textContent = currentLocale['L128']
                }else {
                    fileBodyTips.textContent = currentLocale['L131']
                }
            }
            break
        default:
            break
    }
}
