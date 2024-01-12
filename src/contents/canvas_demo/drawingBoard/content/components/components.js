function GRPButtonUpdateClass (elem, type){
    let This = elem
    let forbidden = This.getAttribute("disabled")                // 是否禁用 true禁用 false不禁用
    let show = This.getAttribute("show")                       // 显示或隐藏
    This.getElementsByClassName('setBtnContainer')[0].className = `setBtnContainer ${forbidden === 'true' ? 'setBtnContainerProhibit' : 'setBtnContainerInit'}`
    let icon = This.getElementsByClassName('shareBtn')[0]  // 按钮图标
    switch (type) {
        case "display":
            icon.className = `shareBtn icon ${show === 'true' ? 'GRP-icon-drag' : 'GRP-icon-drag'}`
            break
        case "invite":
            icon.className = `shareBtn icon ${forbidden === 'true' ? 'GRP-icon-share-contacts-ash' : 'GRP-icon-share-contacts-black'}`
            break
        case "member":
            icon.className = `shareBtn icon ${forbidden === 'true' ? 'GRP-icon-member-ash' : 'GRP-icon-member-black'}`
            break
        case 'shareFile':
            icon.className = `shareBtn icon ${forbidden === 'true' ? 'GRP-icon-share-file-ash' : 'GRP-icon-share-file-black'}`
            break
        case "shareScreen":
        case "switchShareScreen":
            let name
            if(forbidden === 'true'){
                name = type === 'shareScreen' ? 'GRP-icon-newShare-ash' : 'GRP-icon-newSharing-ash'
            }else{
                name = type === 'shareScreen' ? 'GRP-icon-newShare-white' : 'GRP-icon-newSharing-white'
            }
            icon.className = `shareBtn icon ${name}`
            This.setAttribute('title',type === 'shareScreen' ? currentLocale['L92'] : currentLocale['L92_1'])
            break
        case "pauseShareScreen":
        case "resumeShareScreen":
            icon.className = `shareBtn icon ${forbidden === 'true' ? 'GRP-icon-pauseSharing-ash' : 'GRP-icon-pauseSharing-black'}`
            break
        case "stopShareScreen":
            icon.className = `shareBtn icon ${forbidden === 'true' ? 'GRP-icon-quitSharing-ash' : 'GRP-icon-quitSharing-black'}`
            break
        case "hold":
        case 'unHold':
            icon.className = `shareBtn icon ${forbidden === 'true' ? 'GRP-icon-share-hold-ash' : 'GRP-icon-share-hold-white'}`
            This.setAttribute('title',type === 'hold' ? currentLocale['L158'] :currentLocale['L159'])
            break
        default:
            break;
    }
}

