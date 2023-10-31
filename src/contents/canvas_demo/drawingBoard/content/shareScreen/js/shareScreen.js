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
let fileHead = document.getElementsByClassName('file-head')[0]                                  // 弹窗头部标题 // 打开文件弹窗按钮
let fileClose = document.getElementsByClassName('file-close')[0]                                // 关闭文件弹窗按钮
let filePopup = document.getElementsByClassName('file-popup')[0]                                // 文件选择弹窗
let fileUpload = document.getElementsByClassName('file-upload')[0]                              // 文件上传 icon
let fileContent = document.getElementsByClassName('file-content')[0]                            // 弹窗内容
let sharePopup = document.getElementsByClassName('requestShareBox')[0]                          // 共享文件弹窗
let fileBodyTips = document.getElementsByClassName('file-body-tips')[0]                         // 是否发送成功文案
let fileNameIcon = document.getElementsByClassName('file-name-icon')[0]                         // 文件icon，没有选择文件前是隐藏的 // 打开文件弹窗按钮文案
let fileTailButton = document.getElementsByClassName('file-tail-button')[0]                     // 发送/取消按钮
let fileBodyContent = document.getElementsByClassName('file-body-content')[0]                   // 弹窗主体部分
let requestShareText = document.getElementsByClassName('requestShare-text')[0]                  // 共享文件通知
let refuseShareBtn = document.getElementsByClassName('requestShare-bottom-reject')[0]           // 拒绝共享文件按钮
let acceptShareBtn = document.getElementsByClassName('requestShare-bottom-accept')[0]           // 接受共享文件按钮
refuseShareBtn.onclick = handleShareFileRequest                                                    // 拒接文件
acceptShareBtn.onclick = handleShareFileRequest                                                       // 接收文件 // 弹窗外选择文件

fileBodyContent.onclick = fileUploadOnClick                                                            // 弹窗内选择文件
fileClose.onclick = closeFilePopup                                                              // 关闭文件弹窗
fileTailButton.onclick = handleFileAction                                                        // 发送/取消文件

let currentLocalLine                                                                           // 当前本端线路id
let currentRemoteLine                                                                          // 当前远端线路id
let localShare = false
let isMark = false                                                                              // 是否做标记
let sendStatus                                                                                  // 发送文件状态
let isLoadingOfShareScreen = false                                                              // 演示流是否加载
let filePopupState = false                                                                      // 共享文件弹窗开关状态
let fileInfo                                                                                    // 选择的文件信息
let sendText                                                                                    // 发送的文件
let remoteName                                                                                  // 等待对端响应提示的名字
let lineData                                                                                    // 线路信息
let localAccountLists                                                                           // 本端总体账号信息
let localAccount                                                                                // 本端演示账号内容(id,name)
let pageName = 'shareScreen'
showContent()

function setDocumentTitle(){
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
    if(!session) {
        return
    }

    let stream = session.getStream('slides', true)
    if(stream){
        let shareType = WebRTCSession.prototype.getShareTypeByTrackSetting(stream)
        let title
        switch (shareType){
            case 'tab':  // tab页
                title = currentLocale['L132']
                break
            case 'screen':  // 屏幕
                title = currentLocale['L133']
                break
            case 'window':   // 窗口
                title = currentLocale['L134']
                break
            default:
                title = currentLocale['L133']  // for firefox
                break
        }
        document.title = currentLocale['L136'] + title
        console.log('set Sharing title ', title)
    }
}

/**
 * 开启演示
 **/
function startShareScreen(shareType = null) {
    if (!currentLocalLine) {  // 判断当前是否存在线路
        notice({type: 'warn',value: currentLocale['L73'] })
        console.log("shareScreen: current no lineId")
        return
    }

    let param =  {
        lineId: currentLocalLine,
        localShare: localShare || true,
        shareType:  shareType || 'shareScreen'
    }
    if(!shareType || shareType === 'shareScreen'){
        param.callback = function(event){
            console.log("shareScreen callback:", JSON.stringify(event, null, '    '))
            tipsRemoteReply.classList.toggle('tips-remote-reply-show', false)
            if(event.message.codeType === 200){
                iconStyleToggle('startShareScreen')
                setDocumentTitle()
            }else if(event.message.codeType === 955){
                // 提示： 取消开启演示。
                console.info("close share tab for cancel share.")
                popupSendMessage2Background({cmd: 'closeScreenTab', lineId: currentLocalLine})
            }
        }

        /**针对firefox、safari 做处理***/
        let shareBtn = document.querySelector("grp-button[type='shareScreen']")
        if(shareBtn){
            shareBtn.setAttribute('disabled', 'true')
        }

        gsRTC.screenShare(param)
    }
}
/**
 * 关闭演示
 **/
