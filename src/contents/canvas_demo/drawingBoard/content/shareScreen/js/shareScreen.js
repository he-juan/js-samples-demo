let presentVideo = document.getElementsByClassName("presentVideo")[0]

// 视频相关
let textCenter = document.getElementsByClassName('textCenter')[0]
let videoTips = document.getElementsByClassName('videoTips')[0]
let shareIconSpan = document.getElementsByClassName('shareIcon-span')[0]

// 桌面共享对应按钮
let btnContent = document.getElementsByClassName("btnContent")[0]

// 桌面通知弹框
let tipPopup = document.getElementsByClassName("tipsContent-wrapper")[0]
let tipContentText = document.getElementsByClassName("tip-content-text")[0]
let closeWindow = document.getElementsByClassName("tip-btn")[0]
let closeWindowBtn = document.getElementsByClassName("closeWindowBtn")[0]
let countDownText        // 桌面通知 倒计时文本
let countDownTimer       // 桌面通知 倒计时定时器
let fileCountDownTimer   // 文件弹窗倒计时

// 邀请成员弹出框
let popup = document.getElementsByClassName('popup')[0]
let closeButton = document.getElementsByClassName('closeButton')                            // 关闭弹框
let hoverButton = document.getElementsByClassName("hoverButton")                               // video顶部按钮

let invitePopup = document.getElementsByClassName('invitePopup')[0]                         // 邀请列表

// 邀请列表页面
let callExisted = document.getElementsByClassName('callExisted')[0]
let newCall = document.getElementsByClassName('newCall')[0]
let callSubscript = document.getElementsByClassName('callSubscript')[0]

let callExistedContent = document.getElementsByClassName('callExistedContent')[0]           // 已有的通话
let newCallContent = document.getElementsByClassName('newCallContent')[0]                   // 新的通话
let inviteButton = document.getElementsByClassName('inviteButton')[0]
let dialButton = document.getElementsByClassName('dialButton')[0]

let memberPopup = document.getElementsByClassName('memberPopup')[0]                         // 成员列表
let inviteOthers = document.getElementsByClassName('inviteOthers')[0]

/********************************桌面通知弹框 蒙版***************************************/
let mb= document.createElement('div');

// 弹框内的表格内容
let tableName = document.getElementsByClassName('tableName')[0]
let tableAccount = document.getElementsByClassName('tableAccount')[0]
let tableState = document.getElementsByClassName('tableState')[0]
let tableName1 = document.getElementsByClassName('tableName1')[0]
let tableAccount1 = document.getElementsByClassName('tableAccount1')[0]
let tableState1 = document.getElementsByClassName('tableState1')[0]
let inviteInput = document.getElementsByClassName('inviteInput')[0]
let inviteInput1 = document.getElementsByClassName('inviteInput1')[0]
let memberTable = document.getElementsByClassName('memberTable')[0]
let kickOut = document.getElementsByClassName('kickOut')[0]
let popupConterMember = document.getElementsByClassName('popup-conterMember')[0]
let picBtn = document.getElementsByClassName("pictureInPicture")[0]                             // 画中画按钮
let hover = document.getElementsByClassName("hover")[0]

let tipsRemoteReply = document.getElementsByClassName('tips-remote-reply')[0]                   // 等待对端响应的提示

/****************************共享文件相关************************************/
let schedule = document.createElement('span')                                                   // 发送文件进度
let progress = document.createElement('progress')                                               // 发送文件进度条
let fileHead = document.getElementsByClassName('file-head')[0]                                  // 弹窗头部标题
let fileShare = document.getElementsByClassName('fileShare')[0]                                 // 打开文件弹窗按钮
let fileClose = document.getElementsByClassName('file-close')[0]                                // 关闭文件弹窗按钮
let filePopup = document.getElementsByClassName('file-popup')[0]                                // 文件选择弹窗
let fileUpload = document.getElementsByClassName('file-upload')[0]                              // 文件上传 icon
let fileContent = document.getElementsByClassName('file-content')[0]                            // 弹窗内容
let sharePopup = document.getElementsByClassName('requestShareBox')[0]                          // 共享文件弹窗
let fileBodyTips = document.getElementsByClassName('file-body-tips')[0]                         // 是否发送成功文案
let fileNameIcon = document.getElementsByClassName('file-name-icon')[0]                         // 文件icon，没有选择文件前是隐藏的
let fileShareText = document.getElementsByClassName('fileShare-text')[0]                        // 打开文件弹窗按钮文案
let fileTailButton = document.getElementsByClassName('file-tail-button')[0]                     // 发送/取消按钮
let fileBodyContent = document.getElementsByClassName('file-body-content')[0]                   // 弹窗主体部分
let requestShareText = document.getElementsByClassName('requestShare-text')[0]                  // 共享文件通知
let refuseShareBtn = document.getElementsByClassName('requestShare-bottom-reject')[0]           // 拒绝共享文件按钮
let acceptShareBtn = document.getElementsByClassName('requestShare-bottom-accept')[0]           // 接受共享文件按钮

