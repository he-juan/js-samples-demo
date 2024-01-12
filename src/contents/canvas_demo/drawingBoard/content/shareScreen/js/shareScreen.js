let presentVideo = document.getElementsByClassName("presentVideo")[0]
let shareIconSpan = document.getElementsByClassName('shareIcon-span')[0]

// 桌面共享对应按钮
let btnContent = document.getElementsByClassName("btnContent")[0]
let shareBtnContainer = document.getElementsByClassName("shareBtnContainer")[0]
let btnContentWrapper = document.getElementsByClassName("btnContentWrapper")[0]

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
let hover = document.getElementsByClassName("hover")[0]

let tipsRemoteReply = document.getElementsByClassName('tips-remote-reply')[0]                   // 等待对端响应的提示

/****************************共享文件相关************************************/
let schedule = document.createElement('span')                                             // 发送文件进度
let progress = document.createElement('progress')                                      // 发送文件进度条
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
refuseShareBtn.onclick = handleShareFileRequest                                                                     // 拒接文件
acceptShareBtn.onclick = handleShareFileRequest                                                                     // 接收文件、弹窗外选择文件

fileBodyContent.onclick = fileUploadOnClick                                                                         // 弹窗内选择文件
fileClose.onclick = closeFilePopup                                                                                  // 关闭文件弹窗
fileTailButton.onclick = handleFileAction                                                                           // 发送/取消文件

/****************************漏接列表************************************/

let lossTitle =  document.getElementsByClassName('loss-title')[0]                   // 漏接文件列表标题
let lossFileList = document.getElementsByClassName('loss-file-list')[0]             // 漏接文件列表
let fileShareTitle = document.getElementsByClassName('file-share-title')[0]         // 文件共享标题
let fileBody = document.getElementsByClassName('file-body')[0]                      // 共享文件主体
let lossFileButton = document.getElementsByClassName('loss-file-button')[0]         // 接收按钮
let canceFileButton = document.getElementsByClassName('cance-file-button')[0]       // 取消按钮
let lossFileInput           // 复选框
let SelectedList = []       // 选中的文件列表
let isresendFile = false    // 是否重新发送文件

lossTitle.onclick = lossTitleClick
fileShareTitle.onclick = fileShareTitleClick
lossFileButton.onclick = lossFileButtonClick
canceFileButton.onclick = canceFileButtonClick

let currentLocalLine                                                                            // 当前本端线路id
let currentRemoteLine                                                                           // 当前远端线路id
let localShare = false

let sendStatus                                                                                  // 发送文件状态
let isLoadingOfShareScreen = false                                                     // 演示流是否加载
let filePopupState = false                                                             // 共享文件弹窗开关状态
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
 * 设置本地canvas相关属性
 * @param message
 */