function stopShareScreen(lineId) {
    if (!lineId && !currentLocalLine) {  // 判断当前是否存在线路
        console.log("stopShareScreen: current no lineId")
        return
    }

    let param = {
        lineId: lineId  || currentLocalLine,
        isInitiativeStopScreen: true,
        callback: function (event) {
            console.log("stopScreenShare:", event)
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
    if (!currentLocalLine) {  // 判断当前是否存在线路
        console.log("pauseShareScreen: current no lineId")
        return
    }

    let data = {
        isMute: false,
        lineId: currentLocalLine,
        callback: function (data) {
            if (type === 'pauseShareScreen') {
                console.log("pause share screen callback： ", data)
            } else if(type === 'resumeShareScreen'){
                console.log("restore share screen callback： ", data)
            }
            iconStyleToggle(type)
            let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
            if(!session){
                log.warn("pauseShareScreen: session is not found")
                return
            }
            can.pausePainting = type === 'pauseShareScreen'
            session.sendMessageByDataChannel({
                type: 'pausePainting',
                lineId: currentRemoteLine,
                value: can.pausePainting,
                account: localAccount
            })
        }
    }

    if (type === 'pauseShareScreen') {
        data.isMute = true
    }
    gsRTC.pauseScreenShare(data)
}

/**
 * 切换演示
 **/
function switchScreenScreen() {
    if (!currentLocalLine) {  // 判断当前是否存在线路
        console.log("switchScreenScreen: current no lineId")
        return
    }

    let param = {
        lineId: currentLocalLine,
        callback: function (event) {
            console.log("switchScreenScreen callback:", event)
            if(event && event.codeType === 200){
                setDocumentTitle()
            }
        }
    }
    gsRTC.switchScreenSource(param)
}

let webExtension
let extensionNamespace
if (window.chrome && window.chrome.runtime && window.chrome.runtime.connect) {  // chrome
    extensionNamespace = chrome
    webExtension = window.chrome.runtime.connect({ name: 'shareScreen' })
} else if (window.browser && window.browser.runtime && window.browser.runtime.connect) {  // firefox
    extensionNamespace = browser
    webExtension = window.browser.runtime.connect({ name: 'shareScreen' });
}

/**
 * 桌面共享页发送消息到背景页
 * @param message
 */
function popupSendMessage2Background(message) {
    if (!message) {
        return
    }
    message.requestType = 'shareScreenToBackground'
    try{
        webExtension.postMessage(message)
    }catch(e){
        webExtension = extensionNamespace.runtime.connect({ name: 'shareScreen' })
        webExtension.onMessage.addListener(handleBackgroundMessage)
        webExtension.postMessage(message)
    }
}

/**
 * 设置本地canvas相关属性
 * @param message
 */
function updateLocalCanvasData(message){
    if(!message || !message.lines){
        return
    }

    lineData  = message.lines
    localAccount = getLocalAccountContent()
    /**针对本地canvas 创建工具栏**/
    can.createTools({account: localAccount, brushColor: can.canvasToolsBar.getBrushColor()})
    /**针对本地canvas 添加属性name 和 brushColor****/
    let localCanvas = document.getElementsByClassName('canvas')
    if(localCanvas.length ){
        for(let canvas of localCanvas){
            if(canvas.classList.contains('canvas')){
                canvas.name = localAccount.name
                canvas.nameId = localAccount.id
                canvas.setAttribute('name', localAccount.name)
                canvas.setAttribute('nameId', localAccount.id)
                canvas.setAttribute('brushColor', can.canvasToolsBar.getBrushColor())
                break
            }
        }
    }
}

/**
 * 处理共享请求：包含本地和远端
 * @param message
 */
function handleScreenShareRequest(message){
    let param
    let content = message.data
    let lineId = content.localLineId
    let shareType  = content.shareType
    let infoMsg = content.rspInfo
    let session
    currentLocalLine = lineId
    currentRemoteLine = content?.remoteLineId
    localShare = message.localShare || content.localShare

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
                    console.log("sipAccept:", event)
                    if(event && event.message && event.message.codeType === 200){
                        document.title = currentLocale['L137']
                    }
                    iconStyleToggle('remoteScreenShare')
                }
            }
            gsRTC.acceptScreenShare(param)
            break
        case 'localScreenShare':
            console.log('local screen share')
            let browserDetails = gsRTC.getBrowserDetail()
            remoteName = content.remoteName
            if (shareType === 'shareScreen') {
                if (browserDetails.browser === 'firefox' || browserDetails.browser === 'safari') {
                    // TODO: Firefox 取流存在报错：Uncaught (in promise) DOMException: getDisplayMedia requires transient activation from a user gesture.
                    alert(currentLocale['L144'].replace('{0}', currentLocale['L92'] ))
                } else {
                    startShareScreen(shareType)
                }
            } else {
                startShareScreen(shareType)
            }
            break
        case 'remoteAnswerSdp':
            session = WebRTCSession.prototype.getSession({ key: 'lineId', value: lineId })
            if (!session) {
                console.log("handle remoteAnswerSdp :no session")
                return
            }
            if (infoMsg && infoMsg.rspCode === 200) {
                console.log("handle remoteAnswerSdp")
                let sdp = content.sdp.data
                session.remoteLineId = content.remoteLineId
                if (sdp) {
                    session.handleServerResponseSdp(sdp)
                } else {
                    console.log('answer sdp is not offer now.')
                }
            } else {
                console.log("cause: " + infoMsg && infoMsg.rspMsg)
                session.isHandleDestroy = true
                errorCodeTips(infoMsg && infoMsg.rspCode)
                session.JSEPStatusRollback()
                gsRTC.clearSession({lineId: currentLocalLine})
            }
            break
        case 'updateScreen':
            session = WebRTCSession.prototype.getSession({ key: 'lineId', value: lineId })
            if (!session) {
                console.log("handle updateScreen :no session")
                return
            }
            console.log("ready relay updateScreen")
            content.updateMessage.isFromBackground = true
            session.handleShareRequestMessage(content.updateMessage)
            break
        case 'updateScreenRet':
            session = WebRTCSession.prototype.getSession({ key: 'lineId', value: lineId })
            if (!session) {
                console.log("handle updateScreenRet :no session")
                return
            }
            console.log("ready relay updateScreenRet")
            if (infoMsg && infoMsg.rspCode === 200) {
                content.updateMessage.isFromBackground = true
                session.handleShareRequestMessage(content.updateMessage)
            } else {
                localShare = false
                log.info("updateMediaSessionRet: current get codeType : " + infoMsg.rspCode + " cause: " + infoMsg.rspMsg)
                // 提示内容
                errorCodeTips(infoMsg && infoMsg.rspCode)
                session.JSEPStatusRollback()
            }
            break
        default:
            console.log("current no data")
            break
    }
}