fileBodyContent.onclick = selectFile                                                            // 选择文件
refuseShareBtn.onclick = handleClickEvent                                                       // 拒接文件
acceptShareBtn.onclick = handleClickEvent                                                       // 接收文件
fileShare.onclick = openFilePopup                                                               // 打开文件弹窗
fileClose.onclick = closeFilePopup                                                              // 关闭文件弹窗
fileTailButton.onclick = sendFile                                                               // 发送/取消文件

let currentLine
let localShare = false
let isMark = false                                                                              // 是否做标记
let sendStatus = 'prepare'                                                                      // 发送文件状态
let isLoadingOfShareScreen = false                                                              // 演示流是否加载
let fileInfo                                                                                    // 选择的文件信息
let sendText                                                                                    // 发送的文件
let remoteName                                                                                  // 等待对端响应提示的名字
let lineData                                                                                    // 线路信息
showContent()

/**
 * 开启演示
 **/
function startShareScreen(shareType = null) {
    if (!currentLine) {  // 判断当前是否存在线路
        notice({type: 'warn',value: currentLocale['L73'] })
        console.warn("shareScreen: current no lineId")
        return
    }

    let param =  {
        lineId: currentLine,
        localShare: localShare || true,
        shareType:  shareType || 'shareScreen'
    }
    if(!shareType || shareType === 'shareScreen'){
        let shareScreenCallback = function(event){
            console.warn("shareScreen callback:", JSON.stringify(event, null, '    '))
            tipsRemoteReply.classList.toggle('tips-remote-reply-show', false)
            if(event.message.codeType === 200){
                iconStyleToggle('startShareScreen')
            }else if(event.message.codeType === 955){
                // 提示： 取消开启演示。
                console.info("取消开启演示,准备关闭共享窗口")
                popupSendMessage2Background({cmd: 'closeScreenTab', lineId: currentLine})
            }
        }
        param.callback = shareScreenCallback
        gsRTC.screenShare(param)
    }else if(shareType === 'shareFile') {
        console.log("current share type is " + shareType)
        let shareFileCallback = function(event){
            console.warn("shareFile callback:" + JSON.stringify(event, null, '    '))
        }
        param.callback = shareFileCallback
        gsRTC.dataChannel(param)
    }
}
/**
 * 关闭演示
 **/
function stopShareScreen(lineId) {
    if (!currentLine) {  // 判断当前是否存在线路
        console.warn("stopShareScreen: current no lineId")
        return
    }

    let param = {
        lineId: lineId  || currentLine,
        isInitiativeStopScreen: true,
        callback: function (event) {
            console.warn("stopScreenShare:", event)
            localShare = false
            iconStyleToggle('stopShareScreen')
        }
    }
    gsRTC.stopScreenShare(param)
}

/**
 * 暂停演示/ 恢复演示
 **/
function pauseShareScreen(type) {
    if (!currentLine) {  // 判断当前是否存在线路
        console.warn("pauseShareScreen: current no lineId")
        return
    }

    let data = {
        isMute: false,
        lineId: currentLine,
        callback: function (data) {
            if (type === 'pauseShareScreen') {
                log.info("暂停演示callback： ", data)
            } else if(type === 'resumeShareScreen'){
                log.info("恢复演示callback： ", data)
            }
            iconStyleToggle(type)
        }
    }

    if (type === 'pauseShareScreen') {
        data.isMute = true
        gsRTC.pauseScreen(data)
    } else if (type === 'resumeShareScreen') {
        gsRTC.pauseScreen(data)
    }
}

/**
 * 切换演示
 **/
function switchScreenScreen() {
    if (!currentLine) {  // 判断当前是否存在线路
        console.warn("switchScreenScreen: current no lineId")
        return
    }

    let param = {
        lineId: currentLine,
        callback: function (event) {
            console.warn("switchScreenScreen callback:", event)
        }
    }
    gsRTC.switchScreenSource(param)
}

