
let slideStream
/*****************************************关于页面 共享相关接口 *****************************************************/

/**
 * 开启演示
 * @param shareType
 * @param data.lineId
 **/
function startShareScreen(shareType = null, data = {}) {
    if (!currentLocalLine ) {  // 判断当前是否存在线路
        notice({type: 'warn',value: currentLocale['L73'] })
        console.log("shareScreen: current no lineId")
        return
    }

    let param =  {
        lineId: data.lineId || currentLocalLine,
        localShare: true,
        conf: data.conf,
        shareType:  'shareScreen'
    }

    if(data.stream){
        param.stream = data.stream
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

                /**1. 若当前处于会议室状态，则需要判断当前是否是主持人。**/
                /**（1）若是主持人，则取消共享的同时需要关闭共享窗口。**/
                /**（2）若不是主持人，只需要取消共享，**/
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
 * data.lineId
 **/
function stopShareScreen(data = {}) {
    if (!data.lineId && !currentLocalLine) {  // 判断当前是否存在线路
        console.log("stopShareScreen: current no lineId")
        return
    }

    let param = {
        lineId: data.lineId  || currentLocalLine,
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




/************************************************** 关于插件  通信接口 **********************************************************/

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

/*********************************************************  关于插件 接口响应 事件 ***********************************************************/

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
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: message.data?.lineId || currentLocalLine})
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
                if(session){
                    can.updateAttendeesLists('del', {account: session.remoteAccount})
                    session.updateMemberList({account: session.remoteAccount})                  // 告知其他线路关闭当前成员列表信息
                }
                gsRTC.clearSession({lineId: data.lineId})
                gsRTC.trigger('closeScreenTab',{lineId: data.lineId})
                break
            case 'clearSession':
                gsRTC.clearSession({lineId: data.lineId})
                break
            case 'setLineStatus':
                updateLocalCanvasData(message)
                updateSessionConfStatus(message)
                break
            case 'quicallSendFile':
                if(session && session.receiveTimeoutFileList.length > 0){
                    lossFileList.innerHTML = ''
                    lossTitle.classList.remove('loss-title-none')
                    addFileList(session.receiveTimeoutFileList)
                }else{
                    lossTitle.classList.add('loss-title-none')
                    openFilePopup()
                }
                fileNameIcon.classList.toggle('file-name-icon_show', true)
                fileTailButton.classList.toggle('file-tail-button-none', true)
                break
            case 'closeShareWindow':
                stopShareScreen({lineId: data.lineId})
                break;
            case 'websocketOnClose':
                console.log('websocket on close.')
                errorCodeTips(gsRTC.CODE_TYPE.WEBSOCKET_CLOSED.codeType, data.lineId)

                // 发送消息，清除对端的共享页面
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
 * 更新共享线路当前是否是会议室
 * lineData
 ***/
 function updateSessionConfStatus(msg){
     console.log("update share line status", msg)
     if(!window.gsRTC){
         console.log("updateSessionConfStatus: no current session")
         return
     }
     let lines = msg?.lines.filter((item)=>item.state === 'connected' || item.state === 'onhold')
     if(lines.length){
         for(let item of lines){
             for(let session of window.gsRTC.webrtcSessions){
                 if(session.lineId === item.line){
                     session.conf = item.conf
                 }
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
    let currentLineInfo = content.currentLineInfo
    let lineId = content.lineId                                          // 当前共享线路
    let shareType  = content.shareType                                   // 当前共享类型： shareScreen
    let infoMsg = content.rspInfo                                        // 针对对端回复是否接受共享请求
    let conf = Number(currentLineInfo?.conf)                    // 当前是否是会议状态： 1（是） 0（否）
    let session

    /**在会议室情况下，默认还是首次建立pc 的线路信息**/
    if(!currentLocalLine){
        currentLocalLine = lineId
    }

    if(!currentRemoteLine){
        currentRemoteLine = content.remote.lineId
    }

    if(!currentRemoteLine){
        currentRemoteLine = content.remote.lineId
    }

    if(!localShare){
        localShare = content.localShare || message.localShare
    }


    switch (message.cmd) {
        case 'localScreenShare':
            console.log('local screen share')
            let browserDetails = gsRTC.getBrowserDetail()
            remoteName = content.currentLineInfo.remotename || content.currentLineInfo.remotenumber || content.remoteName

            /**1.针对当前线路是否是会议室 **/
            /**(1) 若是会议室，获取到当前已经存在的stream**/

            if (shareType === 'shareScreen') {
                if (browserDetails.browser === 'firefox' || browserDetails.browser === 'safari') {
                    // TODO: Firefox 取流存在报错：Uncaught (in promise) DOMException: getDisplayMedia requires transient activation from a user gesture.
                    alert(currentLocale['L144'].replace('{0}', currentLocale['L92'] ))
                } else {
                    startShareScreen(shareType, {lineId: lineId, conf: conf, stream: slideStream})
                }
            }
            break
        case 'remoteScreenShare':
            console.log('handle remote offer sdp')
            shareIconSpan.innerHTML = currentLocale['L137']
            let account = getAccountContent({
                type: 'localAccount',
                lineData: message.lineData,
                accountLists: message.localAccountLists,
                lineContent: {
                    local: lineId
                }
            })
            param = {
                sdp: content.sdp.data,
                lineId: content.local.lineId,
                isUpdate: false,
                remoteLineId: content.remote.lineId,
                reqId: content.reqId,
                shareType: content.shareType,
                action: content.action,
                conf: conf,
                account: account,
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
        case 'remoteAnswerSdp':
            session = WebRTCSession.prototype.getSession({ key: 'lineId', value: lineId })
            session.account = getAccountContent({
                type: 'localAccount',
                lineData: message.lineData,
                accountLists: message.localAccountLists,
                lineContent: {
                    local: lineId
                }
            })
            if (!session) {
                console.log("handle remoteAnswerSdp :no session")
                return
            }
            if (infoMsg && infoMsg.rspCode === 200) {
                console.log("handle remoteAnswerSdp")
                let sdp = content.sdp.data
                session.remoteLineId = content.remote.lineId
                if (sdp) {
                    session.handleServerResponseSdp(sdp)
                } else {
                    console.log('answer sdp is not offer now.')
                }
            } else {
                console.log("cause: " + infoMsg && infoMsg.rspMsg)

                errorCodeTips(infoMsg && infoMsg.rspCode, lineId)
                session.JSEPStatusRollback()
                gsRTC.clearSession({lineId: lineId})

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

/**************************************** 关于 canvas 相关处理 *****************************************************/

/**
 * 更新远端鼠标位置变化
 * @param message
 */
function handleRemoteMousePositionChange(message){
    console.log('handle remote mouse position change: ', message)
    /**(1)判断本端是否存在多条线路，若存在，需要将接收到的内容传给远端  **/
    handleMutiLineDraw(message)

    /**(2)针对远端绘制的内容 本端进行处理 **/
    let currentStyle = message.currentStyle
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

    if(message.preX && message.preY){
        position.preX = Number(message.preX) / getRatio.xRatio
        position.preY = Number(message.preY) / getRatio.yRatio
    }

    switch(message.type){
        case 'mouseDown':
            if(message?.action === 'pointerFlag') return
            can.otherCanvasDown({
                startX: position.x,
                startY: position.y,
                target: canvas,
                action: message.action,
                currentStyle: currentStyle
            })
            break;
        case 'mouseMove':
            if( message.action === 'pointerFlag' || message.action === 'shapeFlag') {
                return
            }
            if(message?.action === 'eraserFlag'){
                canvas.eraserSize = currentStyle.eraserSize
                can.eraser({canvas: canvas, eraserSize: currentStyle.eraserSize, x: position.x, y: position.y})
            }else{
                can.otherCanvasMove({
                    startX: position.preX,
                    startY: position.preY,
                    currentX: position.x,
                    currentY: position.y,
                    shiftKey: message.shiftKey,
                    target: canvas,
                    action: message.action,
                    currentStyle: currentStyle
                })
            }
            break;
        case 'mouseUp':
            if( message.action === 'shapeFlag'){
                can.otherCanvasDraw({target: canvas, content: message})
            }
            can.otherCanvasUp({account: message.account, target: canvas, action: message.action})
            break;
        case 'mouseLeave':
            can.otherCanvasLeave({account: message.account, target: canvas, action:message.action})
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
            can.pausePainting = message.pause
            if(can.pausePainting && message.account){
                // let tip = message.account.name + " " + currentLocale['L93']
                // notice({type: 'info',value: tip })
                document.body.style.cursor = 'not-allowed'
            }else{
                document.body.style.cursor = 'default'
            }
            break;
        case 'textFlag':
            can.otherCanvasDrawText({
                type: message.type,
                x: position.x,
                y: position.y,
                textColor: currentStyle.color,
                textFontSize: currentStyle.textFontSize,
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
                bgColor: currentStyle.color,
                fontSize: message.fontSize,
                text: message.text,
                target: message.canvas,
            })
            break
        case 'revoke':
        case 'restore':
            can.otherCanvasUndoRecovery({type: message.type, target: canvas})
            break;
        default:
            console.log("handleRemoteMousePositionChange, get current type is ",message.type)
            break

    }
}

/**
 * 针对会议室情况：本端存在多线路的情况，将其内容传给远端
 */

function handleMutiLineDraw(msg){
    if(!msg || !msg.lineContent || !msg.lineContent.remote){
        console.log("handleMutiLineDraw: invalid parameter ")
        return
    }

    if(window.gsRTC && window.gsRTC.webrtcSessions  && window.gsRTC.webrtcSessions.length){
        let otherLineContent = window.gsRTC.webrtcSessions.filter((item)=>item.lineId !== msg.lineContent.remote)
        if(otherLineContent.length){
            for(let session of otherLineContent){
                if(Number(session.conf) === 1){
                    msg.lineContent = {local: session.lineId, remote: session.remoteLineId}
                    msg.canvas = can.canvas
                    sendCurrentMousePosition(msg)
                }
            }
        }
    }
}

/**
 * 处理本端中关于远端相关内容是否创建
 ***/
function handleRemoteContent(message){
    let position = {}
    let canvas
    let currentStyle = message.currentStyle
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
                can.createCanvas({account: message.account, brushColor: currentStyle.color, brushStyle: currentStyle.brushStrokeStyle, brushSize: currentStyle.currentStyle})
                can.updateAttendeesLists('add',{account: message.account, brushColor: currentStyle.color})
                canvas = can.canvasArray[can.canvasArray.length - 1]
            }else{
                canvas = isExist
                if(message.currentStyle){
                    canvas.brushColor = currentStyle.color
                    canvas.brushSize = currentStyle.brushStrokeSize
                    can.updateAttendeesLists('change',{account: message.account, brushColor: currentStyle.color})
                }
            }
        }else if(message.type === 'mouseDown'){
            can.createCanvas({account: message.account, brushColor: currentStyle.color, brushStyle: currentStyle.brushStrokeStyle, brushSize: currentStyle.currentStyle})
            can.updateAttendeesLists('add', {account: message.account, brushColor: currentStyle.color})
            canvas = can.canvasArray[can.canvasArray.length - 1]
        }

        // 首先判断显示位置的div是否创建，如果没有，则创建且处理样式；若有，则直接处理样式；
        let otherShowPosition = document.getElementsByClassName('otherShowPosition')
        if(otherShowPosition.length){
            for(let ele of otherShowPosition){
                if(ele.getAttribute('nameId') === message.account.id){
                    if(!ele && message.type === 'mouseDown'){
                        can.createMouseAccount({account: message.account, brushColor: currentStyle.color})
                    } else{
                        if(message.currentStyle){
                            can.changeElementStyleForPosition({account: message.account, brushColor: currentStyle.color,currentX: position.x, currentY: position.y})
                        }
                    }
                    break
                }
            }
        } else if(message.type === 'mouseDown'){
            can.createMouseAccount({account: message.account, brushColor: currentStyle.color})
        }

        // // 首先判断有没有创建div橡皮擦，如果没有，则创建且处理样式；若有，则直接处理样式。
        let otherMouseStyle = document.getElementsByClassName('otherMouseStyle')
        let constraints
        let getParameters = function(){
            let param = {
                account: message.account,
                action: message.action,
                x: position.x,
                y: position.y,
            }

            if(message.action === 'eraserFlag'){
                param.eraserSize  = currentStyle.eraserSize
            }else if(message.action === 'pointerFlag'){
                param.pointerColor = currentStyle.color
            }
            return param
        }
        if(otherMouseStyle.length){
            for(let ele of otherMouseStyle){
                if(ele.getAttribute('nameId') === message.account.id){
                    constraints = getParameters()
                    if(!ele && (message.type === 'mouseDown' || message.type === 'mouseUp')){
                        can.createShapes(constraints)
                    } else{
                        can.changeShapesStyle(constraints)
                    }
                    break
                }
            }
        } else if(message.type === 'mouseDown'){
            constraints = getParameters()
            can.createShapes(constraints)
        }
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
        let domShare = document.querySelector("grp-button[type='switchShareScreen']")
        domShare.setAttribute('disabled', 'false')
        domShare.setAttribute('type', 'shareScreen')

        /** 针对firefox 全屏时 底部工具栏遮住问题 **/
        /**（1.主动开启共享时默认是小框，需要主动放大屏幕 2.若是作为接收端，会默认是最大模式）**/
        if(window.innerWidth > 1000){
            shareBtnContainer.style.bottom = '50px'
        }
    }

    shareBtnContainer.addEventListener('mouseenter', function() {
        btnContentWrapper.classList.remove("direction-down")
        if(!btnContentWrapper.classList.contains('direction-up')){
            btnContentWrapper.classList.add("direction-up")
        }

    });
    shareBtnContainer.addEventListener('mouseleave', function() {
        btnContentWrapper.classList.remove("direction-up")
        if(!btnContentWrapper.classList.contains('direction-down')){
            btnContentWrapper.classList.add("direction-down")
        }
    });

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

    gsRTC.on("closeScreenTab", function(message){
        console.log("close screenTab")
        popupSendMessage2Background({cmd: 'closeScreenTab', data: message})
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
        handleShareFileFromShareScreen(data)
    })

    gsRTC.on('updateMemberList', function (data) {
        console.log('update member list.')
        can.updateAttendeesLists('del', {account: data.account})
    })

    gsRTC.on('closeAllShareLine', function (data) {
        console.log('close all share line.')
        popupSendMessage2Background({cmd: 'closeAllShareLine', data: {lineId:  data.lineId}})
        if(window.gsRTC){
            for(let session of window.gsRTC.webrtcSessions){
                gsRTC.clearSession({lineId: session.lineId})
            }
        }
    })
}