/**
 * 处理背景页发送过来的消息
 * @param message
 */
function handleBackgroundMessage(message) {
    if (!message) {
        console.log('receive handle background message null')
        return
    }
    if (typeof message === 'string') {
        message = JSON.parse(message)
    }

    if(message.localAccountLists){
        localAccountLists = message.localAccountLists
    }

    console.log('receive handle background message: ', message)

    if(message.type){
        let data = message.data
        switch(message.type){
            case 'holdLine':
                gsRTC.lineHold({lineId: data.lineId, type: 'hold'})
                break;
            case 'unHoldLine':
                gsRTC.lineHold({lineId: data.lineId, type: 'unHold'})
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
                updateLocalCanvasData(message)
                break
            case 'quicallSendFile':
                openFilePopup()
                fileNameIcon.classList.toggle('file-name-icon_show', true)
                fileTailButton.classList.toggle('file-tail-button-none', true)
                break
            case 'closeShareWindow':
                stopShareScreen()
                break;
            case 'websocketOnClose':
                console.log('websocket on close.')
                errorCodeTips(gsRTC.CODE_TYPE.WEBSOCKET_CLOSED.codeType, data.lineId)

                // 发送消息，清除对端的共享页面
                let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
                if(session){
                    session.sendMessageByDataChannel({lineId: data.lineId, type: 'socketStatus', state: 'close'})
                }
                break
            default:
                console.log("print current type: "+ message.type)
                break
        }
    }else{
        handleScreenShareRequest(message)
    }
}