let webExtension
function popupSendMessage2Background(message) {
    if (!message) {
        return
    }
    message.requestType = 'shareScreenToBackground'
    webExtension.postMessage(message)
}

if (window.chrome && window.chrome.runtime && window.chrome.runtime.connect) {  // chrome
    webExtension = window.chrome.runtime.connect({ name: 'shareScreen' })
} else if (window.browser && window.browser.runtime && window.browser.runtime.connect) {  // firefox
    webExtension = window.browser.runtime.connect({ name: 'shareScreen' });
}

function handleBackgroundMessage(message) {
    if (!message) {
        console.log('receive handle background message null')
        return
    }
    if (typeof message === 'string') {
        message = JSON.parse(message)
    }

    console.log('receive handle background message: ', message)

    if(message.type){
        let data = message.data
        switch(message.type){
           case 'holdLine':
               gsRTC.holdStream({lineId: data.lineId, type: 'hold'})
               break;
           case 'unHoldLine':
               gsRTC.holdStream({lineId: data.lineId, type: 'unHold'})
               break;
           case 'localShareScreenHangup':
               stopShareScreen({lineId: data.lineId})
               break
           case 'closeWindow':                                  // 挂断时关闭共享窗口
               gsRTC.clearSession({lineId: data.lineId})
               gsRTC.trigger('closeScreenTab',{lineId: data.lineId})
               break
           case 'clearSession':
               gsRTC.clearSession({lineId: data.lineId})
               break
            case 'shareContent':
                startShareScreen(data.shareType)
                break
            case 'setLineStatus':
                if (message.lines) {
                    lineData = message.lines
                }
                break
           default:
               console.warn("print current type: "+ message.type)
                break

       }
    }else{
        let param
        let content = message.data
        let lineId = content.localLineId
        let shareType  = content.shareType
        let isCreateNewSession = content.isCreateNewSession
        let infoMsg = content.rspInfo
        let session
        currentLine = lineId
        localShare = message.localShare || content.localShare
        console.warn("lineId: " + lineId + ' isCreateNewSession: ' + isCreateNewSession)

        if (isCreateNewSession) {
            session = WebRTCSession.prototype.getSessionInstance(lineId)
        } else {
            session = WebRTCSession.prototype.getSession({ key: 'lineId', value: lineId })
        }

        if (!session) {
            console.warn("handleBackgroundMessage:no session")
            return
        }
        switch (message.cmd) {
            case 'remoteScreenShare':
                console.log('handle remote offer sdp')
                param = {
                    sdp: content.sdp.data,
                    lineId: lineId,
                    isUpdate: false,
                    remoteLineId: content.remoteLineId,
                    reqId: content.reqId,
                    shareType: content.shareType,
                    action: content.action,
                    callback: function (event) {
                        console.warn("sipAccept:", event)
                        iconStyleToggle('remoteScreenShare')
                    }
                }
                gsRTC.handleAccept(param)
                break
            case 'localScreenShare':
                console.log('local screen share')
                let browserDetails = gsRTC.getBrowserDetail()
                remoteName = content.remoteName
                if (shareType === 'shareScreen') {
                    if (browserDetails.browser === 'firefox') {
                        // TODO: Firefox 取流存在报错：Uncaught (in promise) DOMException: getDisplayMedia requires transient activation from a user gesture.
                        alert(`请点击页面的【 ${currentLocale['L92'] } 】开启共享`)
                    } else {
                        startShareScreen(shareType)
                    }
                } else {
                    startShareScreen(shareType)
                }
                break
            case 'remoteAnswerSdp':
                if (infoMsg && infoMsg.rspCode === 200) {
                    console.warn("handle remoteAnswerSdp")
                    let sdp = content.sdp.data
                    session.remoteLineId = content.remoteLineId
                    if (sdp) {
                        session.handleServerResponseSdp(sdp)
                    } else {
                        console.log('answer sdp is not offer now.')
                    }
                } else {
                    console.warn("cause: " + infoMsg && infoMsg.rspMsg)
                    session.isHandleDestroy = true
                    errorCodeTips(infoMsg && infoMsg.rspCode)
                    gsRTC.jsepRollback(session)
                    gsRTC.clearSession({lineId: currentLine})
                }
                break
            case 'updateScreen':
                console.warn("ready relay updateScreen")
                content.updateMessage.isFromBackground = true
                session.handleDataChannelMessage(content.updateMessage)
                break
            case 'updateScreenRet':
                console.warn("ready relay updateScreenRet")
                if (infoMsg && infoMsg.rspCode === 200) {
                    content.updateMessage.isFromBackground = true
                    session.handleDataChannelMessage(content.updateMessage)
                } else {
                    localShare = false
                    log.info("updateMediaSessionRet: current get codeType : " + infoMsg.rspCode + " cause: " + infoMsg.rspMsg)
                    // 提示内容
                    errorCodeTips(infoMsg && infoMsg.rspCode)
                    gsRTC.jsepRollback(session)
                }
                break
            default:
                console.warn("current no data")
                break
        }
    }
}

