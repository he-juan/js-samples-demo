function GRPButtonUpdateClass (elem, type){
    let This = elem
    let disabled = This.getAttribute("disabled")                // 是否禁用 true禁用 false不禁用
    This.getElementsByClassName('setBtnContainer')[0].className = `setBtnContainer ${disabled === 'true' ? 'setBtnContainerProhibit' : 'setBtnContainerInit'}`
    let icon = This.getElementsByClassName('btn')[0]  // 按钮图标
    let text = This.querySelector('span')           // 按钮文案
    switch (type) {
        case "invite":
            icon.className = `btn icon ${disabled === 'true' ? 'GRP-icon-contacts-ash' : 'GRP-icon-contacts-black'}`
            break
        case "member":
            icon.className = `btn icon ${disabled === 'true' ? 'GRP-icon-member-ash' : 'GRP-icon-member-black'}`
            break
        case "shareScreen":
        case "switchShareScreen":
            icon.className = `btn icon ${disabled === 'true' ? 'GRP-icon-newShare-ash' : 'GRP-icon-newSharing-black'}`
            text.textContent = type === 'shareScreen' ? currentLocale['L92'] : currentLocale['L92_1']
            break
        case "pauseShareScreen":
        case "resumeShareScreen":
            icon.className = `btn icon ${disabled === 'true' ? 'GRP-icon-pauseSharing-ash' : 'GRP-icon-pauseSharing-black'}`
            text.textContent = type === 'pauseShareScreen' ? currentLocale['L93'] : currentLocale['L104']
            break
        case "stopShareScreen":
            icon.className = `btn icon ${disabled === 'true' ? 'GRP-icon-quitSharing-ash' : 'GRP-icon-quitSharing-black'}`
            break
    }
}

// 共享页侧边栏按钮
class GRPButton extends HTMLElement {
    static get observedAttributes() {
        return ['type', 'disabled'];
    }
    constructor() {
        super();
        this.type = this.getAttribute("type")
        this.disabled = this.getAttribute("disabled")
        this.icon = null
        this.text = null
        switch (this.type) {
            case "invite":
                this.icon = !this.disabled ? 'GRP-icon-contacts-black' : 'GRP-icon-contacts-ash'
                this.text = currentLocale['L90']
                this.onclick = e => {
                    if(this.disabled === 'true'){
                        return
                    }
                    inviteClick()
                }
                break
            case "member":
                this.icon = !this.disabled ? 'GRP-icon-member-black' : 'GRP-icon-member-ash'
                this.text = currentLocale['L91']
                this.onclick = e => {
                    if(this.disabled === 'true'){
                        return
                    }
                    memberClick()
                }
                break
            case "shareScreen":
            case "switchShareScreen":
                this.icon = !this.disabled ? 'GRP-icon-newSharing-black' : 'GRP-icon-newShare-ash'
                this.text = this.type === 'shareScreen' ? currentLocale['L92'] : currentLocale['L92_1']
                this.onclick = e => {
                    if(this.disabled === 'true'){
                        return
                    }
                    if(this.type === 'shareScreen'){
                        startShareScreen()
                    }else{
                        switchScreenScreen()
                    } 
                }
                break
            case "pauseShareScreen":
            case "resumeShareScreen":
                this.icon = !this.disabled ? 'GRP-icon-pauseSharing-black' : 'GRP-icon-pauseSharing-ash'
                this.text = this.type === 'pauseShareScreen' ? currentLocale['L93'] :currentLocale['L104']
                this.onclick = e => {
                    if(this.disabled === 'true'){
                        return
                    }
                    pauseShareScreen(this.type)
                }
                break
            case "stopShareScreen":
                this.icon = !this.disabled ? 'GRP-icon-quitSharing-black' : 'GRP-icon-quitSharing-ash'
                this.text = currentLocale['L94']
                this.onclick = e => {
                    if(this.disabled === 'true'){
                        return
                    }
                    stopShareScreen()
                }
                break
        }
        this.innerHTML = `<div class="setBtnContainer ${this.disabled === 'true' ? 'setBtnContainerProhibit' : 'setBtnContainerInit'}">
                            <div class="btnSetting">
                                <div class="imgContent">
                                    <div class="btn icon ${this.icon}"></div>
                                 </div>
                            </div>
                            <span>${this.text}</span>
                        </div>`;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(name === 'disabled'){
            this.disabled = newValue
        }else if(name === 'type'){
            this.type = newValue
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
        return ['issharing'];
    }
    constructor() {
        super();
        this.isSharing = false
        this.line = Number(this.getAttribute("line"))
        this.type = this.getAttribute("type")
        this.disabled = typeof this.getAttribute("disabled") === 'string'
        this.icon = null
        this.shareType = null
        switch (this.type) {
            case "share":       // 共享
                this.icon = !this.disabled ? 'GRP-icon-share-black' : 'GRP-icon-share-ash'
                this.shareType = 'shareScreen'
                break
            case "file":        // 文件
                this.icon = !this.disabled ? 'GRP-icon-file-black' : 'GRP-icon-file-ash'
                this.shareType = 'shareFile'
                break
            case "contacts":    // 联系人
                this.icon = !this.disabled ? 'GRP-icon-contacts-black' : 'GRP-icon-contacts-ash'
                break
        }
        this.innerHTML = `<div class="operation-button icon ${this.icon}" style="cursor: ${this.disabled ? 'not-allowed' : 'pointer'}"></div>`
        this.onclick = e => {
            clickContent.lineId = this.line
            clickContent.shareType = this.shareType
            if(this.isSharing){
                showPopupTip("L72", true)
            }else{
                if(currentShareContent){
                    if(currentShareContent.lineId !== this.line){
                        // 弹框提示： 当前存在在桌面共享，发起新共享后结束目前共享，确定发起?
                        console.warn(" 当前存在在桌面共享，发起新共享后结束目前共享，确定发起?")
                        mb.classList.add('mb');
                        document.body.appendChild(mb);
                        refuseShareBtn.innerText = currentLocale['L60']
                        refuseShareBtn.classList.toggle('requestShare-bottom-cancel', true)
                        acceptShareBtn.innerText = currentLocale['L59']
                        requestShareText.innerHTML = currentLocale['L115']
                        requestShareTipsWrapper.classList.toggle('requestShare-tips-wrapper-show', false)
                        sharePopup.classList.toggle('requestShareBox-show',true)
                        return
                    }
                }
                popupSendMessage2Background({ cmd: 'localShareScreenRequest', data: { localLineId: this.line, localShare: true, shareType: this.shareType } })
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
        }
    }
}
customElements.define("grp-fun-button", GRPFunButton);