/**
 * 关闭共享窗口的弹框倒计时
 * @param errorContent
 * @param countDownNum
 */
function countDown(errorContent, countDownNum = 10){
    console.log("get error content: "  + JSON.stringify(errorContent, null, '    '))

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
                console.log("shareScreen end of count Down")
                countDownCallback()
                // popupSendMessage2Background({cmd: 'closeScreenTab', lineId: currentLocalLine})
            }
        }, 1000);
    }else{
        countDownCallback()
    }
}

/**
 * 是否接收文件的弹框倒计时
 * @param countDownNum
 */
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
                console.log(" end of count Down")
                countDownCallback()

                let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
                if(session){
                    session.sendMessageByDataChannel({lineId: currentLocalLine, type: 'fileInfo', state: 'timeout'})
                }
            }
        }, 1000);
    }else{
        countDownCallback()
    }
}

/**
 * 错误提示
 * @param codeType
 * @param lineId
 */
function errorCodeTips(codeType, lineId){
    console.log('get codeType is ' + codeType)
    tipsRemoteReply.classList.toggle('tips-remote-reply-show', false)
    let errorContent
    switch (codeType) {
        case gsRTC.CODE_TYPE.NO_RESPONSE.codeType:
            errorContent = currentLocale['L105']
            break
        case gsRTC.CODE_TYPE.PEER_WEBSOCKET_CLOSED.codeType:
            errorContent = currentLocale['L106']
            break
        case gsRTC.CODE_TYPE.WEBSOCKET_CLOSED.codeType:
            errorContent = currentLocale['L145']
            break
        case gsRTC.CODE_TYPE.ICE_CONNECTION_FAILED.codeType:
            errorContent = currentLocale['L146']
            break
        case gsRTC.CODE_TYPE.REFUSE_ACCEPT_SHARE.codeType:
            errorContent = currentLocale['L107']
            break
        default:
            break
    }
    errorContent = errorContent + currentLocale['L147']

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
    // fileShareText.innerHTML = currentLocale['L117']
    fileHead.innerHTML = currentLocale['L117']
    fileContent.innerHTML = currentLocale['L125']
    schedule.className = 'schedule'
}

/**
 * 侧边栏图标/样式切换
 * @param actionType
 */
function iconStyleToggle(actionType){
    let fileBtn = document.querySelector("grp-button[type='shareFile']")
    let switchBtn = document.querySelector("grp-button[type='shareScreen']") || document.querySelector("grp-button[type='switchShareScreen']")
    let stopBtn = document.querySelector("grp-button[type='stopShareScreen']")
    let pauseBtn = document.querySelector("grp-button[type='pauseShareScreen']") || document.querySelector("grp-button[type='resumeShareScreen']")
    switch(actionType){
        case 'startShareScreen':        // 开启演示
        case 'resumeShareScreen':       // 恢复共享
            switchBtn.setAttribute('disabled', 'false')
            switchBtn.setAttribute('type', 'switchShareScreen')
            pauseBtn.setAttribute('disabled', 'false')
            stopBtn.setAttribute('disabled', 'false')
            fileBtn.setAttribute('disabled', 'false')
            break
        case 'shareScreen':
        case 'remoteScreenShare':       // 远端开启共享
            switchBtn.setAttribute('disabled', 'true')
            switchBtn.setAttribute('type', 'switchShareScreen')
            pauseBtn.setAttribute('disabled', 'true')
            stopBtn.setAttribute('disabled', 'false')
            fileBtn.setAttribute('disabled', 'false')
            break
        case 'pauseShareScreen':        // 暂停共享
            switchBtn.setAttribute('disabled', 'true')
            pauseBtn.setAttribute('disabled', 'false')
            stopBtn.setAttribute('disabled', 'true')
            fileBtn.setAttribute('disabled', 'false')
            break
        case 'stopShareScreen':         // 停止共享
            switchBtn.setAttribute('disabled', 'false')
            pauseBtn.setAttribute('disabled', 'true')
            stopBtn.setAttribute('disabled', 'true')
            fileBtn.setAttribute('disabled', 'true')
            break
        default:
            console.log('iconStyleToggle: ' + actionType)
            break
    }

    if(actionType === 'pauseShareScreen'){
        pauseBtn.setAttribute('type', 'resumeShareScreen')
    }else {
        pauseBtn.setAttribute('type', 'pauseShareScreen')
    }
}