/** 关闭共享窗口的弹框倒计时
 * */
function countDown(errorContent, countDownNum = 10){
    console.warn("get error content: "  + JSON.stringify(errorContent, null, '    '))

    closeWindowBtn.innerText = currentLocale['L75']
    tipContentText.innerHTML = errorContent.value
    countDownText = document.getElementsByClassName('countDownText')[0]
    let countDownCallback = function(){
        if(countDownTimer){
            clearInterval(countDownTimer)
            countDownTimer = null
        }
        countDownNumber = countDownNum
        tipPopup.classList.toggle('tipsContent-wrapper-show')
        mb.parentNode.removeChild(mb);
        popupSendMessage2Background({cmd: 'closeScreenTab', lineId: errorContent.lineId})
    }
    if(!countDownTimer){
        countDownTimer = setInterval (function () {
            countDownNum--
            countDownText.innerText = `${countDownNum}s`
            if(countDownNum < 0){
                console.log("shareScreen end of countDown")
                countDownCallback()
                // popupSendMessage2Background({cmd: 'closeScreenTab', lineId: currentLine})
            }
        }, 1000);
    }else{
        countDownCallback()
    }
}

/** 是否接收文件的弹框倒计时
 * */
function countDownFile(countDownNum = 20){
    countDownNumText = document.getElementsByClassName('countDown_num')[0]
    let countDownCallback = function(){
        if(fileCountDownTimer){
            clearInterval(fileCountDownTimer)
            fileCountDownTimer = null
        }
        countDownNumber = countDownNum
        sharePopup.classList.toggle('requestShareBox-show',false)
    }
    if(!fileCountDownTimer){
        fileCountDownTimer = setInterval (function () {
            countDownNum--
            countDownNumText.innerHTML = `(${countDownNum}s)`
            if(countDownNum <= 0){
                console.log(" end of countDown")
                countDownCallback()
                gsRTC.sendFile({lineId: currentLine, type: 'fileInfo', state: 'timeout'})
            }
        }, 1000);
    }else{
        countDownCallback()
    }
}

function errorCodeTips(codeType, lineId){
    console.warn('get codeType is ' + codeType)
    tipsRemoteReply.classList.toggle('tips-remote-reply-show', false)
    let errorContent
    if(codeType === 486){
        errorContent = currentLocale['L105']
    }else if(codeType === 480){
        errorContent = currentLocale['L106']
    }else if(codeType === 300){
        errorContent = currentLocale['L107']
    }
    /*************** 处理通知内容 *******************/
    mb.classList.add('mb');
    document.body.appendChild(mb);
    tipPopup.classList.toggle('tipsContent-wrapper-show')
    let errorParam = {
        lineId: lineId,
        value: errorContent
    }
    countDown(errorParam)
}

/**
 * 消息提示
 * data.type 消息类型
 * data.value 消息内容
 **/
function notice(data){
    if(!data || !data.type || !data.value){
        console.log('参数缺失')
        return
    }
    let div1 = document.createElement('div')
    div1.className = 'el-notification'

    let div2 = document.createElement('div')
    div2.className = 'el-notification__icon'
    div1.appendChild(div2)

    let div3 = document.createElement('div')
    div3.className = 'el-notification__group'
    let H2 = document.createElement('h2')
    H2.className = 'el-notification__title'
    H2.textContent = currentLocale['L81']
    div3.appendChild(H2)

    let div4 = document.createElement('div')
    div4.className = 'el-notification__content'
    div4.textContent = currentLocale['L82']
    div3.appendChild(div4)

    div1.appendChild(div3)
    switch (data.type) {
        case 'success':
            div2.className = "el-notification__icon icon GRP-icon-success"
            H2.textContent = currentLocale['L77']
            div4.textContent = data.value
            break
        case 'error':
            div2.className = "el-notification__icon icon GRP-icon-error"
            H2.textContent = currentLocale['L78']
            div4.textContent = data.value
            break
        case 'warn':
            div2.className = "el-notification__icon icon GRP-icon-warning_s"
            H2.textContent = currentLocale['L79']
            div4.textContent = data.value
            break
        case 'info':
            div2.className = "el-notification__icon icon GRP-icon-message"
            H2.textContent = currentLocale['L80']
            div4.textContent = data.value
            break
    }
    document.body.appendChild(div1)
    div1.style.top = (document.getElementsByClassName('el-notification').length-1)  * 90 + 16 + 'px'
    div1.style.animation = 'fadein2 4s'
    setTimeout(() => {
        document.body.removeChild(div1)
    },4000)
}