// 共享页侧边栏按钮
class GRPButton extends HTMLElement {
    static get observedAttributes() {
        return ['type', 'disabled', 'show'];
    }
    constructor() {
        super();
        this.type = this.getAttribute("type")
        this.forbidden = this.getAttribute("disabled")
        this.show = this.getAttribute("show")
        this.icon = null
        this.text = null

        switch (this.type) {
            case "display":
                this.icon = 'GRP-icon-drag'
                break
            case "invite":
                this.icon = !this.forbidden ? 'GRP-icon-share-contacts-black' : 'GRP-icon-share-contacts-ash';
                this.setAttribute('title', currentLocale['L90'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    inviteClick()
                }
                break
            case "member":
                this.icon = !this.forbidden ? 'GRP-icon-member-black' : 'GRP-icon-member-ash';
                this.setAttribute('title', currentLocale['L91'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    memberClick()
                }
                break
            case 'shareFile':
                this.icon = !this.forbidden ? 'GRP-icon-share-file-black' : 'GRP-icon-share-file-ash'
                this.setAttribute('title', currentLocale['L117'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    // 获取会话列表里是否含有 文件列表
                    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: currentLocalLine})
                    if(session && session.receiveTimeoutFileList.length > 0){
                        lossFileList.innerHTML = ''
                        lossTitle.classList.remove('loss-title-none')
                        addFileList(session.receiveTimeoutFileList)
                    }else{
                        lossTitle.classList.add('loss-title-none')
                        fileUploadOnClick(e)
                    }
                }
                break
            case "shareScreen":
            case "switchShareScreen":
                this.icon = this.type === 'shareScreen' ?  'GRP-icon-newShare-ash': 'GRP-icon-newSharing-ash' ;
                this.setAttribute('title', this.type === 'shareScreen' ? currentLocale['L92'] : currentLocale['L92_1'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    if(this.type === 'shareScreen'){
                        startShareScreen()
                    }else{
                        switchScreenScreen()
                    }
                    this.setAttribute('title', this.type === 'shareScreen' ? currentLocale['L92'] : currentLocale['L92_1'])
                }
                break
            case "pauseShareScreen":
            case "resumeShareScreen":
                this.icon = !this.forbidden ? 'GRP-icon-pauseSharing-black' : 'GRP-icon-pauseSharing-ash'
                this.setAttribute('title', this.type === 'pauseShareScreen' ? currentLocale['L93'] :currentLocale['L104'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    pauseShareScreen(this.type)
                    this.setAttribute('title', this.type === 'pauseShareScreen' ? currentLocale['L93'] :currentLocale['L104'])
                }
                break
            case "stopShareScreen":
                this.icon = !this.forbidden ? 'GRP-icon-quitSharing-black' : 'GRP-icon-quitSharing-ash'
                this.setAttribute('title', currentLocale['L94'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    stopShareScreen()
                }
                break
            case "hold":
            case "unHold":
                this.icon = !this.forbidden ? 'GRP-icon-share-hold-black' : 'GRP-icon-share-hold-ash'
                this.setAttribute('title',this.type === 'hold' ? currentLocale['L158'] :currentLocale['L159'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    /**1.改变icon背景色  2.针对当前状态处理hold/unHold  3.针对当前状态标记状态 4.修改title***/
                    let iconElement =  this.getElementsByClassName('shareBtn')[0]
                    iconElement.className = `shareBtn icon ${this.type === 'hold' ? 'GRP-icon-share-hold-black': 'GRP-icon-share-hold-white'}`

                    popupSendMessage2Background({
                        cmd: this.type,
                        lineId: currentLocalLine
                    })

                    if(this.type === 'hold'){
                        this.type = 'unHold'
                    }else if(this.type === 'unHold'){
                        this.type = 'hold'
                    }
                    this.setAttribute('title',this.type === 'hold' ? currentLocale['L158'] :currentLocale['L159'])
                }
                break
            case "bye":
                this.icon = 'GRP-icon-end';
                this.setAttribute('title', currentLocale['L65'])
                this.onclick = e => {
                    if(this.forbidden === 'true'){
                        return
                    }
                    popupSendMessage2Background({
                        cmd: 'popupHangupLine',
                        lineId: currentLocalLine
                    })
                }
                break
            default:
                console.log("GRPButton: current type is:",this.type)
                break
        }
        this.innerHTML = `<div class="setBtnContainer ${this.forbidden === 'true' ? 'setBtnContainerProhibit' : 'setBtnContainerInit'}">
                            <div class="btnSetting">
                                <div class="imgContent">
                                    <div class="shareBtn icon ${this.icon}"></div>
                                 </div>
                            </div>
                        </div>`;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(name === 'disabled'){
            this.forbidden = newValue
        }else if(name === 'type'){
            this.type = newValue
        }else if(name === 'show'){
            this.show = newValue
        }
        GRPButtonUpdateClass(this, this.getAttribute("type"))
    }
}
customElements.define("grp-button", GRPButton);

// 拨号页面操作通话的按钮
class GRPCallButton extends HTMLElement {
    constructor(){
        super();
        this.line = Number(this.getAttribute("line"))
        this.type = this.getAttribute("type")
        this.addClass = null
        this.cmd = null
        switch (this.type) {
            case "answer":      // 接听
                this.addClass = 'answer GRP-icon-answer-green'
                this.cmd = 'popupAcceptLine'
                break
            case "reject":      // 拒接
            case "hangup":      // 挂断
            case "cancel":      // 取消
                this.addClass = 'hangup GRP-icon-end'
                break
            case "hold":        // hold
                this.addClass = 'hold GRP-icon-hold-yellow'
                this.cmd = 'popupHoldLine'
                break
            case "unhold":      // 取消hold
                this.addClass = 'unhold GRP-icon-hold-white'
                this.cmd = 'popupUnHoldLine'
                break
        }
        this.innerHTML = `<div class="con-button icon ${this.addClass}"></div>`
        this.onclick = e => {
            if(this.type === 'reject'){
                this.cmd = 'popupRejectLine'
            }else if(this.type === 'hangup'){
                this.cmd = 'popupHangupLine'
            }else if(this.type === 'cancel'){
                this.cmd = 'popupCancelLine'
            }
            popupSendMessage2Background({
                cmd: this.cmd,
                lineId: this.line
            })
        }
    }
}
customElements.define("grp-call-button", GRPCallButton)

// 拨号页面共享，文件，联系人，按钮
class GRPFunButton extends HTMLElement {
    static get observedAttributes() {
        return ['issharing', 'disabled'];
    }
    constructor() {
        super();
        this.isSharing = false
        this.line = Number(this.getAttribute("line"))
        this.conf = Number(this.getAttribute("conf"))
        this.type = this.getAttribute("type")
        this.forbidden = typeof this.getAttribute("disabled") === 'string'
        this.icon = null
        this.shareType = null
        this.setAttribute('title', currentLocale['L148'])
        switch (this.type) {
            case "share":       // 共享
                this.icon = !this.forbidden ? 'GRP-icon-share-black' : 'GRP-icon-share-ash'
                this.shareType = 'shareScreen'
                break
            case "file":        // 文件
                this.icon = !this.forbidden ? 'GRP-icon-file-black' : 'GRP-icon-file-ash'
                this.shareType = 'shareFile'
                break
            case "contacts":    // 联系人
                this.icon = !this.forbidden ? 'GRP-icon-contacts-black' : 'GRP-icon-contacts-ash'
                break
        }
        this.innerHTML = `<div class="operation-button icon ${this.icon}" style="cursor: ${ this.forbidden ? 'not-allowed' : 'pointer'}"></div>`
        this.onclick = e => {
            if(this.forbidden === 'true'){   // 针对禁止点击不做任何处理
                return
            }

            if(this.type === 'contacts'){
                setPopupTips("L138", true)
                return
            }
            clickContent.lineId = this.line
            clickContent.shareType = this.shareType
            clickContent.localLineId = this.line
            clickContent.localShare = true

            if(this.isSharing){
                setPopupTips("L72", true)
            }else{
                if(this.type === 'share'){
                    // 共享桌面
                    if( (currentShareContent && currentShareContent.lineId !== this.line && this.conf === 0)){
                        // 弹框提示： 当前存在桌面共享，发起新共享后结束目前共享，确定发起?
                        console.log("Share exists. Upon accepting the new share, the original share will close automatically")
                        mb.classList.add('mb');
                        document.body.appendChild(mb);

                        refuseShareBtn.innerText = currentLocale['L60']
                        refuseShareBtn.classList.toggle('requestShare-bottom-cancel', true)
                        acceptShareBtn.innerText = currentLocale['L59']
                        requestShareText.innerHTML = currentLocale['L115']

                        //为区分是来电还是共享，在div中添加属性进行辨别 type: call(来电)、 shareScreen（共享）
                        refuseShareBtn.setAttribute("type", "shareScreen")
                        acceptShareBtn.setAttribute("type", "shareScreen")

                        requestShareTipsWrapper.classList.toggle('requestShare-tips-wrapper-show', false)
                        sharePopup.classList.toggle('requestShareBox-show',true)
                    }else {
                        popupSendMessage2Background({ cmd: 'localShareScreenRequest', data: { localLineId: Number(this.line), localShare: true, shareType: this.shareType } })
                    }
                }else if(this.type === 'file'){
                    // 共享文件
                    if(this.line === currentShareContent?.lineId){
                        // 如果存在桌面共享，就通知共享窗口发送文件
                        popupSendMessage2Background({ cmd: 'quicallSendFile' })
                    }else {
                        let param =  {
                            lineId: this.line,
                            localShare: true,
                            shareType:  'shareFile'
                        }
                        // 获取会话列表里是否含有 文件列表
                        let session = WebRTCSession.prototype.getSession({key: 'lineId', value: this.line})
                        if(session && session.receiveTimeoutFileList.length > 0){
                            lossFileList.innerHTML = ''
                            lossTitle.classList.remove('loss-title-none')
                            addFileList(session.receiveTimeoutFileList)
                        }else{
                            lossTitle.classList.add('loss-title-none')
                            fileUploadOnClick(param)
                        }
                    }
                }
            }
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(name === 'issharing' && this.type ==='share'){
            if(newValue === 'true'){
                this.isSharing = true
            }else if(newValue === 'false'){
                this.isSharing = false
            }
        }else if(name === 'disabled'){
            this.forbidden = newValue
        }
    }
}

customElements.define("grp-fun-button", GRPFunButton);