/**
 * 获取本地账号id 和 name
 * @returns {{name: string, id: string}}
 */
function getLocalAccountContent(){
    let act
    let account = {
        id: '',
        name: '',
    }
    if(lineData?.length){
        for(let index of lineData){
            if(index.state === 'connected'){
                act = index.acct + 1
                break
            }
        }
    }

    if(act){
        for(let i of localAccountLists){
            if(i.id === act){
                account.id = i.sip_id
                account.name = i.name
            }
        }
    }

    return account
}

/**
 * 本地或远端流发生变化时的处理事件
 * @param data
 */
function handleStreamChange(data){
    console.log("streamChange:" + JSON.stringify(data, null, '   '))
    if (data.isLocal) {
        if (data.stream) {
            if (data.stream.getVideoTracks().length) {
                presentVideo.srcObject = data.stream
                presentVideo.onloadedmetadata = function () {
                    console.log("video play ...")
                    isLoadingOfShareScreen = true
                    presentVideo.play()

                    if(currentLocalLine){
                        let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
                        if(session){
                            session.sendMessageByDataChannel({
                                type: 'streamChange',
                                lineId: currentRemoteLine,
                                size: {
                                    videoWidth: presentVideo.videoWidth,
                                    videoHeight: presentVideo.videoHeight
                                }
                            })
                        }
                    }
                }
                presentVideo.style.display = 'block'

                console.log('local present stream id: ', data.stream.id)
            } else {
                console.log('local audio stream id: ', data.stream.id)
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
                console.log('remote present stream id: ', data.stream.id)
            } else {
                console.log('remote audio stream id：', data.stream.id)
            }
        } else {
            can.fullScreenModel.toggleFullScreen(true)
            can.fullScreenModel.togglePictureInPicture(true)
            presentVideo.srcObject = null
            isLoadingOfShareScreen = false
        }
    }
}

/**
 * 更新远端鼠标位置变化
 * @param message
 */
function handleRemoteMousePositionChange(message){
    console.log('handle remote mouse position change: ', message)
    let canvas  = handleRemoteContent(message)
    let getRatio = can.getPostionRatio(false)
    let position = {}

    if(message.rect){
        can.remoteCanvas.width = message.rect.width
        can.remoteCanvas.height = message.rect.height
    }

    if(message.width && message.height){
        position.width = Number(message.width)
        position.height = Number(message.height)
    }

    if(message.x && message.y){
        position.x = Number(message.x) / getRatio.xRatio
        position.y = Number(message.y) / getRatio.yRatio
    }

    switch(message.type){
        case 'mouseDown':
            if(message?.action === 'eraserFlag' || message?.action === 'textFlag' || message?.action === 'noteFlag') return
            can.otherCanvasDown({startX: position.x, startY: position.y, target: canvas, action: message.action})
            break;
        case 'mouseMove':
            canvas.eraserSize = message.eraserSize
            if(message?.action === 'eraserFlag'){
                can.eraser({canvas: canvas, eraserSize: message.eraserSize, x: position.x, y: position.y})
            }else{
                can.otherCanvasMove({ currentX: position.x, currentY: position.y, event: message.e, target: canvas, action: message.action, brushColor: message.brushColor})
            }
            break;
        case 'mouseUp':
            can.otherCanvasUp({account: message.account, target: canvas})
            break;
        case 'remotePosition':
            can.remoteCanvas.width = position.width
            can.remoteCanvas.height = position.height
            break;
        case 'areaDelete':
            position.width = position.width / getRatio.xRatio
            position.height = position.height / getRatio.yRatio
            can.otherCanvasDelete({type: message.type, x: position.x, y: position.y, width: position.width, height: position.height, target: message.canvas})
            break;
        case 'allDelete':
            can.otherCanvasDelete({type: message.type, target: message.canvas})
            break;
        case 'pausePainting':
            can.pausePainting = message.value
            if(can.pausePainting && message.account){
                let tip = message.account.name + " " + currentLocale['L93']
                notice({type: 'info',value: tip })
            }
            break;
        case 'textFlag':
            can.otherCanvasDrawText({
                type: message.type,
                x: position.x,
                y: position.y,
                textColor: message.textColor,
                textFontSize: message.textFontSize,
                text: message.text,
                target: message.canvas,
            })
            break;
        case 'noteFlag':
            can.otherCanvasDrawNote({
                type: message.type,
                x: position.x,
                y: position.y,
                width: message.width,
                height: message.height,
                bgColor: message.bgColor,
                fontSize: message.fontSize,
                text: message.text,
                target: message.canvas,
            })
            break
        default:
            console.log("handleRemoteMousePositionChange, get current type is ",message.type)
            break

    }
}