function updateLocalCanvasData(message){
    if(!message || !message.lines){
        return
    }

    lineData  = message.lines
    localAccount = getAccountContent({
        type: 'localAccount',
        lineData: lineData,
        accountLists: localAccountLists,
        lineContent: {
            local: currentLocalLine
        }
    })

    if(!localAccount || !localAccount.id){
        console.log("updateLocalCanvasData: no get local account")
        return
    }

    /** 会议室情况下，需要判断当前是否创建；否则会存在多个***/
    let rightToolContent = document.querySelector(`[nameId="${localAccount.id}"]`)
    if(rightToolContent){
        console.log("The element with current id already exists")
        return
    }

    /**针对本地canvas 创建工具栏**/
    can.createTools({account: localAccount, brushColor: can.canvasToolsBar.getColor()})
    /**针对本地canvas 添加属性name 和 brushColor****/
    let localCanvas = document.getElementsByClassName('canvas')
    if(localCanvas.length ){
        for(let canvas of localCanvas){
            if(canvas.classList.contains('canvas')){
                let currentStyle = can.canvasToolsBar.getCurrentStyle()
                canvas.name = localAccount.name
                canvas.nameId = localAccount.id
                canvas.setAttribute('name', localAccount.name)
                canvas.setAttribute('nameId', localAccount.id)
                canvas.setAttribute('brushColor', currentStyle.color)
                canvas.setAttribute('brushSize', currentStyle.brushStrokeSize)
                break
            }
        }
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
    fileShareTitle.innerHTML = currentLocale['L117']
    fileContent.innerHTML = currentLocale['L125']
    lossTitle.innerHTML = currentLocale['L157']
    lossFileButton.innerHTML = currentLocale['L84']
    canceFileButton.innerHTML = currentLocale['L60']
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
    let hold =  document.querySelector("grp-button[type='hold']") || document.querySelector("grp-button[type='unHold']")
    let bye = document.querySelector("grp-button[type='bye']")
    switch(actionType){
        case 'startShareScreen':        // 开启演示
        case 'resumeShareScreen':       // 恢复共享
            switchBtn.setAttribute('disabled', 'false')
            switchBtn.setAttribute('type', 'switchShareScreen')
            // pauseBtn.setAttribute('disabled', 'false')
            // stopBtn.setAttribute('disabled', 'false')
            fileBtn.setAttribute('disabled', 'false')
            hold.setAttribute('disabled', 'false')
            bye.setAttribute('disabled', 'false')
            break
        case 'shareScreen':
        case 'remoteScreenShare':       // 远端开启共享
            switchBtn.setAttribute('disabled', 'true')
            switchBtn.setAttribute('type', 'switchShareScreen')
            // pauseBtn.setAttribute('disabled', 'true')
            // stopBtn.setAttribute('disabled', 'false')
            fileBtn.setAttribute('disabled', 'false')
            hold.setAttribute('disabled', 'false')
            bye.setAttribute('disabled', 'false')
            break
        case 'pauseShareScreen':        // 暂停共享
            switchBtn.setAttribute('disabled', 'true')
            // pauseBtn.setAttribute('disabled', 'false')
            // stopBtn.setAttribute('disabled', 'true')
            fileBtn.setAttribute('disabled', 'false')
            break
        case 'stopShareScreen':         // 停止共享
            switchBtn.setAttribute('disabled', 'false')
            // pauseBtn.setAttribute('disabled', 'true')
            // stopBtn.setAttribute('disabled', 'true')
            fileBtn.setAttribute('disabled', 'true')
            hold.setAttribute('disabled', 'true')
            bye.setAttribute('disabled', 'true')
            break
        default:
            console.log('iconStyleToggle: ' + actionType)
            break
    }

    // if(actionType === 'pauseShareScreen'){
    //     pauseBtn.setAttribute('type', 'resumeShareScreen')
    //     pauseBtn.setAttribute('title', currentLocale['L93'])
    // }else {
    //     pauseBtn.setAttribute('type', 'pauseShareScreen')
    //     pauseBtn.setAttribute('title', currentLocale['L104'])
    // }
}

/**
 * 获取本地或者远端账号id 和 name
 * @param data.type localAccount(本端)、remoteAccount（远端）
 * @param data.lineContent {local:1, remote: 1}   本端和远端线路信息
 * @param data.lineData        线路所有信息，包括状态等
 * @param data.acconutLists    账户所有信息。包括名字等
 * @returns {{name: string, id: string}}
 */
function getAccountContent(data){
    if(!data ||!data.type || !data.lineContent || !data.lineContent.local || (data.acconutLists && data.acconutLists.length !== 0)){
        console.log("getAccountContent: invalid parameter")
        return
    }

    let lineId
    let account = { id: '',  name: '' }

    if(data.type === 'localAccount'){
        lineId = Number(data.lineContent.local)
    }else if(data.type === 'remoteAccount'){
        lineId = Number(data.lineContent?.remote)
    }
    let currentLine = data.lineData?.find((item)=> Number(item.line) === lineId)
    if(!currentLine) {
        console.log("current line no exist")
        return account
    }

    let act = currentLine.acct + 1
    if(act){
        for(let i of data.accountLists){
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
                handleStream({stream: data.stream, lineId: data.lineId})
                console.log('local present stream id: ', data.stream.id)
            } else {
                console.log('local audio stream id: ', data.stream.id)
            }
        } else {
            presentVideo.srcObject = null
            isLoadingOfShareScreen = false
        }
    } else {
        if (data.stream) {
            if (data.stream.getVideoTracks().length) {
                handleStream({stream: data.stream, lineId: data.lineId, isReceiveEnd: true})
                console.log('remote present stream id: ', data.stream.id)
            } else {
                console.log('remote audio stream id：', data.stream.id)
            }
        } else {
            presentVideo.srcObject = null
            isLoadingOfShareScreen = false
        }
    }
}