/**
 * 生成邀请/成员列表
 **/
function createPopupTable(data) {
    let invite = [
        {name: 'Liliy', account: '3589', status: ''},
        {name: 'Jam', account: '3642', status: ''}
    ]
    for(let i in invite){
        let inviteBox = document.createElement('div')
        let span = document.createElement('span')
        let span1 = document.createElement('span')
        let span2 = document.createElement('span')

        inviteBox.className = 'head list'

        span.textContent = invite[i].name
        inviteBox.appendChild(span)

        span1.textContent = invite[i].account
        inviteBox.appendChild(span1)

        span2.textContent = invite[i].status
        inviteBox.appendChild(span2)

        left.appendChild(inviteBox)
    }

    let member = [
        {name: 'Liliy', account: '3589', status: ''},
        {name: 'Jam', account: '3642', status: ''},
        {name: 'Jam', account: '3642', status: ''}
    ]
    for(let i in member){
        let memberBox = document.createElement('div')
        let span = document.createElement('span')
        let span1 = document.createElement('span')
        let span2 = document.createElement('span')

        memberBox.className = 'head list'

        span.textContent = member[i].name
        memberBox.appendChild(span)

        span1.textContent = member[i].account
        memberBox.appendChild(span1)

        span2.textContent = member[i].status
        memberBox.appendChild(span2)

        popupConterMember.appendChild(memberBox)
    }

}

/**
 * 页面显示内容
 * */
function showContent(){
    textCenter.innerHTML = currentLocale['L87']
    videoTips.innerHTML = currentLocale['L88']
    shareIconSpan.innerHTML = currentLocale['L89']
    inviteButton.innerHTML = currentLocale['L90']
    memberTable.innerHTML = currentLocale['L91']
    inviteOthers.innerHTML = currentLocale['L95']
    tableName.innerHTML = currentLocale['L96']
    tableAccount.innerHTML = currentLocale['L97']
    tableState.innerHTML = currentLocale['L98']
    tableName1.innerHTML = '<span>图标</span>' + currentLocale['L96']
    tableAccount1.innerHTML = currentLocale['L97']
    tableState1.innerHTML = currentLocale['L98']
    callExisted.innerHTML = currentLocale['L99']
    newCall.innerHTML = currentLocale['L100']
    dialButton.innerHTML = currentLocale['L101']
    inviteInput.placeholder = currentLocale['L102']
    inviteInput1.placeholder = currentLocale['L102']
    kickOut.innerHTML = currentLocale['L103']
    fileShareText.innerHTML = currentLocale['L117']
    fileHead.innerHTML = currentLocale['L117']
    fileTailButton.innerHTML = currentLocale['L120']
    fileContent.innerHTML = currentLocale['L125']
    schedule.className = 'schedule'
}

/**
 * 侧边栏图标/样式切换
 **/
function iconStyleToggle(data){
    let dom = document.querySelectorAll('grp-button')   // 获取页面上的grp-button 组件
    if(data === 'pauseShareScreen'){
        dom[3].setAttribute('type', 'resumeShareScreen')
    }else {
        dom[3].setAttribute('type', 'pauseShareScreen')
    }
    switch(data){
        case 'startShareScreen':        // 开启演示
        case 'resumeShareScreen':       // 恢复共享
            dom[2].setAttribute('disabled', 'false')
            dom[2].setAttribute('type', 'switchShareScreen')
            dom[3].setAttribute('disabled', 'false')
            dom[4].setAttribute('disabled', 'true')
            break
        case 'shareScreen':
        case 'remoteScreenShare':       // 远端开启共享
            dom[2].setAttribute('disabled', 'true')
            dom[2].setAttribute('type', 'switchShareScreen')
            dom[3].setAttribute('disabled', 'true')
            dom[4].setAttribute('disabled', 'true')
            break
        case 'pauseShareScreen':        // 暂停共享
            dom[2].setAttribute('disabled', 'true')
            dom[3].setAttribute('disabled', 'false')
            dom[4].setAttribute('disabled', 'true')
            break
        case 'stopShareScreen':         // 停止共享
            dom[2].setAttribute('disabled', 'false')
            dom[2].setAttribute('type', 'shareScreen')
            dom[3].setAttribute('disabled', 'true')
            dom[4].setAttribute('disabled', 'true')
            break
        default:
            console.log('iconStyleToggle: ' + data)
            break
    }
}