/**
 * 处理本端中关于远端相关内容是否创建
 ***/
function handleRemoteContent(message){
    let position = {}
    let canvas
    let getRatio = can.getPostionRatio(false)
    if(message.x && message.y){
        position.x = Number(message.x) / getRatio.xRatio
        position.y = Number(message.y) / getRatio.yRatio
    }
    if(message.account){
        // 首先判断canvas是否创建，如果没有，则创建；若有，则不创建；
        if(can.canvasArray.length){
            let isExist = can.canvasArray.find(item => item.getAttribute('nameId') === message.account.id)
            if(!isExist && message.type === 'mouseDown'){
                can.createCanvas({account: message.account, brushColor: message.brushColor})
                can.createTools({account: message.account, brushColor: message.brushColor})
                canvas = can.canvasArray[can.canvasArray.length - 1]
            }else{
                canvas = isExist
                if(message.brushColor){
                    canvas.brushColor = message.brushColor
                    canvas.brushStrokeSize = message.brushStrokeSize
                    can.changeToolColor({account: message.account, brushColor: message.brushColor})
                }
            }
        }else if(message.type === 'mouseDown'){
            can.createCanvas({account: message.account, brushColor: message.brushColor})
            can.createTools({account: message.account, brushColor: message.brushColor})
            canvas = can.canvasArray[can.canvasArray.length - 1]
        }

        // 首先判断显示位置的div是否创建，如果没有，则创建且处理样式；若有，则直接处理样式；
        let otherShowPosition = document.getElementsByClassName('otherShowPosition')
        if(otherShowPosition.length){
            for(let ele of otherShowPosition){
                if(ele.getAttribute('nameId') === message.account.id){
                    if(!ele && message.type === 'mouseDown'){
                        can.createMouseAccount({account: message.account, brushColor: message.brushColor})
                    } else{
                        if(message.brushColor){
                            can.changeElementStyleForPosition({account: message.account, brushColor: message.brushColor,currentX: position.x, currentY: position.y})
                        }
                    }
                    break
                }
            }
        } else if(message.type === 'mouseDown'){
            can.createMouseAccount({account: message.account, brushColor: message.brushColor})
        }

        //首先判断有没有创建div橡皮擦，如果没有，则创建且处理样式；若有，则直接处理样式。
        // let otherMouseStyle = document.getElementsByClassName('otherMouseStyle')
        // let constraints
        // let getParameters = function(){
        //     let param = {
        //         account: message.account,
        //         action: message.action,
        //         x: position.x,
        //         y: position.y,
        //     }
        //
        //     if(message.action === 'eraserFlag'){
        //         param.eraserSize  = message.eraserSize
        //     }else if(message.action === 'pointerFlag'){
        //         param.pointerColor = message.pointerColor
        //     }
        //     return param
        // }
        // if(otherMouseStyle.length){
        //     for(let ele of otherMouseStyle){
        //         if(ele.getAttribute('nameId') === message.account.id){
        //             constraints = getParameters()
        //             if(!ele && message.type === 'mouseDown'){
        //                 can.createShapes(constraints)
        //             } else{
        //                 can.changeShapesStyle(constraints)
        //             }
        //             break
        //         }
        //     }
        // } else if(message.type === 'mouseDown'){
        //     constraints = getParameters()
        //     can.createShapes(constraints)
        // }
    }

    return canvas
}