/**
 *  关于处理video stream
 *@param data.stream
 *@param data.lineId
 *@param data.isReceiveEnd
 **/

function handleStream(data){
    if(!data || !data.stream || !data.lineId){
        console.log("handleStream: invalid parameter")
        return
    }

   if(!slideStream){
       slideStream = data.stream
   }
    presentVideo.srcObject = data.stream
    presentVideo.style.display = 'block'
    presentVideo.onloadedmetadata = function () {
        console.log("video play ...")
        isLoadingOfShareScreen = true
        presentVideo.play()
        let getSettings = slideStream.getTracks()[0].getSettings()
        let notifyStreamChange = function(session){
            session.sendMessageByDataChannel({
                type: 'streamChange',
                lineId: session.remoteLineId,
                size: {
                    videoWidth: getSettings.width || presentVideo.videoWidth,
                    videoHeight: getSettings.height || presentVideo.videoHeight
                }
            })
        }

        if(!data.isReceiveEnd){
            if(currentLocalLine){
                let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineId})
                if(session){
                    /** 1. 告知对端当前已经更新视频流  2. 告知其他线路当前已经更新视频流**/
                    notifyStreamChange(session)

                    /**告知其他线路当前已经更新视频流**/
                        /** （1）判断当前是否是会议室，若是，则继续判断当前是否存在多个session，即是否是主持人；若不是，则不需要处理 **/
                        /** （2）若当前存在多个session，则判断当前演示者和主持者是否在同一端，若是，则需要更新stream；否则不需要 **/
                    if(Number(session.conf) === 1){
                        if(gsRTC.webrtcSessions.length >=2){
                            let  isExistHostAndSharing = gsRTC.webrtcSessions.every((item)=> Number(session.conf) === 1 && !item.remoteShare)
                            if(isExistHostAndSharing){
                                let othersSessions = gsRTC.webrtcSessions.filter((item)=> Number(item.conf) === 1 && item.lineId !== currentLocalLine)
                                for(let session  of othersSessions){
                                    session.processAddStream(slideStream, session.pc, 'slides')
                                    notifyStreamChange(session)
                                }
                            }
                        }
                    }

                }
            }
        }

        /** 针对本地或者远端取流成功后，判断当前会议室是否存在其他线路，如果存在，则告知background后台 处理共享逻辑**/
        if(data.stream){
            let confLines = lineData.filter((item)=> Number(item.conf) === 1)
            if(confLines.length >= 2 &&  confLines.length !== gsRTC.webrtcSessions.length ){
                popupSendMessage2Background({cmd: 'otherLinesShareScreen'})
            }
        }

    }
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

/** 关闭窗口点击事件
 **/
function closeShareScreenWindow(){
    countDown({lineId: currentLocalLine})
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
 * 针对接受共享页面的 文件共享 倒计时处理
 **/
function handleShareFileFromShareScreen (data){
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
    let session
    for (let i = 0; i < gsRTC.webrtcSessions.length; i++) {
        session = gsRTC.webrtcSessions[i]
        console.log("Users click to close the sharing page, Whether to use dataChannel to send destroyMediaSession:" + session.isHandleDestroy)
        gsRTC.clearSession({lineId: session.lineId})
    }
    if(session){
        popupSendMessage2Background({cmd: 'closeAllShareLine', data: {lineId:  session.lineId}})
    }
}