/**
 * 计算文件大小
 **/
function change(limit){
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
 **/
function selectFile(){
    if(sendStatus === 'start'){
        console.log('Selecting files is not allowed during sending')
    }else{
        console.log('select file')
        let fileBtn = document.createElement('input')
        fileBtn.type = 'file'
        fileBtn.onchange = function () {
            sendText = this.files[0]
            console.log(`File is ${[sendText.name, sendText.size, sendText.type, sendText.lastModified].join(' ')}`);
            switchSendstatus('prepare')
            progress.max = sendText.size
            fileInfo = {lineId: currentLine, type: 'fileInfo', name: sendText.name, size: sendText.size}
        }
        fileBtn.click()
    }
    
}

// 发送/取消文件
function sendFile(){
    if(sendStatus === 'start'){
        console.log('change the start status to cancel processing')
        fileInfo = null
        sendText = null
        sendStatus = 'end'
        fileUpload.classList.remove('GRP-icon-upload-ash')
        fileUpload.classList.add('GRP-icon-upload')
        gsRTC.sendFile({lineId: currentLine, type: 'fileInfo', state: 'cancel'})
        closeFilePopup()
        fileReader.abort()
    }else if(sendText){
        console.log('start send')
        switchSendstatus('start')
        gsRTC.sendFile(fileInfo)
        sendStatus = 'start'
    }
    
}

window.onload = function () {
    if (webExtension) {
        webExtension.onMessage.addListener(handleBackgroundMessage)
        popupSendMessage2Background({ cmd: 'shareScreenOnOpen' })
    }
    let browserDetail = gsRTC.getBrowserDetail()
    if (browserDetail.browser === 'firefox') {
        videoTips.innerHTML = ''
        picBtn.classList.add('firefoxPicBtn')
        let domShare = document.querySelectorAll('grp-button')[2]
        domShare.setAttribute('disabled', 'false')
        domShare.setAttribute('type', 'shareScreen')
    }

    gsRTC.on('streamChange', function (data) {
        console.warn("streamChange:" + JSON.stringify(data, null, '   '))
        if (data.isLocal) {
            if (data.stream) {
                if (data.stream.getVideoTracks().length) {
                    presentVideo.srcObject = data.stream
                    presentVideo.onloadedmetadata = function () {
                        console.log("video play ...")
                        isLoadingOfShareScreen = true
                        presentVideo.play()
                    }
                    presentVideo.style.display = 'block'

                    console.log('显示本地演示流: ', data.stream.id)
                } else {
                    console.log('显示本地音频流: ', data.stream.id)
                }
            } else {
                can.fullScreenModel.toggleFullScreen(true)
                can.fullScreenModel.togglePictureInPicture(true)
                presentVideo.srcObject = null
                isLoadingOfShareScreen = false
            }
        } else {
            if (data.stream) {
                if (data.stream.getVideoTracks().length) {
                    presentVideo.srcObject = data.stream
                    presentVideo.onloadedmetadata = function () {
                        console.log("video play ...")
                        isLoadingOfShareScreen = true
                        presentVideo.play()
                    }
                    presentVideo.style.display = 'block'
                    console.log('显示远端演示流: ', data.stream.id)
                } else {
                    console.log('显示远端演示音频流：', data.stream.id)
                }
            } else {
                can.fullScreenModel.toggleFullScreen(true)
                can.fullScreenModel.togglePictureInPicture(true)
                presentVideo.srcObject = null
                isLoadingOfShareScreen = false
            }
        }
    })

    gsRTC.on('localSDPCompleted', function (message, localShare) {
        console.log('on local sdp completed.')
        if (localShare) {
            tipsRemoteReply.textContent = currentLocale['L116'].replace('{0}', remoteName)
            tipsRemoteReply.classList.toggle('tips-remote-reply-show', true)
            popupSendMessage2Background({ cmd: 'handleLocalOfferSdp', data: JSON.stringify(message) })
        } else {
            popupSendMessage2Background({ cmd: 'handleLocalAnswerSdp', data: JSON.stringify(message) })
        }
    })

    gsRTC.on('updateScreen', function (message, localShare) {
        if (!localShare) {
            popupSendMessage2Background({ cmd: 'receiveOfferUpdateSdp', data: message })
        } else {
            popupSendMessage2Background({ cmd: 'receiveAnswerUpdateSdp', data: message })
        }
    })

    gsRTC.on("closeScreenTab", function(data){
        console.warn("close screenTab")
        popupSendMessage2Background({cmd: 'closeScreenTab', lineId: data.lineId})
    })

    gsRTC.on("shareScreen",function(isSuccess){
        console.warn("trigger shareScreen",isSuccess)
        if(isSuccess){
            iconStyleToggle('shareScreen')
        }else{
            iconStyleToggle('stopShareScreen')
        }
    })

    gsRTC.on("stopShareScreen",function(){
        console.warn("trigger stopShareScreen")
        iconStyleToggle('stopShareScreen')
    })

    gsRTC.on('holdStatus',function(data){
        notice({ type: 'warn', value: currentLocale['L113']})
    })

    gsRTC.on('currentMousePosition',function(message){
        console.warn("message:",message)
        let position = message.position
        let getRatio = can.getPostionRatio(false)
        if(position && position.startX){
            position.startX = position.startX / getRatio.xRatio
            position.startY = position.startY / getRatio.yRatio
        }
        if(message.type === 'mousedown'){
            console.warn("远端 mousedown")
            can.canvasDown(position.startX, position.startY)
        }else if(message.type === 'mousemove'){
            console.warn("远端 mousemove")
            can.canvasMove(position.startX, position.startY, position.e)
        }else if(message.type === 'mouseup'){
            console.warn("远端 mouseup")
            can.canvasUp()
        }else if(message.type === 'mouseleave'){
            console.warn("远端 mouseleave")
            // can.canvasLeave()
        }else if(message.type === 'status'){
            console.warn("远端 mouseStatus")
            // initDraw(message.state, true)
            if(message.state === 'clearFlag'){
                can.clearCanvas()
            }
        }else if(message.type === 'remotePosition'){
            console.warn("远端 remotePosition")
           remoteWidth = position.width
           remoteHeight = position.height
        }
    })
}

/****************************** 按钮点击事件 *********************************************/

/** 关闭按钮点击事件
 * **/
for (let i in closeButton) {
    closeButton[i].onclick = closeButtonClick
}
/** 邀请列表页面切换点击事件
 **/
callExisted.onclick = callExistedClick
newCall.onclick = newCallClick
closeWindow.onclick = closeShareScreenWindow

/** 发送当前鼠标显示位置
 * */
function setCurrentMousePosition(data){
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLine})
    if(!session){
        log.warn("setCurrentMousePosition: session is not found")
        return
    }
    session.dataChannelSendMessage(data)
}