window.onload = function () {
    document.title = currentLocale['L135']
    if (webExtension) {
        webExtension.onMessage.addListener(handleBackgroundMessage)
        popupSendMessage2Background({ cmd: 'shareScreenOnOpen' })
    }
    let browserDetail = gsRTC.getBrowserDetail()
    if (browserDetail.browser === 'firefox' || browserDetail.browser === 'safari') {
        videoTips.innerHTML = ''
        picBtn.classList.add('firefoxPicBtn')
        let domShare = document.querySelector("grp-button[type='switchShareScreen']")
        domShare.setAttribute('disabled', 'false')
        domShare.setAttribute('type', 'shareScreen')
    }

    gsRTC.on('streamChange', handleStreamChange)
    gsRTC.on('errorTip', errorCodeTips)

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
            popupSendMessage2Background({ cmd: 'updateLocalOfferSdp', data: message })
        } else {
            popupSendMessage2Background({ cmd: 'updateLocalAnswerSdp', data: message })
        }
    })

    gsRTC.on("closeScreenTab", function(data){
        console.log("close screenTab")
        popupSendMessage2Background({cmd: 'closeScreenTab', lineId: data.lineId})
    })

    gsRTC.on("shareScreen",function(isSuccess){
        console.log("trigger shareScreen",isSuccess)
        if(isSuccess){
            iconStyleToggle('shareScreen')
        }else{
            iconStyleToggle('stopShareScreen')
        }
    })

    gsRTC.on("stopShareScreen",function(){
        console.log("trigger stopShareScreen")
        iconStyleToggle('stopShareScreen')
    })

    gsRTC.on('holdStatus',function(data){
        notice({ type: 'warn', value: currentLocale['L113']})
    })

    gsRTC.on('onRemoteMousePosition', handleRemoteMousePositionChange)

    gsRTC.on('onRemoteStreamChange',function(message){
        console.log("change local videoArea size")
        if(message.size){
            can.setSize(message.size)
        }

    })

    gsRTC.on('shareScreenFileConfirmPopup', function (data) {
        console.log('on quicall local sdp completed.')
        refuseShareBtn.innerText = currentLocale['L83']
        refuseShareBtn.classList.toggle('requestShare-bottom-cancel', false)
        acceptShareBtn.innerText = currentLocale['L84']
        let remoteName
        for(let i in lineData){
            if(lineData[i].state !== 'idle' && lineData[i].line == data.lineId){
                remoteName = lineData[i].remotename || lineData[i].remotenumber
            }
        }
        let fileName = data.fileName + ' (' + formatFileSize(data.fileSize) + ')'
        requestShareText.innerHTML = currentLocale['L123'].replace('{0}', remoteName).replace('{1}', fileName)
        sharePopup.classList.toggle('requestShareBox-show',true)
        countDownFile()
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
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
    if(!session){
        log.warn("setCurrentMousePosition: session is not found")
        return
    }
    session.sendMessageByDataChannel(data)
}

/** 关闭窗口点击事件
 **/
function closeShareScreenWindow(){
    countDown(currentLocalLine)
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

/**
 * 收到对端共享文件请求 可选择接收或拒绝
 * @param event
 */
function handleShareFileRequest(event){
    if (!event || !event.target) {
        return
    }
    let value = event.target.textContent
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
    switch(value){
        case currentLocale['L84']:                  // 接受共享文件
            console.log('Accept sharing file')
            countDownFile()

            if(session){
                session.sendMessageByDataChannel({lineId: currentLocalLine, type: 'fileInfo', state: 'receive'})
            }
            break
        case currentLocale['L83']:                 // 拒绝共享文件
            console.log('Deny sharing file')
            countDownFile()

            if(session){
                session.sendMessageByDataChannel({lineId: currentLocalLine, type: 'fileInfo', state: 'reject'})
            }
            break
        default:
            break
    }
}

window.onbeforeunload = function () {
    for (let i = 0; i < gsRTC.webrtcSessions.length; i++) {
        let session = gsRTC.webrtcSessions[i]
        console.log("Users click to close the sharing page, Whether to use dataChannel to send destroyMediaSession:" + session.isHandleDestroy)
        if (currentLocalLine === session.lineId) {
            if(!session.isHandleDestroy){
                popupSendMessage2Background({cmd: 'userClickCloseShare', data: {lineId:  currentLocalLine}})
                gsRTC.clearSession({lineId: currentLocalLine})
            }else {
                session.isHandleDestroy = false
            }
        }
    }
}