/** 关闭窗口点击事件
 **/
function closeShareScreenWindow(){
    countDown(currentLine)
}

function inviteClick() {
    // popup.style.display = 'flex'
    return
    popup.style.animation = 'fadein .5s'
    popup.style.animationFillMode = 'forwards';
    popup.style.minWidth = '1280px';
    popup.style.minHeight = '900px';
    invitePopup.style.display = 'flex'
}

function memberClick() {
    return
    popup.style.animation = 'fadein .5s'
    popup.style.animationFillMode = 'forwards';
    popup.style.minWidth = '1280px';
    popup.style.minHeight = '900px';
    memberPopup.style.display = 'flex'
}

function closeButtonClick() {
    popup.style.animation = 'fadein1 .5s'
    popup.style.minWidth = '0';
    popup.style.minHeight = '0';
    invitePopup.style.display = 'none'
    memberPopup.style.display = 'none'
}

function callExistedClick() {
    callExistedContent.style.marginLeft = '0'
    newCallContent.style.marginLeft = '720px'
    callExisted.style.color = '#288EF6'
    newCall.style.color = '#6E7176'
    callSubscript.style.left = '270px'
    inviteButton.style.display = 'block'
    dialButton.style.display = 'none'
}

function newCallClick() {
    callExistedContent.style.marginLeft = '-720px'
    newCallContent.style.marginLeft = '0'
    callExisted.style.color = '#6E7176'
    newCall.style.color = '#288EF6'
    callSubscript.style.left = '360px'
    inviteButton.style.display = 'none'
    dialButton.style.display = 'block'
}

// 接收/拒接文件
function handleClickEvent(event){
    if (!event || !event.target) {
        return
    }
    let value = event.target.textContent
    switch(value){
        case currentLocale['L84']:                  // 接受共享文件
            console.log('Accept sharing file')
            countDownFile()
            gsRTC.sendFile({lineId: currentLine, type: 'fileInfo', state: 'receive'})
            break
        case currentLocale['L83']:                 // 拒绝共享文件
            console.log('Deny sharing file')
            countDownFile()
            gsRTC.sendFile({lineId: currentLine, type: 'fileInfo', state: 'reject'})
            break
        default:
            break
    }
}

// 切换发送状态
function switchSendstatus(e){
    console.log('switchSendstatus: ' + e)
    switch(e){
        case 'prepare':
            // fileNameIcon.style.display = 'block'
            fileNameIcon.classList.toggle('file-name-icon_show', false)
            fileContent.classList.toggle('file-content_selected', true)
            fileContent.textContent = sendText.name + ' ' + change(sendText.size)
            fileTailButton.classList.toggle('file-tail-button-show', true)
            fileBodyTips.textContent = ''
            schedule.textContent = ''
            progress.value = 0
            break
        case 'start':
            fileBodyTips.textContent = ''
            fileBodyTips.classList.remove('file-body-tips-failed')
            fileBodyTips.classList.remove('file-body-tips-success')
            fileBodyTips.appendChild(progress)
            fileBodyTips.appendChild(schedule)
            fileTailButton.innerHTML = currentLocale['L124']
            fileUpload.classList.remove('GRP-icon-upload')
            fileUpload.classList.add('GRP-icon-upload-ash')
            fileBodyContent.classList.toggle('file-body-content_disable', true)
            break
        case 'success':
        case 'fail':
            fileBodyTips.innerHTML = ''
            schedule.textContent = ''
            progress.value = 0
            fileTailButton.innerHTML = currentLocale['L120']
            fileBodyContent.classList.toggle('file-body-content_disable', false)
            fileUpload.classList.remove('GRP-icon-upload-ash')
            fileUpload.classList.add('GRP-icon-upload')
            sendStatus = 'end'

            if(e === 'success'){
                fileBodyTips.classList.remove('file-body-tips-failed')
                fileBodyTips.classList.add('file-body-tips-success')
                fileBodyTips.textContent = currentLocale['L130']
            }else {
                fileBodyTips.classList.remove('file-body-tips-success')
                fileBodyTips.classList.add('file-body-tips-failed')
                fileBodyTips.textContent = currentLocale['L131']
            }
            break
        default:
            break
    }
}

// 打开文件弹窗
function openFilePopup(){
    filePopup.classList.toggle('minimized', true)
    if(!sendText){
        fileNameIcon.classList.toggle('file-name-icon_show', true)
        fileContent.classList.toggle('file-content_selected', false)
    }
}

// 关闭文件弹窗
function closeFilePopup(){
    filePopup.classList.toggle('minimized', false)
    if(sendStatus === 'end'){
        fileNameIcon.classList.toggle('file-name-icon_show', true)
        fileContent.classList.toggle('file-content_selected', false)
        fileTailButton.classList.toggle('file-tail-button-show', false)
        fileBodyContent.classList.toggle('file-body-content_disable', false)
        fileContent.textContent = currentLocale['L125']
        sendStatus = 'prepare'
        fileBodyTips.innerHTML = ''
        schedule.textContent = ''
        progress.value = 0
        fileTailButton.innerHTML = currentLocale['L120']
    }
}

window.onbeforeunload = function () {
    for (let i = 0; i < gsRTC.webrtcSessions.length; i++) {
        let session = gsRTC.webrtcSessions[i]
        console.warn("Users click to close the sharing page, Whether to use dataChannel to send destroyMediaSession:" + session.isHandleDestroy)
        if (currentLine === session.lineId) {
            if(!session.isHandleDestroy){
                popupSendMessage2Background({cmd: 'userClickCloseShare', data: {lineId:  currentLine}})
                gsRTC.clearSession({lineId: currentLine})
            }else {
                session.isHandleDestroy = false
            }
        }
    }
}