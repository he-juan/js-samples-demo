let grpClick2Talk
let pageName = 'quicall'
let popupPort
let extensionNamespace
let TIP_CLOSE_DELAY = 3 * 1000

let loginArea
let dialArea

let addressInput
let usernameInput
let passwordInput
let loginButton
let usernameAbout
let passwordAbout
let passwordModeSet  // 切换密码显隐模式的按钮

let loginTips
let tipClose
let loadEffect

// 拨号页
let deviceArea
let deviceAccounts
let selectAccount
let changeSelectAccount
let accountArrowSwitch
let callButton
let phoneNumber
let lineDisplay
let linesCount
let logoutButton
let searchResult
let lineExpand
let popupTip

let ringLineData = []       // 保存振铃线路信息
let settingNav
let settingNavList
let privacySettings // 隐私和安全性设置
let wordDialing
let popupTipTimeoutEvent
let contactSource
let contactSourceLdap
let contactSourceLocal
let contactArrowDown
let contactSourceList

// 初始窗口大小
let initOuterWidth = 456   // 初始窗口宽度
let initOuterHeight = 546  // 初始窗口高度
let initOuterHeight_Line_expand = 720   // 线路全部展开时的最小窗口高度

/********************************蒙版***************************************/

let mb= document.createElement('div');
let currentShareContent           // 当前共享内容
let clickContent = {        // 当前点击线路的Id
    lineId: '',
    localLineId:'',
    shareType: '',
    localShare: false
}

/****************************弹框按钮************************************/
let sharePopup              // 共享弹窗
let requestShareText        // 共享通知
let refuseShareBtn          // 拒绝共享按钮
let acceptShareBtn          // 接受共享按钮
let requestShareTipsSpan    // 共享警告语
let countDownNumber = 40    // 桌面倒计时时间
let countDownTimer          // 弹框通知定时器
let countDownNumText
let peerInfoMessage
let fileInfo                // 选择的文件信息
let sendText                // 发送的文件
let sendStatus              // 发送文件状态
let schedule                // 发送文件进度
let progress                // 发送文件进度条
let fileHead                // 弹窗头部标题
let fileClose               // 关闭文件弹窗按钮
let filePopup               // 文件选择弹窗
let fileUpload              // 文件上传 icon
let fileContent             // 弹窗内容
let fileBodyTips            // 是否发送成功文案
let fileNameIcon            // 文件icon，没有选择文件前是隐藏的
let fileTailButton          // 发送/取消按钮
let fileBodyContent         // 弹窗主体部分
let filePopupState = false  // 共享文件弹窗开关状态
let remoteShareInfo = {     // 对端共享状态
    lineId: '',
    shareType: ''
}

let requestShareTipsWrapper

/****************************漏接列表************************************/

let lossTitle               // 漏接文件列表标题
let lossFileList            // 漏接文件列表
let fileShareTitle          // 文件共享标题
let fileBody                // 共享文件主体
let lossFileButton          // 接收按钮
let canceFileButton         // 取消按钮
let lossFileInput           // 复选框
let SelectedList = []       // 选中的文件列表
let isresendFile = false    // 是否重新发送文件

/****************************联系人************************************/
let dial = true                         // 默认拨号模式，false为联系人模式
let contactsType = 'localAddressBook'   // 联系人状态
let dialTitle                           // 拨号标题
let contactsTitle                       // 联系人标题
let contacts                            // 联系人分类
let contactsLocalAddressBook            // 本地联系人
let contactsPhoneBookGroup              // 群组
let contactsLdap                        // LDAP

/*************************************************页面处理*********************************************************/

/**
 * 获取Dom节点，设置onclick等点击事件
 */
function setDomBindingEvent() {
    // 页面message设置
    // 登录区
    let addressErrorTip = document.getElementsByClassName('address-error-tip')[0]
    addressErrorTip.innerText = currentLocale['L6']
    let passwordErrorTip = document.getElementsByClassName('password-error-tip')[0]
    passwordErrorTip.innerText = currentLocale['L4']
    dialTitle = document.getElementsByClassName('dial-title')[0]
    contactsTitle = document.getElementsByClassName('contacts-title')[0]
    contacts = document.getElementsByClassName('contacts')[0]
    dialTitle.innerText = currentLocale['L49']
    dialTitle.addEventListener('click', function(){
        contactsTitle.classList.remove('dial-title-show')
        dialTitle.classList.add('dial-title-show')
        contacts.classList.remove('contacts-show')
        dial = true
    })
    contactsTitle.innerText = currentLocale['L160']
    contactsTitle.addEventListener('click', function(){
        dialTitle.classList.remove('dial-title-show')
        contactsTitle.classList.add('dial-title-show')
        contacts.classList.add('contacts-show')
        dial = false
    })
    let copyright = document.getElementsByClassName('copyright')[0]
    copyright.innerText = currentLocale['L26'].replace("{0}", new Date().getFullYear())

    console.log('set dom binding event')
    // 登录区
    loginArea = document.getElementsByClassName('login-container')[0]
    addressInput = document.getElementById('address')
    usernameInput = document.getElementById('username')
    passwordInput = document.getElementById('password')
    // 添加输入监听事件
    addressInput.addEventListener('input', handleInputStyle)
    addressInput.placeholder = currentLocale['L15']
    addressInput.addEventListener('blur', addressCheck)
    usernameInput.addEventListener('input', handleInputStyle)
    passwordInput.addEventListener('input', handleInputStyle)
    passwordInput.placeholder = currentLocale['L16']

    // 密码明文、密文切换
    passwordModeSet = document.getElementById('passwordModeSet')
    passwordModeSet.addEventListener('click', function (event) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text'
            passwordModeSet.classList.remove('GRP-icon-eyes-close')
            passwordModeSet.classList.add('GRP-icon-eyes-open')
        } else {
            passwordInput.type = 'password'
            passwordModeSet.classList.remove('GRP-icon-eyes-open')
            passwordModeSet.classList.add('GRP-icon-eyes-close')
        }
        return false
    })

    // 登录
    loginButton = document.getElementById('login')
    loginButton.value = currentLocale['L9']
    loginButton.addEventListener('click', login)

    // tip 提示
    loginTips = document.getElementsByClassName('login-tips')[0]
    loadEffect = document.getElementsByClassName('loadEffect')[0]

    // 拨号区域
    dialArea = document.getElementsByClassName('dialArea')[0]
    deviceArea = document.getElementsByClassName('account-list')[0]
    deviceAccounts = document.getElementsByClassName('device-account-list')[0]
    selectAccount = document.getElementsByClassName('select-account-words')[0]
    changeSelectAccount = document.getElementsByClassName('change-select-account')[0]
    changeSelectAccount.addEventListener('click', setAccountsDisplay)
    accountArrowSwitch = document.getElementsByClassName('account-arrow-down')[0]

    // 账户名和电话
    selectAccount.addEventListener('mousemove', selectAccountMousemoveHandler)

    callButton = document.getElementById('normalCall')
    callButton.value = currentLocale['L24']
    callButton.addEventListener('click', handleCall)

    // 号码输入区
    phoneNumber = document.getElementById('phoneNumber')
    phoneNumber.placeholder = currentLocale['L23']
    phoneNumber.addEventListener('input', searchForContacts)
    phoneNumber.addEventListener('focus', function () {
        this.placeholder = ''
    })
    phoneNumber.addEventListener('blur', function () {
        this.placeholder = currentLocale['L23']
    })
    phoneNumber.addEventListener('keyup', function (event) {
        event.preventDefault();
        if (event.keyCode === 13) {  // 回车事件
            // 回车时input默认上屏第一个联系人号码，如果输入的是号码，则不做处理
            let numberInputText = document.getElementsByClassName('number-input-text')[0]
            if (!numberInputText) {
                let firstMenuNumber = document.getElementsByClassName('menu-number')[0]
                if (firstMenuNumber && firstMenuNumber.innerText) {
                    phoneNumber.value = firstMenuNumber.innerText
                }
            }
            searchResult.style.display = 'none'

            let number = event.target.value.trim()
            if (number){                           // 回车事件 处理 呼叫流程
                console.log("start call number:" , number)
                handleCall()
            }
        }
    });

    lineDisplay = document.getElementsByClassName('lines-display')[0]
    linesCount = document.getElementsByClassName('line-count')[0]
    linesCount.setAttribute('dataBefore', currentLocale['L27'])
    logoutButton = document.getElementsByClassName('logout')[0]
    logoutButton.addEventListener('click', doLogout)
    searchResult = document.getElementsByClassName('search-result')[0]

    lineExpand = document.getElementsByClassName('line-expand')[0]
    lineExpand.addEventListener('click', lineExpandClick)
    popupTip = document.getElementsByClassName('popup-tips')[0]

    /***************************设置菜单***********************/
    settingNav = document.getElementById('setting-nav')
    settingNavList = document.querySelector('.setting-nav-list')
    settingNav.addEventListener('click', function (){
        console.log('settingNavList.style.display：', settingNavList.style.display)
        if(settingNavList.style.display === 'none'){
            settingNavList.style.display = 'block'
        }else {
            settingNavList.style.display = 'none'
        }
    })
    document.querySelector('.privacy-settings-tip').innerText = currentLocale['L17']
    document.querySelector('.word-dialing-tip').innerText = currentLocale['L18']
    document.querySelector('.contact-source-tip').innerText = currentLocale['L150']
    document.querySelector('.contact-source-ldap-tip').innerText = currentLocale['L151']
    document.querySelector('.contact-source-local-tip').innerText = currentLocale['L152']
    contactArrowDown = document.getElementById('contact-arrow-down')
    contactSourceList = document.getElementById('contact-source-list')

    // 安全登出设置
    privacySettings = document.getElementById('privacy-settings')
    privacySettings.addEventListener('click', function () {
        console.log('privacySettings.checked:', privacySettings.checked)
        if (privacySettings.checked) {
            console.log('enable security.')
            grpClick2Talk.keepUserInfo = false
            popupSendMessage2Background({ cmd: 'userDataControl', data: { keep: false } })
        } else {
            console.log('disable security.')
            grpClick2Talk.keepUserInfo = true
            popupSendMessage2Background({ cmd: 'userDataControl', data: { keep: true } })
        }
    })

    // 划词拨号
    wordDialing = document.getElementById('word-dialing')
    wordDialing.addEventListener('click', function (){
        if (wordDialing.checked) {
            console.log('enable word dialing.')
        } else {
            console.log('disable word dialing.')
        }
        grpClick2Talk.wordDialingEnabled = wordDialing.checked
        popupSendMessage2Background({ cmd: 'setWordDialing', data: {wordDialing:grpClick2Talk.wordDialingEnabled }})
    })

    // 通讯录来源
    contactSource = document.getElementById('contact-source')
    contactSourceLdap = document.getElementById('contact-source-ldap')
    contactSourceLocal = document.getElementById('contact-source-local')
    contactSource.addEventListener('click', function (){
        if (contactSource.checked) {
            console.log('enable word dialing.')
            contactSourceLdap.checked = true
            contactSourceLocal.checked = true

            grpClick2Talk.contactSearchFrom.ldap = true
            grpClick2Talk.contactSearchFrom.localAddressBook = true
        } else {
            console.log('disable word dialing.')
            contactSourceLdap.checked = false
            contactSourceLocal.checked = false

            grpClick2Talk.contactSearchFrom.ldap = false
            grpClick2Talk.contactSearchFrom.localAddressBook = false
        }
        updateContactSource()
    })
    contactArrowDown.addEventListener('click', function (){
        if (contactSourceList.style.display === 'none') {
            contactSourceList.style.display = 'block'
            contactArrowDown.classList.remove('GRP-icon-arrow_down')
            contactArrowDown.classList.add('GRP-icon-arrow_up')
        } else {
            contactSourceList.style.display = 'none'
            contactArrowDown.classList.remove('GRP-icon-arrow_up')
            contactArrowDown.classList.add('GRP-icon-arrow_down')
        }
    })
    contactSourceLdap.addEventListener('click', function (){
        console.log('contactSourceLdap.checked:', contactSourceLdap.checked)
        grpClick2Talk.contactSearchFrom.ldap = contactSourceLdap.checked
        updateContactSource()
    })
    contactSourceLocal.addEventListener('click', function (){
        console.log('contactSourceLocal.checked:', contactSourceLocal.checked)
        grpClick2Talk.contactSearchFrom.localAddressBook = contactSourceLocal.checked
        updateContactSource()
    })

    // 联系人
    contactsLocalAddressBook = document.getElementsByClassName('contacts-localAddressBook')[0]
    contactsPhoneBookGroup = document.getElementsByClassName('contacts-phoneBookGroup')[0]
    contactsLdap = document.getElementsByClassName('contacts-ldap')[0]

    contactsLocalAddressBook.innerText = currentLocale['L160']
    contactsPhoneBookGroup.innerText = currentLocale['L161']
    contactsLdap.innerText = currentLocale['L151']

    contactsLocalAddressBook.addEventListener('click', function(){
        contactsLocalAddressBook.classList.add('contacts-list-color')
        contactsPhoneBookGroup.classList.remove('contacts-list-color')
        contactsLdap.classList.remove('contacts-list-color')
        contactsType = 'localAddressBook'
        phoneNumber.placeholder = currentLocale['L23']
    })

    contactsPhoneBookGroup.addEventListener('click', function(){
        // contactsLocalAddressBook.classList.remove('contacts-list-color')
        // contactsPhoneBookGroup.classList.add('contacts-list-color')
        // contactsLdap.classList.remove('contacts-list-color')
        // contactsType = 'phoneBookGroup'
        // phoneNumber.placeholder = '请输入群组名'
    })

    contactsLdap.addEventListener('click', function(){
        contactsLocalAddressBook.classList.remove('contacts-list-color')
        contactsPhoneBookGroup.classList.remove('contacts-list-color')
        contactsLdap.classList.add('contacts-list-color')
        contactsType = 'ldap'
        phoneNumber.placeholder = currentLocale['L23']
    })

    // 共享弹窗
    sharePopup = document.getElementsByClassName('requestShareBox')[0]
    refuseShareBtn = document.getElementsByClassName('requestShare-bottom-reject')[0]
    refuseShareBtn.onclick = handleClickEvent

    acceptShareBtn = document.getElementsByClassName('requestShare-bottom-accept')[0]
    acceptShareBtn.onclick = handleClickEvent

    requestShareText = document.getElementsByClassName('requestShare-text')[0]

    requestShareTipsSpan = document.getElementsByClassName('requestShare-tips-span')[0]
    requestShareTipsSpan.innerText = currentLocale['L86']

    // 是否存在共享的提示
    requestShareTipsWrapper = document.getElementsByClassName('requestShare-tips-wrapper')[0]

    /****************************共享文件相关************************************/
    schedule = document.createElement('span')
    progress = document.createElement('progress')
    fileHead = document.getElementsByClassName('file-head')[0]
    fileClose = document.getElementsByClassName('file-close')[0]
    filePopup = document.getElementsByClassName('file-popup')[0]
    fileUpload = document.getElementsByClassName('file-upload')[0]
    fileContent = document.getElementsByClassName('file-content')[0]
    fileBodyTips = document.getElementsByClassName('file-body-tips')[0]
    fileNameIcon = document.getElementsByClassName('file-name-icon')[0]
    fileTailButton = document.getElementsByClassName('file-tail-button')[0]
    fileBodyContent = document.getElementsByClassName('file-body-content')[0]

    fileBodyContent.onclick = fileUploadOnClick
    fileClose.onclick = closeFilePopup
    fileTailButton.onclick = handleFileAction
    fileContent.innerHTML = currentLocale['L125']
    schedule.className = 'schedule'

    /****************************文件漏接列表相关************************************/
    lossTitle = document.getElementsByClassName('loss-title')[0]
    lossFileList = document.getElementsByClassName('loss-file-list')[0]
    fileShareTitle = document.getElementsByClassName('file-share-title')[0]
    fileBody = document.getElementsByClassName('file-body')[0]
    lossFileButton = document.getElementsByClassName('loss-file-button')[0]
    canceFileButton = document.getElementsByClassName('cance-file-button')[0]

    lossTitle.onclick = lossTitleClick
    fileShareTitle.onclick = fileShareTitleClick
    lossFileButton.onclick = lossFileButtonClick
    canceFileButton.onclick = canceFileButtonClick

    lossFileButton.innerHTML = currentLocale['L84']
    canceFileButton.innerHTML = currentLocale['L60']
    fileShareTitle.innerHTML = currentLocale['L117']
    lossTitle.innerHTML = currentLocale['L157']
}

/**
 * 根据之前的选择设置配置项是否启用
 */
function setConfigurationItems(){
    console.log('set configuration items')
    privacySettings.checked = !grpClick2Talk.keepUserInfo
    wordDialing.checked = grpClick2Talk.wordDialingEnabled

    contactSourceLdap.checked = grpClick2Talk.contactSearchFrom.ldap
    contactSourceLocal.checked = grpClick2Talk.contactSearchFrom.localAddressBook
    contactSource.checked = !!(contactSourceLocal.checked || contactSourceLdap.checked);
}

/**
 * 更新联系人搜索源
 */
function updateContactSource(){
    contactSource.checked = !!(contactSourceLocal.checked || contactSourceLdap.checked);
    popupSendMessage2Background({
        cmd: 'setContactSearch',
        data: {
            ldap: grpClick2Talk.contactSearchFrom.ldap,
            localAddressBook: grpClick2Talk.contactSearchFrom.localAddressBook
        }
    })
}

/***************************************************登录区*********************************************/

/**
 * 显示登录结果 成功、失败、鉴权
 * @param event
 */
function handleInputStyle(event) {
    if (event && event.target && event.target.classList.length) {
        event.target.classList.remove('login-input-error')
        event.target.classList.add('login-input-ordinary')

        if (event.target.parentNode) {
            let errorTip = event.target.parentNode.getElementsByClassName('error-tip')[0]
            if (errorTip) {
                // 判断是否是https访问
                let content = event.target.value
                if(content && content.indexOf('https://') >= 0){
                    errorTip.innerText =  currentLocale["L140"]
                    errorTip.style.display = "block"
                    loginButton.disabled = true
                }else{
                    errorTip.innerText = ''
                    errorTip.style.display = "none"
                    loginButton.disabled = false
                }
            }
        }
    }
}

/**
 * ip输入框失去焦点的监听事件
 * @param event
 */
function addressCheck(event){
    console.log(event.target.value)
    if(event && event.target && event.target.value){
        if (!IsIpFormatLegal(event.target.value)) {
            showAddressErrorTip(currentLocale['L25'])
        }
    }
}

/**
 * 显示登录tip提示
 * @param type
 * @param messageKey
 * @param num
 */
function setLoginTips(type, messageKey, num) {
    let className = ''
    switch (type) {
        case 'CLOSE':
            // 关闭tip提示
            loginTips.style.opacity = 0
            break
        case 'SUCCESS':
            className = 'login-success-tip'
            break
        case 'VERIFICATION':
            className = 'login-verification-tip'
            break
        case 'UNAUTHORIZED':
            className = 'login-unauthorized-tip'
            break
        case 'TIMEOUT':
        case 'ERROR':
        case 'SyntaxError':
            className = 'login-error-tip'
            break
        default:
            break
    }
    if (className) {
        let message = currentLocale[messageKey]
        if(messageKey === 'L12'){
            message = num ? message.replace("{0}", num) : message.split('.')[0]
        }
        loginTips.innerHTML = ''
        let childElement = document.createElement('div')
        childElement.className = className
        childElement.style.display = 'block'
        if (type === 'VERIFICATION') {
            let newSpan = document.createElement('span')
            newSpan.innerText = message
            childElement.appendChild(newSpan)
            // childElement.innerHTML = '<span>' + message + '</span>'

            let tipCloseEle = document.createElement('span')
            tipCloseEle.className = 'login-verification-tip-close icon GRP-icon-tip-close'
            tipCloseEle.onclick = function () {
                setLoginTips('CLOSE', 'L21')
            }
            childElement.appendChild(tipCloseEle)
        } else {
            childElement.innerText = message
        }
        loginTips.appendChild(childElement)
        loginTips.style.opacity = 1
    }

    // 清除登录loading状态
    loginButton.value = currentLocale['L9']
    loadEffect.style.display = 'none'

    if (loginArea.style.display === 'none' && !grpClick2Talk.isLogin) {
        // 登录状态变化时退回登录页面
        console.log('[EXT] login status change, login false')
        switchDisplayPage(grpClick2Talk.isLogin, grpClick2Talk.loginData)

        /* 清除账号列表状态 */
        deviceAccounts.innerHTML = ''
        selectAccount.innerText = ''
        selectAccount.setAttribute('accountId', '')
    }
}

/**
 * 设置拨号页面提示
 * @param tipKey
 * @param autoCloseTip  是否自己关闭tip提示
 * @param className
 */
function setPopupTips(tipKey, autoCloseTip, className) {
    if (!tipKey) {
        return
    }

    if (!popupTip) {
        popupTip = document.getElementsByClassName('popup-tips')[0]
    }
    let classLists = popupTip.classList
    for(let i = 0; i<classLists.length; i++){
        if(classLists[i] !== "popup-tips"){
            popupTip.classList.remove(classLists[i])
        }
    }
    if (className) {
        popupTip.classList.add(className)
    }

    popupTip.textContent = currentLocale[tipKey]
    popupTip.classList.remove('popup-tips-opacity-0')
    popupTip.classList.add('popup-tips-opacity-1')

    // 2秒后关闭提示
    if (autoCloseTip) {
        if (popupTipTimeoutEvent) {
            clearTimeout(popupTipTimeoutEvent)
            popupTipTimeoutEvent = null
        }

        popupTipTimeoutEvent = setTimeout(function () {
            popupTip.classList.remove('popup-tips-opacity-1')
            popupTip.classList.add('popup-tips-opacity-0')
            if (className) {
                popupTip.classList.remove(className)
            }
        }, TIP_CLOSE_DELAY)
    }
}

/**
 * 自动填充已有的登录信息
 * @param data
 * {
 *
    accountLists: [],
    password: "admin123",
    selectedAccountId: 0,
    url: "https://192.168.131.151",
    username: "admin",
 * }
 */
function setLoginFromData(data) {
    if (data.url) {
        if(data.url.indexOf('/addon') > 0){
            let urlArray = data.url.split('/addon')
            addressInput.value = urlArray[0]
        }else{
            addressInput.value = data.url
        }
    }
    if (data.username) {
        usernameInput.value = data.username
    }
    if (data.password) {
        passwordInput.value = data.password
    }

    if (!data.url && !data.username && !data.password) {
        console.log('Set default user account.')
        usernameInput.value = 'addons'
    }
}

/***************************************************拨号区*********************************************/
/**
 * 判断之前选择的账号是否还处于激活状态
 * @param accounts
 * @returns {boolean}
 */
function isPreSelectAccountActive(accounts){
    let active = false
    for(let i = 0; i<accounts.length; i++){
        if(parseInt(accounts[i].reg) === 1 && parseInt(accounts[i].id) === parseInt(grpClick2Talk.loginData.selectedAccountId)){
            active = true
            break
        }
    }
    console.log('pre select account active ? ', active)
    return active
}

/**
 * 设置当前设备的账号列表
 * 更新场景：
 * 	1.注册的账号变为非注册(reg=0)
 * 	2.添加账号
 * 	3.注册的账号被删除（返回的accounts列表中就不包含被删除的账号信息了）
 * @param accounts 账号列表
 */
function setDeviceAccountList(accounts) {
    console.log('set device account list:', accounts)
    if (!accounts) {
        return
    }

    let changeIcontxt = document.getElementsByClassName("change-icon-txt")[0]
    let hasRegisteredAccount = false  // 是否存在注册成功的账号
    let firstActiveAccount = null   // 保存第一个成功注册的账号
    let fragment = document.createDocumentFragment()

    let addAccountLists = function(){
        for (let i = 0; i < accounts.length; i++) {
            let account = accounts[i]
            let accountId = parseInt(account.id)
            let name = account['name']
            let sipId = account['sip_id']
            let id = account['id']
            let accountClass = 'account' + accountId
            let targetAccount = null

            /*** 账号列表没有创建过，先创建节点 ***/
            let newAccount = document.createElement('li').cloneNode(true)
            newAccount.setAttribute('accountId', id)
            newAccount.setAttribute('accountType', account.auto_cfg)
            newAccount.setAttribute('sipId', sipId)
            newAccount.setAttribute('name', name)
            newAccount.className = 'device-account ' + accountClass

            newAccount.onclick = switchAccount

            /** 处理显示icon***/
            let icon = document.createElement('div').cloneNode(true)
            icon.className = `change-icon-parent GRP-icon-person`
            icon.setAttribute('sipId', sipId)
            icon.setAttribute('accountId', id)
            icon.setAttribute('name', name)
            icon.setAttribute('accountType', account.auto_cfg)
            let iconText = document.createElement('div').cloneNode(true)
            iconText.className = 'change-icon-txt'
            iconText.setAttribute('sipId', sipId)
            iconText.setAttribute('accountId', id)
            iconText.setAttribute('accountType', account.auto_cfg)
            iconText.setAttribute('name', name)
            iconText.textContent = id
            icon.appendChild(iconText)
            newAccount.appendChild(icon)

            /*** 处理显示账号内容***/
            let span = document.createElement('span').cloneNode(true)
            span.className = `accountContentWrap account_${name}_${sipId}`
            span.setAttribute('accountId', id)
            span.setAttribute('accountType', account.auto_cfg)
            span.setAttribute('sipId', sipId)
            span.textContent = `${name} (${sipId})`
            span.onmousemove = mousemoveHandle
            newAccount.appendChild(span)

            fragment.appendChild(newAccount)
            targetAccount = newAccount

            if (parseInt(account.reg) === 1){
                // 账号已激活
                hasRegisteredAccount = true
                targetAccount.style.display = 'flex'
                // 更新账号信息
                targetAccount.setAttribute('sipid', sipId)
                targetAccount.setAttribute('accountType', account.auto_cfg)

                if (!firstActiveAccount) {
                    firstActiveAccount = targetAccount
                }
            }else {
                // 账号从激活状态->未激活状态时，webSocket不会推送未激活状态的账号信息
            }

            if (i === accounts.length - 1) {
                deviceAccounts.appendChild(fragment)
            }
        }
    }

    for(let i = deviceAccounts.children.length - 1; i >= 0; i--){
        let li = deviceAccounts.children[i]
        deviceAccounts.removeChild(li)
    }
    if(accounts.length){
        if(!isPreSelectAccountActive(accounts)){
            updateSelectedAccountId('')
        }

        addAccountLists()

        if (!grpClick2Talk.loginData.selectedAccountId && firstActiveAccount) {
            // 重新设置选择的账号ID，默认为第一个激活的账号
            updateSelectedAccountId(firstActiveAccount.getAttribute('accountid'))
        }
    }

    for (let j = 0; j < deviceAccounts.children.length; j++) {
        let accountItem = deviceAccounts.children[j]
        let accountId = accountItem.getAttribute('accountId')
        if (parseInt(accountId) === parseInt(grpClick2Talk.loginData.selectedAccountId)) {
            if(changeIcontxt){
                changeIcontxt.textContent = grpClick2Talk.loginData.selectedAccountId
            }
            accountItem.lastChild && accountItem.lastChild.classList.add('device-account-active')
            let sipId = accountItem.getAttribute('sipid')
            let name = accountItem.getAttribute('name')
            selectAccount.innerText = `${name} (${sipId})`
            selectAccount.setAttribute('accountType', accountItem.getAttribute('accountType'))
            selectAccount.setAttribute('accountId', accountId)
        } else {
            accountItem.lastChild && accountItem.lastChild.classList.remove('device-account-active')
        }
    }

    setSelectAccount(hasRegisteredAccount)
}

/**
 * 设置选择的账号是否显示及tip提示
 * @param hasRegisteredAccount
 */
function setSelectAccount(hasRegisteredAccount) {
    if (hasRegisteredAccount) {
        changeSelectAccount.style.display = 'flex'
        popupTip.innerHTML = ''
        popupTip.classList.remove('popup-tips-opacity-1')
        popupTip.classList.add('popup-tips-opacity-0')

        callButton.disabled = false
        callButton.style.backgroundColor = "#27CA15";
    } else {
        changeSelectAccount.style.display = 'none'
        callButton.disabled = true
        callButton.style.backgroundColor = "#c5c5c5";
        // websocket连接成功，且没有账号时，页面显示tip提示账号可能未注册
        if(grpClick2Talk.websocketStatus === 1){
            showPopupTip("L19")
        }
    }
}

/**
 * 显示账号列表
 */
function setAccountsDisplay() {
    console.log('deviceAccounts display:', deviceAccounts.style.display)
    if (deviceAccounts.style.display === 'flex') {
        deviceAccounts.style.display = 'none'
        accountArrowSwitch.classList.remove('GRP-icon-arrow_up')
        accountArrowSwitch.classList.add('GRP-icon-arrow_down')
    } else {
        deviceAccounts.style.display = 'flex'
        accountArrowSwitch.classList.remove('GRP-icon-arrow_down')
        accountArrowSwitch.classList.add('GRP-icon-arrow_up')
    }
}

/**针对账号处理鼠标移入**/
function selectAccountMousemoveHandler(event){
    if (!event || !event.target) {
        return
    }
    let element = event.target
    let offsetWidth = element.offsetWidth
    let scrollWith = element.scrollWidth

    /**判断元素是否出现了省略号，即文本内容的宽度是否超过了元素的宽度**/
    if(scrollWith > offsetWidth){
        element.title = element.textContent
        element.classList.add('select-account-words_hover')
    }
}

/**
 * 账号切换
 */
function switchAccount(event) {
    if (!event || !event.target) {
        return
    }
    let accountId = event.target.getAttribute('accountId')
    let sipId = event.target.getAttribute('sipId')
    let accountArray = document.getElementsByClassName('device-account')
    let changeIcontxt = document.getElementsByClassName("change-icon-txt")[0]
    changeIcontxt.textContent = accountId
    for (let i = 0; i < accountArray.length; i++) {
        let account = accountArray[i]
        let name = account.getAttribute('name')
        if (account.getAttribute('accountId') === accountId) {
            account.classList.add('device-account-active')
            account.lastChild && account.lastChild.classList.add('device-account-active')
            selectAccount.innerText =  `${name} (${sipId})`
            if( selectAccount.classList.contains("select-account-words_hover")){
                selectAccount.classList.remove("select-account-words_hover")
                selectAccount.setAttribute('title','')
            }
            selectAccount.setAttribute('accountType', event.target.getAttribute('accountType'))
            selectAccount.setAttribute('accountId', accountId)
        } else {
            account.classList.remove('device-account-active')
            account.lastChild && account.lastChild.classList.remove('device-account-active')
        }
    }

    updateSelectedAccountId(accountId)
    setAccountsDisplay()
}

/**针对鼠标移入选择账户**/
function mousemoveHandle(event){
    if (!event || !event.target) {
        return
    }
    if( !event.target.classList.contains('accountContentWrap')) return

    let element = event.target
    let offsetWidth = element.offsetWidth
    let scrollWith = element.scrollWidth

    /**判断元素是否出现了省略号，即文本内容的宽度是否超过了元素的宽度**/
    if(scrollWith > offsetWidth){
        element.title = element.textContent
    }
}

/**
 * 更新当前选择的账号信息
 * @param accountId
 */
function updateSelectedAccountId(accountId) {
    grpClick2Talk.loginData.selectedAccountId = accountId
    console.log('update selected accountId: ', accountId)

    popupSendMessage2Background({
        cmd: 'setSelectedAccount',
        data: {
            accountId: accountId
        }
    })
}


/**
 * 实时更新线路信息
 * line_status 可以获取当前支持的最大线路数，是当前所有线路的状态(包括会议线路)
 * 	let testData = [
        {acct: 0, active: 0, conf: 0, line: 1, remotename: "", remotenumber: "", state: "idle",},
        {acct: 0, active: 0, conf: 0, line: 2, remotename: "", remotenumber: "", state: "idle",}
    ]
 */
function updateLineStatus(lines) {
    if (!lines) {
        return
    }
    grpClick2Talk.lineData = lines
    // 添加挂断，接听，hold按钮
    function createLi(line) {
        let btn = ''
        if (line.state === 'ringing') {
            btn = `<grp-call-button type="answer" line="${line.line}"></grp-call-button>
                   <grp-call-button type="reject" line="${line.line}"></grp-call-button>`
        } else if (line.state === 'connected') {
            btn = `<grp-call-button type="hold" line="${line.line}"></grp-call-button>
                   <grp-call-button type="hangup" line="${line.line}"></grp-call-button>`
        } else if (line.state === 'calling') {
            btn = `<grp-call-button type="cancel" line="${line.line}"></grp-call-button>`
        } else if (line.state === 'onhold') {
            btn = `<grp-call-button type="unhold" line="${line.line}"></grp-call-button>
                   <grp-call-button type="hangup" line="${line.line}"></grp-call-button>`
        }
        return btn
    }
    let activeLineCount = 0  // 通话中的线路数
    let lineCount = 0        // 正在使用的线路数（会议中的线路算一条线路）
    let confExist = false
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]
        let lineClass = 'line' + line.line
        let existLineItem = lineDisplay.getElementsByClassName(lineClass)[0]

        if (line.state !== 'idle') {  // 空闲状态的线路不显示
            activeLineCount++
            if(!line.conf){
                lineCount++
            }else {
                if(!confExist){  // 会议中的线路算一条线路
                    lineCount++
                    confExist = true
                }
            }

            let remoteShowNumber = line.remotenumber
            if (!existLineItem) {
                let newLine = document.createElement('ul')
                newLine.className = 'active-line ' + lineClass
                /**
                 * 超过4条线路时，隐藏多余的线路
                 * Firefox 无法自动调整窗口大小
                 */
                if (activeLineCount > 3 && getBrowserDetail().browser !== 'firefox') {
                    newLine.className = newLine.className + ' active-line-hide'
                }

                let child1 = document.createElement('li')
                child1.innerHTML = `<grp-fun-button type="share" issharing ="false"  disabled='true' line="${line.line}" conf="${line.conf}"></grp-fun-button>
                                    <grp-fun-button type="file"  issharing ="false"  disabled='true' line="${line.line}" conf="${line.conf}"></grp-fun-button>
                                    <grp-fun-button type="contacts" disabled='true' line="${line.line}" conf="${line.conf}"></grp-fun-button>`

                let child2 = document.createElement('li')
                child2.innerHTML = '<span>' + (Number(line.acct) + 1) + '</span><span>' + line.remotename + '</span><span>' + remoteShowNumber + '</span><span>' + line.state + '</span>'

                let child3 = document.createElement('li')
                child3.innerHTML = createLi(line)
                newLine.appendChild(child1)
                newLine.appendChild(child2)
                newLine.appendChild(child3)

                lineDisplay.appendChild(newLine)
            } else {
                // 更新线路状态
                existLineItem.children[1].innerHTML = '<span>' + (Number(line.acct) + 1) + '</span><span>' + line.remotename + '</span><span>' + remoteShowNumber + '</span><span>' + line.state + '</span>'
                existLineItem.children[2].innerHTML = createLi(line)
            }
            let state = lineDisplay.getElementsByClassName(lineClass)[0].children[1].children[3]
            if(line.state === 'onhold'){
                state.textContent = 'OnHold'
                state.style.color = '#F8B222'
                lineDisplay.getElementsByClassName(lineClass)[0].style.borderColor = '#E1E3E6'
                lineDisplay.getElementsByClassName(lineClass)[0].style.boxShadow = 'none'
            }else if(line.state === 'connected'){
                state.style.color = '#C5C5C5'
                lineDisplay.getElementsByClassName(lineClass)[0].style.borderColor = '#27CA15'
                lineDisplay.getElementsByClassName(lineClass)[0].style.boxShadow = '0 0 7px 0 #00000066'
            }else{
                state.style.color = '#C5C5C5'
                lineDisplay.getElementsByClassName(lineClass)[0].style.borderColor = '#E1E3E6'
                lineDisplay.getElementsByClassName(lineClass)[0].style.boxShadow = 'none'
            }

            if (existLineItem && existLineItem.children.length) {
                // 判断文本是否溢出,溢出则设置hover tip
                let child = existLineItem.children[0]
                if (child.scrollWidth > child.clientWidth) {
                    child.title = line.remotenumber
                    // child.dataset.title = line.remotenumber
                } else {
                    // 删除data-title属性
                    delete child.title
                    // delete child.dataset.title
                }
            }
        } else {
            if (existLineItem) {
                lineDisplay.removeChild(existLineItem)  // 删除已存在的空闲线路
            }
        }
    }

    // Line 0/2
    let content = currentLocale['L28'] + ' ' + lineCount + '/' + grpClick2Talk.maxLinesNum
    linesCount.setAttribute('dataBefore', content)

    if (activeLineCount >= 4) {
        lineExpand.style.display = 'block'

        if(getBrowserDetail().browser !== 'firefox'){
            lineExpand.classList.remove('GRP-icon-arrow_double_up')
            lineExpand.classList.add('GRP-icon-arrow_double_down')
        }else {
            lineExpand.classList.remove('GRP-icon-arrow_double_down')
            lineExpand.classList.add('GRP-icon-arrow_double_up')
        }
    }else {
        lineExpand.style.display = 'none'
    }
}

/**
 * 线路展开/隐藏
 * 线路多余4个时显示切换按钮
 */
function lineExpandClick() {
    let childList = lineDisplay.getElementsByTagName('ul')
    if (childList.length && childList.length >= 4) {
        let expanded
        if (lineExpand.classList.contains('GRP-icon-arrow_double_down')) {
            // 当前处于隐藏状态
            lineExpand.classList.remove('GRP-icon-arrow_double_down')
            lineExpand.classList.add('GRP-icon-arrow_double_up')
            expanded = false
        } else {
            // 数据已展开
            lineExpand.classList.remove('GRP-icon-arrow_double_up')
            lineExpand.classList.add('GRP-icon-arrow_double_down')
            expanded = true
        }

        for (let i = 3; i < childList.length; i++) {
            if (expanded) {
                childList[i].style.display = 'none'
            } else {
                childList[i].style.display = 'block'
            }
        }

        if(expanded){
            window.resizeTo(window.outerWidth, initOuterHeight)
        }else {
            window.resizeTo(window.outerWidth, initOuterHeight_Line_expand)
        }
    }
}

function handleWindowResize(){
    let newHeight = window.outerHeight
    let childList = lineDisplay.getElementsByTagName('ul')
    if(childList.length > 3){
        let display = ''
        if(newHeight < initOuterHeight_Line_expand){
            display = 'none'
            lineExpand.classList.remove('GRP-icon-arrow_double_up')
            lineExpand.classList.add('GRP-icon-arrow_double_down')
        }else {
            display = 'block'
            lineExpand.classList.remove('GRP-icon-arrow_double_down')
            lineExpand.classList.add('GRP-icon-arrow_double_up')
        }
        for (let i = 3; i < childList.length; i++) {
            childList[i].style.display = display
        }
    }
}

/** 获取本地storage
 * **/
async function getLocalStorage(){
    let readLocalStorage = async (key) => {
        return new Promise((resolve, reject) => {
            extensionNamespace.storage.local.get([key], function (result) {
                if (result[key] === undefined) {
                    reject();
                } else {
                    let getPhoneBooks = JSON.parse(result[key])
                    // console.log('[EXT] get phone book!', getPhoneBooks)
                    resolve(getPhoneBooks);
                }
            });
        });
    };
    grpClick2Talk.phoneBooks = await readLocalStorage('phoneBooks')

    return grpClick2Talk.phoneBooks
}

/**
 * 获取ldap和 本地通讯录联系人列表
 * @returns {[]}
 */
async function getPhoneBookArray() {
    let result = {
        ldap: [],
        localAddressBook: [],
        phoneBookGroup: []
    }
    if(!grpClick2Talk.contactSearchFrom.ldap && !grpClick2Talk.contactSearchFrom.localAddressBook){
        console.log('contacts disabled')
        return result
    }
    let phoneBooks = await getLocalStorage()
    if (phoneBooks) {
        if (grpClick2Talk.contactSearchFrom.ldap && phoneBooks.ldap && phoneBooks.ldap.length && phoneBooks.ldap[0] !== 'timeout') {
            result.ldap = phoneBooks.ldap
        }
        if (grpClick2Talk.contactSearchFrom.localAddressBook && phoneBooks.localAddressBook && phoneBooks.localAddressBook.length) {
            result.localAddressBook = phoneBooks.localAddressBook
        }
        if(phoneBooks.phoneBookGroup && phoneBooks.phoneBookGroup.length){
            result.phoneBookGroup = phoneBooks.phoneBookGroup
        }
    }
    return result
}

/**
 * 匹配文本高亮设置
 * @param filter 搜索的文本
 * @param regTarget 需要匹配设置高亮的字符串
 * @param parentNode
 */
function addHighlightSpan(filter, regTarget, parentNode) {
    let initTarget = regTarget
    filter = filter?.toLowerCase()
    regTarget = regTarget?.toLowerCase()

    let replaceReg = new RegExp(filter, "g");
    if (replaceReg.test(regTarget) ) {
        let highlightChild = document.createElement('span')
        highlightChild.className = 'search-highlight'

        let targetIndex = regTarget.indexOf(filter)
        let preContent = initTarget.substring(0, targetIndex)
        let highlightText = initTarget.substring(targetIndex, targetIndex + filter.length)  // 高亮文本
        let endContent = initTarget.substring(targetIndex + filter.length)

        if(preContent){
            let preSpan = document.createElement('span')
            preSpan.textContent = preContent
            parentNode.appendChild(preSpan)
        }
        highlightChild.textContent = highlightText
        parentNode.appendChild(highlightChild)
        if(endContent){
            let endSpan = document.createElement('span')
            endSpan.textContent = endContent
            parentNode.appendChild(endSpan)
        }
    } else {
        parentNode.textContent = regTarget
    }
}

/**
 * 高亮设置
 * @param currentItem  过滤item
 * @param searchNumber 需要匹配高亮的字符串
 */
function valueMatchAndHighlight(currentItem, searchNumber) {
    // 兼容ldap 和 本地通讯录搜索字段
    let email = currentItem.email || currentItem.Mail
    // 匹配文本设置高亮
    let phonenumber
    if("AccountNumber" in currentItem){    // ldap
        phonenumber = currentItem.AccountNumber
    }else if("Phone" in currentItem){      // 本地通讯录
        phonenumber = getPhoneNumber(currentItem, searchNumber)
    }
    let {fullName, chineseFullName} = getFullName(currentItem)
    // 为避免匹配到联系人后页面没有显示高亮，通过中文全名匹配到联系人时，显示也使用中文全名
    if(chineseFullName?.includes(searchNumber)){
        fullName = chineseFullName
    }

    if (phonenumber) {
        let resultMenu = document.createElement('div')
        resultMenu.className = 'result-menu'
        let child1 = document.createElement('div')
        child1.className = 'menu-info'
        let child2 = document.createElement('div')
        child2.className = 'menu-name'
        let child3 = document.createElement('div')
        child3.className = 'menu-number'
        addHighlightSpan(searchNumber, phonenumber, child3)

        addHighlightSpan(searchNumber, fullName, child2)
        child1.appendChild(child2)
        child1.appendChild(child3)

        if (email) {
            let child4 = document.createElement('div')
            child4.className = 'menu-mail'
            addHighlightSpan(searchNumber, email, child4)
            child1.appendChild(child4)
        }
        resultMenu.appendChild(child1)
        // resultMenu.innerHTML = innerHTML

        resultMenu.onclick = function () {
            console.log('click change phoneNumber, ', phonenumber)
            phoneNumber.value = phonenumber
            searchResult.style.display = 'none'
        }
        resultMenu.addEventListener('mousedown', function () {
            console.log('mousedown change phoneNumber, ', phonenumber)
            phoneNumber.value = phonenumber
            searchResult.style.display = 'none'
        })
        searchResult.style.display = 'block'
        searchResult.appendChild(resultMenu)
    } else {
        // 匹配到邮箱，但是没有号码时，不做显示
    }
}

/**
 * 使用正则表达式检查字符是否在中文的 Unicode 范围内
 * @param char
 * @returns {boolean}
 */
function isChinese(char) {
    return /^[\u4E00-\u9FA5]+$/.test(char);
}

/**
 * 判断是否是纯数字
 * @param number
 * @returns {boolean}
 */
function isNumber(number){
    return /^\d+$/.test(number)
}

/**
 * 获取全名，规则如下：
 * （1）对于ldap，获取的CallerIDName或calleridname就是全名
 * （2）对于本地通讯录：
 *       FirstName + " " + LastName为全名，只存在一个时，则全名为FirstName或LastName，拼接时中间添加空格符。
 *      如果FirstName以中文开头，则保存中文全名为 LastName + FirstName；
 *  (3) 文本转换为小写进行对比
 * @param item
 * @returns {{fullName: string, chineseFullName: string}}
 */
function getFullName(item){
    let fullName = '';
    let chineseFullName = ''
    if(item.CallerIDName || item.calleridname){ // 针对ldap
        fullName = item.CallerIDName || item.calleridname

        // CallerIDName存在 : "某某 王"的情况，不转换无法匹配
        if (isChinese(fullName[0]) && fullName.indexOf(" ") > -1){
            // "某某 王" 转换为 “王某某”
            chineseFullName = fullName?.split(' ').reverse().join("").replace(/[ ]/g,"")
        }
    }else if(item.FirstName || item.LastName){  // 针对本地通讯录
        if(item.FirstName && item.LastName){
            fullName = item.FirstName + " " + item.LastName

            let nameArr = item.FirstName.split('')
            if(isChinese(nameArr[0])){
                chineseFullName = item.LastName + item.FirstName
            }
        }else {
            fullName = item.FirstName || item.LastName
        }
    }

    return {
        fullName: fullName.toString().trim(),
        chineseFullName: chineseFullName.toString().trim(),
    }
}


/**
 * 无论联系人是通过姓名、邮箱还是电话号码匹配时，获取匹配对象的电话号码
 * @param currentItem
 * @param searchNumber 搜索的文本
 */
function getPhoneNumber(currentItem, searchNumber){
    let phonenumber
    if("AccountNumber" in currentItem){
        phonenumber = currentItem['AccountNumber']
    }else if("Phone" in currentItem){
        if (Object.prototype.toString.call(currentItem['Phone']) === '[object Object]') {
            // Phone 只有一个号码时，数据为对象格式
            phonenumber = currentItem['Phone'].phonenumber
        } else if (Object.prototype.toString.call(currentItem['Phone']) === '[object Array]') {
            // Phone 存在多个号码时，数据为数组格式。
            let firstMarch = ''
            for (let j = 0; j < currentItem['Phone'].length; j++) {
                let number = currentItem['Phone'][j].phonenumber
                if (number) {
                    // 1.优先获取与输入文本匹配的号码
                    if(number.toLowerCase().indexOf(searchNumber) > -1){
                        phonenumber = number
                        break
                    }
                    // 2.都不匹配时使用第一个
                    if(!firstMarch){
                        firstMarch = number
                    }
                }
            }
            if(!phonenumber){
                phonenumber =firstMarch
            }
        }
    }
    return phonenumber
}

/**
 * 判断搜索的文本是否与某个号码匹配
 * @param target 联系人信息
 * @param searchContent 搜索的文本
 * @returns {*}
 */
function numberMatch(target, searchContent){
    let result
    if (Object.prototype.toString.call(target['Phone']) === '[object Object]') {
        // Phone 只有一个号码时，数据为对象格式
        if(target['Phone'].phonenumber?.includes(searchContent)){
            result = target['Phone'].phonenumber
        }
    } else if (Object.prototype.toString.call(target['Phone']) === '[object Array]') {
        // Phone 存在多个号码时，数据为数组格式。
        for (let j = 0; j < target['Phone'].length; j++) {
            if(target['Phone'][j].phonenumber?.includes(searchContent)){
                result = target['Phone'][j].phonenumber
                break
            }
        }
    }
    return result
}

/**
 * 搜索联系人
 * 1.phoneBooks 拼接规则： ldap + localAddressBook 本地通讯录
 * 2.phoneBooks 查找规则： 匹配号码、姓名或 邮箱
 * 3.显示规则 ：
 *  （1）同时匹配到邮箱和号码时，显示号码、邮箱，姓名存在时也显示姓名
 *  （2）仅匹配到号码时，显示号码，姓名存在时也显示姓名
 *  （3）仅匹配到邮箱，没有匹配号码时，页面不做显示
 */
let searchKeys = ['AccountNumber', 'CallerIDName', 'email', 'FirstName', 'LastName', 'Phone', 'Mail', 'calleridname']  // 通过姓名、邮箱、电话号码查询
async function searchForContacts() {
    document.querySelector("div.number-from").style.display = 'none'
    let searchContent = phoneNumber.value
    if(searchContent && searchContent.trim){
        searchContent = searchContent.trim() // 去除字符串前后空格
    }
    if (!searchContent) {   // 没有内容时，清除搜索内容
        searchResult.innerHTML = ''
        return
    }

    searchResult.innerHTML = ''                  // 先清除上一次的搜索记录
    // 搜索类型为号码时，添加单独显示区域
    let isSearchNumber = isNumber(searchContent)
    if (isSearchNumber) {
        let inputNumberEle = document.createElement('div')
        inputNumberEle.className = 'result-menu result-menu-select phone-number-text'
        inputNumberEle.innerHTML = '<div class="number-input-text">' + searchContent + '</div>'
        inputNumberEle.onclick = function () {
            phoneNumber.value = searchContent
            searchResult.style.display = 'none'
        }
        searchResult.appendChild(inputNumberEle)
    }

    let filterMatch = false      // 是否匹配到联系人
    let filterFullMatch = false  // 搜索字段是否存在完全匹配
    searchContent = searchContent.toLowerCase()  // 搜索的文本转换为小写进行匹配
    let reg1 = new RegExp("-","g"); // 加'g'，删除字符串里所有的"-"，匹配带"-"的号码：626-624-5033
    searchContent = searchContent.replace(reg1,"");
    let phoneBooks = await getPhoneBookArray()
    if(phoneBooks.ldap.length && (dial || contactsType === 'ldap')){
        for (let i = 0; i < phoneBooks.ldap.length; i++) {
            let user = phoneBooks.ldap[i]
            let {fullName, chineseFullName} = getFullName(user)
            let callerIDName = fullName?.toLowerCase()
            chineseFullName = chineseFullName?.toLowerCase()
            let emailInfo = user.email || user.Mail

            if (user?.AccountNumber?.includes(searchContent) || callerIDName?.includes(searchContent)
                || chineseFullName?.includes(searchContent) || emailInfo?.includes(searchContent))
            {
                valueMatchAndHighlight(user, searchContent)
                if (user?.AccountNumber === searchContent) {
                    filterFullMatch = true
                }
                filterMatch = true
            }
        }
    }

    if(phoneBooks.localAddressBook.length && (dial || contactsType === 'localAddressBook')){
        for (let j = 0; j < phoneBooks.localAddressBook.length; j++){
            let user = phoneBooks.localAddressBook[j]
            let {fullName, chineseFullName} = getFullName(user)
            fullName = fullName?.toLowerCase()
            chineseFullName = chineseFullName?.toLowerCase()
            let emailInfo = user.email || user.Mail

            if (fullName?.includes(searchContent) || chineseFullName?.includes(searchContent) ||
                emailInfo?.includes(searchContent) || numberMatch(user, searchContent))
            {
                valueMatchAndHighlight(user, searchContent)

                let phonenumber = numberMatch(user, searchContent)
                if (phonenumber === searchContent) {
                    filterFullMatch = true
                }
                filterMatch = true
            }
        }
    }

    if (!filterMatch) {
        // 没有其他匹配项时，不显示下拉列表
        searchResult.style.display = 'none'
    } else if (filterFullMatch) {
        let typeNumber = document.getElementsByClassName('phone-number-text')[0]
        if (typeNumber) {
            typeNumber.style.display = 'none'
        }
    }
}

/**
 * 切换登录和拨号显示界面
 * @param isLogin 是否处于已登录状态
 * @param loginData 当前登录信息
 */
function switchDisplayPage(isLogin, loginData) {
    console.log('[EXT] already login ' + isLogin)
    if (isLogin) {
        // 切换页面显示
        loginArea.style.display = 'none'
        dialArea.style.display = 'block'

        setDeviceAccountList(loginData.accountLists)

        if (grpClick2Talk.keepUserInfo === false && !privacySettings.classList.contains('GRP-icon-security-blue')) {
            console.log('set security enabled')
            privacySettings.classList.add('GRP-icon-security-blue')
        }
        autoFillNumber()
    } else {
        dialArea.style.display = 'none'
        loginArea.style.display = 'block'
        if (loginData) {
            // 自动填充之前的账号信息
            setLoginFromData(loginData)
        }
    }
}

/***********************************************交互区**********************************************************/

/**
 * IPV4/IPV6/ mac 地址校验
 * https://www.w3cschool.cn/notebook/notebook-jghl2tn5.html
 * @param value
 * @returns {string}
 */
function IsIpFormatLegal(value) {
    let checkValue = value
    if (checkValue.indexOf('https://') >= 0) {
        checkValue = checkValue.split('https://')[1]
    } else if (checkValue.indexOf('http://') >= 0) {
        checkValue = checkValue.split('http://')[1]
    }

    // 去除IP前面的括号
    if (checkValue.indexOf('[') >= 0) {
        checkValue = checkValue.split('[')[1]
    }
    // 去除IP后面的括号
    if (checkValue.indexOf(']') >= 0) {
        checkValue = checkValue.split(']')[0]
    }

    // 去除IP后面的端口号
    if(checkValue.indexOf(':') >= 0){
        checkValue = checkValue.split(':')[0]
    }

    let ipExp = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){6}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^::([\da-fA-F]{1,4}:){0,4}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:):([\da-fA-F]{1,4}:){0,3}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){2}:([\da-fA-F]{1,4}:){0,2}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){3}:([\da-fA-F]{1,4}:){0,1}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){4}:((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^:((:[\da-fA-F]{1,4}){1,6}|:)$|^[\da-fA-F]{1,4}:((:[\da-fA-F]{1,4}){1,5}|:)$|^([\da-fA-F]{1,4}:){2}((:[\da-fA-F]{1,4}){1,4}|:)$|^([\da-fA-F]{1,4}:){3}((:[\da-fA-F]{1,4}){1,3}|:)$|^([\da-fA-F]{1,4}:){4}((:[\da-fA-F]{1,4}){1,2}|:)$|^([\da-fA-F]{1,4}:){5}:([\da-fA-F]{1,4})?$|^([\da-fA-F]{1,4}:){6}:$/
    if (checkValue.match(ipExp) || checkValue.indexOf('.local') >= 0) {
        return true
    } else {
        return false
    }
}

/**
 * 判断是否是IPV4地址
 * https://www.w3cschool.cn/notebook/notebook-jghl2tn5.html
 * @param value
 * @returns {*}
 */
function isIPV4(value) {
    let checkValue = value
    if (checkValue.indexOf('://') >= 0) {
        checkValue = checkValue.split('://')[1]
    }

    let ipv4Exp = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/
    return checkValue.match(ipv4Exp)
}

/**
 * 判断是否是IPV6地址
 * https://www.w3cschool.cn/notebook/notebook-jghl2tn5.html
 * @param value
 * @param value
 * @returns {*}
 */
function isIPV6(value) {
    let checkValue = value
    // 去除https://[ 部分，仅保留IP
    if (checkValue.indexOf('https://') >= 0) {
        checkValue = checkValue.split('https://')[1]
    } else if (checkValue.indexOf('http://') >= 0) {
        checkValue = checkValue.split('http://')[1]
    }

    // 去除IP前面的括号
    if (checkValue.indexOf('[') >= 0) {
        checkValue = checkValue.split('[')[1]
    }
    // 去除IP后面的括号
    if (checkValue.indexOf(']') >= 0) {
        checkValue = checkValue.split(']')[0]
    }
    let ipv6Exp = /^([\da-fA-F]{1,4}:){6}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^::([\da-fA-F]{1,4}:){0,4}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:):([\da-fA-F]{1,4}:){0,3}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){2}:([\da-fA-F]{1,4}:){0,2}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){3}:([\da-fA-F]{1,4}:){0,1}((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){4}:((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$|^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^:((:[\da-fA-F]{1,4}){1,6}|:)$|^[\da-fA-F]{1,4}:((:[\da-fA-F]{1,4}){1,5}|:)$|^([\da-fA-F]{1,4}:){2}((:[\da-fA-F]{1,4}){1,4}|:)$|^([\da-fA-F]{1,4}:){3}((:[\da-fA-F]{1,4}){1,3}|:)$|^([\da-fA-F]{1,4}:){4}((:[\da-fA-F]{1,4}){1,2}|:)$|^([\da-fA-F]{1,4}:){5}:([\da-fA-F]{1,4})?$|^([\da-fA-F]{1,4}:){6}:$/
    return checkValue.match(ipv6Exp)
}

function showAddressErrorTip(innerText) {
    addressInput.classList.remove('login-input-ordinary')
    addressInput.classList.add('login-input-error')
    let errorTip = document.getElementsByClassName('address-error-tip')[0]
    errorTip.innerText = innerText
    errorTip.style.display = 'block'
}

/**
 * 登录
 */
function login() {
    console.log('[EXT] login')
    // close tip
    setLoginTips('CLOSE')
    let deviceAddress = addressInput.value
    let username = usernameInput.value
    let password = passwordInput.value

    // 去掉多余的空格
    if (deviceAddress.trim) {
        deviceAddress = deviceAddress.trim()
    }
    if (username.trim) {
        username = username.trim()
    }
    if (password.trim) {
        password = password.trim()
    }

    // 判空
    if (!deviceAddress) {
        showAddressErrorTip(currentLocale['L6'])
        return
    } else if (!IsIpFormatLegal(deviceAddress)) {
        showAddressErrorTip(currentLocale['L25'])
        return
    } else if (isIPV6(deviceAddress)) {
        /*IPV6 地址需要添加中括号*/
        if (deviceAddress.indexOf('[') < 0) {
            if (deviceAddress.indexOf('://') < 0) {
                deviceAddress = '[' + deviceAddress
            } else {
                deviceAddress = deviceAddress.split('://')[0] + '://[' + deviceAddress.split('://')[1]
            }
        }
        if (deviceAddress.indexOf(']') < 0) {
            deviceAddress = deviceAddress + ']'
        }
    }

    if (!password) {
        passwordInput.classList.remove('login-input-ordinary')
        passwordInput.classList.add('login-input-error')
        let errorTip = document.getElementsByClassName('password-error-tip')[0]
        errorTip.style.display = 'block'
        return
    }

    let loginData = {
        url: deviceAddress,
        username: username,
        password: password
    }
    popupSendMessage2Background({
        cmd: 'popupUpdateLoginInfo',
        data: loginData
    })

    // 显示登录中状态
    loginButton.value = null
    loadEffect.style.display = 'block'
}

/**
 * 登出
 */
function doLogout() {
    popupSendMessage2Background({ cmd: 'accountLogout' })

    // 切换页面
    grpClick2Talk.isLogin = false
    grpClick2Talk.websocketStatus = 0
    grpClick2Talk.phoneBooks = {}
    switchDisplayPage(grpClick2Talk.isLogin, grpClick2Talk.loginData)

    /* 清除账号列表状态 */
    deviceAccounts.innerHTML = ''
    selectAccount.innerText = ''
    phoneNumber.value = ''

    popupTip.innerHTML = ''
    popupTip.classList.remove('popup-tips-opacity-1')
    popupTip.classList.add('popup-tips-opacity-0')

    selectAccount.setAttribute('accountId', '')
    document.querySelector("div.number-from").style.display = 'none'

    console.log('keep user info when logout:', grpClick2Talk.keepUserInfo)
    if (!grpClick2Talk.keepUserInfo) {
        console.log('clear input...')
        // 清除输入框数据
        addressInput.value = ''
        passwordInput.value = ''

        // 恢复默认值
        grpClick2Talk.keepUserInfo = true
        grpClick2Talk.wordDialingEnabled = true
        grpClick2Talk.contactSearchFrom.ldap = true
        grpClick2Talk.contactSearchFrom.localAddressBook = true
        setConfigurationItems()
    }
    for(let i in gsRTC.webrtcSessions){
        gsRTC.clearSession({lineId: gsRTC.webrtcSessions[i].lineId})
    }
    if(!dial){
        // 恢复到拨号状态
        dialTitle.click()
        contactsLocalAddressBook.click()
    }
    // 恢复初始窗口高度
    window.resizeTo(window.outerWidth, initOuterHeight)
}

/**
 * 处理呼叫
 **/

function handleCall(){
    // 首先判断是否存在共享，若存在共享，需要向提示；否则直接呼叫；
    // 提示信息：当前已存在共享，发起新呼叫后共享将被暂停
    if(currentShareContent && currentShareContent.isEstablishSuccessPc){
        callPrompt({from: 'call', role: 'caller'})
    }else {
        call()
    }
}

/**
 * 呼叫
 */
function call() {
    let callNumber = phoneNumber.value
    console.log('[EXT] call number ', callNumber)
    if (!callNumber) {
        setPopupTips("L20", true)
        return
    } else {
        if (callNumber.trim) {
            callNumber = callNumber.trim()
        }
        phoneNumber.classList.remove('warning')
    }

    let selectAccountId = selectAccount.getAttribute('accountId')
    let callData = {
        accountId: selectAccountId,
        phonenumber: callNumber
    }
    popupSendMessage2Background({
        cmd: 'popupMakeCall',
        data: callData
    })
}

/**
 * 更新登录状态
 * @param msg
 */
function updateLoginStatus(msg){
    if (msg && msg.grpClick2TalObj) {
        // 已包含所有信息：通讯录，登录账号信息等
        grpClick2Talk = msg.grpClick2TalObj

        extensionNamespace.storage.local.get('phoneBooks', function (obj) {
            if (obj && obj['phoneBooks']) {
                grpClick2Talk.phoneBooks = JSON.parse(obj['phoneBooks'])
                console.log('[EXT] get phone book!', grpClick2Talk.phoneBooks)
            }
        });
        setConfigurationItems()
    }

    if(!msg || !msg.data || !msg.data.response){
        return
    }

    switch (msg.data.response) {
        case "unauthorized":
            console.log('[EXT] login unauthorized.')
            setLoginTips('UNAUTHORIZED', 'L14')
            break
        case "success":
            console.log('[EXT] login success.')
            setLoginTips('SUCCESS', 'L22')

            // auto close the tip after 3 seconds
            setTimeout(function () {
                console.log('[EXT] close tip')
                setLoginTips('CLOSE', 'L21')
                switchDisplayPage(grpClick2Talk.isLogin, grpClick2Talk.loginData)
            }, 500)

            let { ver: version}  =  msg.data.body
            if(version && version.split(".")[2] < 4){
                console.log(`[EXT]The current version ${version} does not support connecting to websockets. Please upgrade the version`)
                setTimeout(function(){
                    setPopupTips("L118",true)
                },500)
            }
            break
        case 'failed':
            setLoginTips('ERROR', 'L13')
            break
        case "requestTimeout":
            console.log('[EXT] request timeout.')
            setLoginTips('TIMEOUT', 'L10')
            break
        case 'SyntaxError':
            console.log('[EXT] SyntaxError', msg.data.message)
            let num
            num = msg.data.body && msg.data.body.split && msg.data.body.split('wrong')[1]
            setLoginTips('SyntaxError', 'L12', num)
            break
        default:
            console.log('[EXT] login error.', msg.data)
            if(msg.data.body && msg.data.body === 'locked'){
                setLoginTips('ERROR', 'L114')
            } else if(msg.data.response.url && msg.data.response.url.indexOf('cgi-bin/access') >=0 && msg.data.response.status === 403){
                setLoginTips('ERROR', 'L48')
            } else {
                let num = msg.data.body && msg.data.body.split && msg.data.body.split('wrong')[1]
                if(num){
                    setLoginTips('ERROR', 'L12', num)
                }else {
                    setLoginTips('ERROR', 'L13')
                }
            }
            break
    }
}

/**
 * 处理共享请求
 * @param msg
 */
function handleShareScreenRequest(msg){
    if(!msg || !msg.message){
        return
    }

    let getDisplayStyle = getComputedStyle(sharePopup)['display']
    if(getDisplayStyle !== 'none'){
       console.warn("currently being displayed ")
        return
    }

    let localLineId

    console.log("Receive the presentation, whether to accept the presentation")
    /**1.添加蒙版样式  2.处理按钮文案  3.判断是否是共享 4.获取对端来电名字 5.处理注释内容 6.倒计时内容 6.显示整个弹框  **/
    mb.classList.add('mb');
    document.body.appendChild(mb);

    refuseShareBtn.innerText = currentLocale['L83']
    refuseShareBtn.classList.toggle('requestShare-bottom-cancel', false)
    acceptShareBtn.innerText = currentLocale['L84']

    let remoteName
    // 判断是否在共享
    if(msg.message.currentShareContent && msg.message.currentShareContent.shareType === 'shareScreen'){     // 共享
        let content = msg.message
        let data = content.currentShareContent
        let lineData = content.lineData

        //为接受、拒绝按钮中添加线路信息
        localLineId = data.lineId
        if(localLineId){
            refuseShareBtn.setAttribute("line", localLineId)
            acceptShareBtn.setAttribute("line", localLineId)
        }

        remoteShareInfo.shareType = 'shareScreen'
        remoteName = data.currentLineInfo?.remotename ||  data.currentLineInfo?.remotenumber

        // /*** 显示注释内容 情况一：接受端线路处于hold状态，注释hold内容 ***/
        // if(msg.message.receiveSharePopupNum >=2){
        //     // (1) 显示标注消息 ; (2) 若点击确定，关闭前一路peerConnection
        //     requestShareTipsWrapper.classList.toggle('requestShare-tips-wrapper-show', true)
        // }

        /****针对当前线路是否hold 修改提示语*****/
        let holdLine = lineData.filter((item)=> item.state === 'onhold' && item.line === localLineId )
        let existLine = lineData.filter((item)=> item.state === 'onhold' || item.state === 'connected')
        if(holdLine.length){
            // 针对单线路和多线路 hold状态进行处理
            if(existLine.length >= 2){
                // 针对多线路hold：显示标注消息 存在场景一和场景二
                // 场景一：（1）存在共享，警告语：当前存在共享，接受共享后，将自动退出原共享内容，原通话将被保持；
                // 场景二: （2）不存在共享，警告语：原通话保持。
                if(currentShareContent?.isEstablishSuccessPc || content.receiveSharePopupNum >= 2){
                    requestShareTipsSpan.innerHTML = currentLocale['L86']
                }else{
                    // 场景二
                    requestShareTipsSpan.innerHTML = currentLocale['L154']
                }
                requestShareTipsWrapper.classList.toggle('requestShare-tips-wrapper-show', true)
            }else{
                // 针对单线路hold
                requestShareText.innerHTML = remoteName + currentLocale['L153'] + currentLocale['L85']
            }
        }else{
            requestShareText.innerHTML = remoteName +  currentLocale['L85']
        }

        // 显示整个弹框
        sharePopup.classList.toggle('requestShareBox-show',true)

        // 倒计时内容
        countDown(data.lineId)

    }else{
        // 文件传输提示
        remoteShareInfo.shareType = 'shareFile'
        remoteName = msg.message.data.remoteCallInfo.remotename || msg.message.data.remoteCallInfo.remotenumber
        let fileName = msg.message.data.fileInfo.name + ' (' + formatFileSize(msg.message.data.fileInfo.size) + ')'
        requestShareText.innerHTML = currentLocale['L123'].replace('{0}', remoteName).replace(' {1} ', fileName)
        peerInfoMessage = msg.message.data


        sharePopup.classList.toggle('requestShareBox-show',true)
        countDown()
    }
}

/**
 * 处理quicall页面的remote answer sdp
 * @param msg
 */
function handleQuicallRemoteAnswerSdp(msg){
    if(!msg || !msg.data){
        return;
    }

    let content = msg.data
    let session = WebRTCSession.prototype.getSession({ key: 'lineId', value: content.localLineId })
    if(!session){
        log.warn("quicall remoteAnswerSdp: session is not found")
        return
    }
    if (msg.data.rspInfo){
        if(msg.data.rspInfo.rspCode === 200){
            console.log("handle remoteAnswerSdp")
            let sdp = content.sdp.data
            session.remoteLineId = content.remoteLineId
            if (sdp) {
                session.handleServerResponseSdp(sdp)
            } else {
                console.log('answer sdp is not offer now.')
            }
        }else{
            gsRTC.clearSession({lineId: content.localLineId})
            if(msg.data.rspInfo.rspCode === 300){
                switchSendStatus('reject')
            }else if(msg.data.rspInfo.rspCode === 480){
                switchSendStatus('offline')
            }else if(msg.data.rspInfo.rspCode === 486){
                switchSendStatus('timeout')
            }
        }
    } else {
        gsRTC.clearSession({lineId: content.localLineId})
        switchSendStatus('reject')
    }
}

/**
 * 设置webSocket连接状态
 * @param msg
 */
function setWebsocketStatus(msg){
    if(!msg || !msg.data){
        return;
    }

    console.log('websocket status:', msg.data)
    if(msg.data.code === 999){
        console.log("[EXT] webSocket success")
        if(msg.data.status === 1){
            setPopupTips("L46", true, "success-tips")
        }else {
            popupTip.classList.remove('popup-tips-opacity-1')
            popupTip.classList.add('popup-tips-opacity-0')
        }
    }else {
        if(msg.data.status === -1){
            console.log('websocket abnormal onclose, auto logout.')
            doLogout()
            setLoginTips('ERROR', 'L47')
        } else if(msg.data.status === 2){
            console.log('reconnecting...')
            setPopupTips("L143", false)
        }
    }
    grpClick2Talk.websocketStatus = msg.data.status // 保存webSocket连接状态
}

/**
 * 线路状态中共享图标是否高亮设置
 * @param msg
 */
function setSharingState(msg){
    if(!msg){
        return;
    }

    let shareState = msg?.shareState
    if(shareState){
        /**改变共享文件的样式**/
        if(msg.action && msg.content){
            changeShareBtnStyle(msg)
        }

        /**修改popup内容**/
        if(shareState === 'open'){
            if(msg.content && msg.content.isEstablishSuccessPc){
                iconStyleToggle(msg.content)
                currentShareContent = msg.content
                if(clickContent.shareType === 'shareScreen'){
                    currentShareContent.localShare = true
                }
            }
        }else if(shareState === 'close'){
            currentShareContent = null
        }
    }else{
        // 再次点击显示提示
        setPopupTips("L72", true)
    }
}

/**
 * In firefox, background pages do not support the use of alert(),confirm() or prompt()
 * @param msg
 */
function guideToEnableClickToDial(msg){
    console.info('Click-To-Dial Feature is not enabled')
    let serverURL = grpClick2Talk.loginData.url.split('/addon')[0] + '/phset/call/outgoing'
    // 非admin账号，需要引导用户使用admin账号登录普通Tab页并启用“Click-To-Dial Feature”功能
    let confirmTip = currentLocale['L1004'].replace('{0}', serverURL)
    if (confirm(confirmTip) === true) {
        window.open(serverURL, '_blank');
    } else {
        console.log('refuse enable "Click-To-Dial Feature".')
        confirm(currentLocale["L1003"])
    }
}

/**
 * 处理background.js 返回的结果
 */
function handleBackgroundMessage(msg) {
    if (!msg) {
        return
    }
    msg = JSON.parse(msg)

    console.log('handle background message cmd:', msg.cmd, '; data: ', msg.data)
    switch (msg.cmd) {
        case "popupShowConfig":
            console.log('set popup config of click2Talk ')
            grpClick2Talk = msg.grpClick2TalObj
            switchDisplayPage(grpClick2Talk.isLogin, grpClick2Talk.loginData)

            extensionNamespace.storage.local.get('phoneBooks', function (obj) {
                if (obj && obj['phoneBooks']) {
                    grpClick2Talk.phoneBooks = JSON.parse(obj['phoneBooks'])
                    console.log('[EXT] get phone book!', grpClick2Talk.phoneBooks)
                }
            });

            // 设置配置项默认值
            setConfigurationItems()
            break
        case 'loginStatus':  // 更新当前登录状态
            updateLoginStatus(msg)
            break
        case 'clickToDialDisabled':
            guideToEnableClickToDial(msg)
            break
        case 'updateAccountLists':
            if (msg.accountLists) { // 可用账号从有变无时需要更新页面显示
                grpClick2Talk.loginData.accountLists = msg.accountLists
                setDeviceAccountList(msg.accountLists)
            } else {
                console.log('[EXT] no account.')
            }
            break
        case 'setLineStatus':   // 显示线路信息
            if (msg.lines) {
                // 处理线路问题
                updateLineStatus(msg.lines)

                // 已知当前线路开启共享，接收到来电，提示信息：当前存在点对点共享桌面，点击接听后共享将被暂停
                callPrompt({from: 'call', role: 'callee'})
                saveRingLineData(msg)
            }
            if(msg.maxLinesNum){
                console.log('save max lines num ', msg.maxLinesNum)
                grpClick2Talk.maxLinesNum = msg.maxLinesNum
            }

            // 处理共享文件按钮样式
            updateIconStyle(msg.lines, msg.detectLine, msg.shareSessions)
            break
        case 'setMaxLinesNum':
            console.log('set max lines num: ', msg.maxLinesNum)
            grpClick2Talk.maxLinesNum = msg.maxLinesNum
            break
        case 'setMaxConfListsNum':
            console.log('set max conf lines num: ', msg.maxConfListsNum)
            grpClick2Talk.maxConfListsNum = msg.maxConfListsNum
            break
        case 'makeCallCallback':
            console.log('makeCallCallback msg:', msg)
            if(msg.data === 'Invalid Request' || (msg.data && msg.data.response === 'failed')){
                // Invalid Request case:1. 未开启拨打功能  2. 号码为空 3. 找不到可用账号进行呼叫 4. 键盘被锁
                setPopupTips("L1001", true)
            }else {
                if (msg.data.code === 2) {
                    setPopupTips("L119", true)
                } else if (msg.data.code === 8) {
                    setPopupTips("L139", true)
                }
            }
            break
        case 'isSharingTurnedOn':
            setSharingState(msg)
            break
        case 'websocketStatus':
            setWebsocketStatus(msg)
            break
        case 'shareScreenRequest':
            handleShareScreenRequest(msg)
            break
        case 'closeShareInformForPopup':
            if(sharePopup.classList.contains('requestShareBox-show')){
                mb.parentNode.removeChild(mb);
                sharePopup.classList.toggle('requestShareBox-show',false)
                countDown()
            }
            break
        case 'clearShareContentForPop':
            changeShareBtnStyle({ action: 'end', content: currentShareContent})
            currentShareContent = null
            clickContent.lineId = null
            clickContent.localLineId = null
            clickContent.shareType = null
            clickContent.localShare = false
            break
        case 'quicallRemoteAnswerSdp':
            handleQuicallRemoteAnswerSdp(msg)
            break
        case 'changeShareScreenIcon':
            if(msg?.data){
                changeShareBtnStyle( msg.data)
            }
            break
        case 'cancelRequest':
            countDownTimer && countDown()
            break
        case 'cancelRequestRet':
            let rspInfo = msg.data?.rspInfo
            if(rspInfo && rspInfo.rspCode === 200){
                gsRTC.clearSession({lineId: msg.data?.line})
            }else {
                console.log('cancel error')
                setPopupTips("L155", true)
            }
            closeFilePopup()
            break
        default:
            break
    }
}

/**
 * 更新共享文件样式
 * @param dataLines   所有线路信息
 * @param detectLine  探测线路信息
 * @param shareSessions  共享线路信息
 * **/
function updateIconStyle(dataLines=[], detectLine=[], shareSessions = []){
    if(!dataLines.length){
        console.log("updateIconStyle: invalid parameter ")
        return
    }

    let handleLineContent = function(data){
        if(!data || !data.lineId){
            console.log("handleLineContent: invalid parameter ")
            return
        }
        let mark
        let isExistPc = shareSessions.find((item)=> item.lineId === data.lineId && item.isEstablishSuccessPc)
        let action = !isExistPc ? data.action : 'start'

        if(action === 'start'){
            mark = true
        }else{
            mark = data.mark
        }
        changeShareBtnStyle({ action: action, lineId: data.lineId, state: data.state, mark: mark })
    }

    if(detectLine.length) {
        for (let item of detectLine) {
            for (let lines of dataLines) {
                if (lines.line === item.lineId) {
                    if ((item.state === 'connected' || item.state === 'onhold') && lines.state === 'onhold') {
                        handleLineContent({action: 'holdLine', lineId: lines.line, state: lines.state, mark: true})
                    } else if ((item.state === 'connected' || item.state === 'onhold') && lines.state === 'connected') {
                        handleLineContent({action: 'unHoldLine', lineId: lines.line, state: lines.state, mark: true})
                    }
                }
            }
        }
    }else{
        for(let lines of dataLines){
            if( lines.state === 'onhold'){
                handleLineContent({action: 'holdLine', lineId: lines.line, state: lines.state, mark: false})
            }else if(lines.state === 'connected'){
                handleLineContent({action: 'unHoldLine', lineId: lines.line, state: lines.state, mark: false})
            }
        }
    }
}

/**
 * 保存振铃线路信息
 * **/
function saveRingLineData(content={}){
    if(!content.lines){
        console.log("saveRingLineData: No route information obtained currently")
        return
    }
    let isCurrentLineExists
    for(let i in content.lines){
        let line = content.lines[i]
        if(line.state === 'ringing'){
            isCurrentLineExists = getLine(line)
            if(!isCurrentLineExists){
                ringLineData.push(line)
            }

        }else if(line.state === 'idle'){                 // 主要针对挂断时已经保存的振铃线路
            isCurrentLineExists = getLine(line, 'idle')
            if(isCurrentLineExists){
                ringLineData.splice(i,1)
            }
        }
    }
}

/**
 * 查找对应的线路
 * @param data: 线路内容
 * @param type: 线路类型,如振铃、或者空闲
 **/

function getLine(data,type){
    if(!data || !data.line){
        console.log('getLine: current line error')
        return
    }
    let target

    if(type === 'ringing'){
        target = ringLineData.find(item => item.line === data.line && item.remotenumber === data.remotenumber && item.state === type)
    }else if(type === 'idle'){
        target = ringLineData.find(item => item.line === data.line)
    }else{
        target = ringLineData.find(item => item.line === data.line && item.remotenumber === data.remotenumber)
    }
    return target
}

/**
 * 已知多线路共享，发起或者接受呼叫显示提示内容
 * @param content.from: call(来电)、shareScreen（共享）
 * @param content.role: caller(发起方)、 callee（接收方）
 * */
function callPrompt(content){
    console.log(" current get content:", content)
    if(currentShareContent && currentShareContent.isEstablishSuccessPc){
        /**1.添加蒙版样式  2.处理按钮文案  3.显示tips内容  4.默认隐藏注释内容**/
        let getRingLine = grpClick2Talk?.lineData.find(item => item.state === 'ringing')
        if(!getRingLine && content.role === 'callee'){
            console.log("Currently, the contents of the ringing line are not obtained")
            return
        }else{
            let isCurrentLineExists = getLine(getRingLine, 'ringing')
            if(isCurrentLineExists){
                console.log("Obtain current line already exists.")
                return
            }
        }


        let handleTipContent = function(data, lineContent){
            mb.classList.add('mb');
            document.body.appendChild(mb);

            refuseShareBtn.innerText = currentLocale['L60']
            refuseShareBtn.classList.toggle('requestShare-bottom-cancel', false)
            acceptShareBtn.innerText = currentLocale['L59']

            //为区分是来电还是共享，在div中添加属性进行辨别 type: call(来电)、 shareScreen（共享）
            refuseShareBtn.setAttribute("type", data.from)
            acceptShareBtn.setAttribute("type", data.from)
            refuseShareBtn.setAttribute("role", data.role)
            acceptShareBtn.setAttribute("role", data.role)

            if(data.role === 'callee'){
                refuseShareBtn.setAttribute("line", lineContent.line)
                acceptShareBtn.setAttribute("line", lineContent.line)
            }

            //提示内容
            if(data.role === 'caller'){
                requestShareText.innerHTML = currentLocale['L141']
            }else if(data.role === 'callee'){
                requestShareText.innerHTML = currentLocale['L142']
            }

            //默认隐藏注释内容
            requestShareTipsWrapper.classList.toggle('requestShare-tips-wrapper-show', false)
            // 显示整个弹框
            sharePopup.classList.toggle('requestShareBox-show',true)
        }

        if(content.from === 'call'){
            if(content.role === 'caller'){         // 呼叫方
                handleTipContent(content)
            }else if(content.role === 'callee' && getRingLine){       // 接收方
                handleTipContent(content, getRingLine)
            }
        }
    }
}

/**
 * 删除标签属性*
 * */
function deleteAttrubite(){
    refuseShareBtn.removeAttribute('type')
    refuseShareBtn.removeAttribute('role')
    refuseShareBtn.removeAttribute('line')

    acceptShareBtn.removeAttribute('type')
    acceptShareBtn.removeAttribute('role')
    acceptShareBtn.removeAttribute('line')
}

/**
 * 针对线路处理共享文件按钮样式
 * @param data.action
 * @param data.lineId
 * @param data.state
 * @param data.mark
 * **/
function changeShareBtnStyle(data){
    console.log("changeShareBtnStyle: current state is ", data)
    let line = data.content?.lineId || data?.content?.remoteCallInfo?.line || data.lineId
    if(!line || !data.state || !grpClick2Talk.lineData) return

    let matchElement = function(param, type){
        let grpFunBtn = document.getElementsByTagName("grp-fun-button")
        if(grpFunBtn.length){
            for(let element of grpFunBtn){
                if(element.getAttribute("type") === type && element.line === param.line){
                    return element
                }
            }
        }
        return null
    }

    /**1.单线路情况下，针对当前线路的共享按钮做处理  2.多线路情况下，针对存在共享其他线路的共享按钮作处理**/
    for(let item of grpClick2Talk.lineData){
        // 1.单线路情况下：针对当前线路的共享按钮做处理
        if(item.line === line){
            // 匹配获取线路icon
            let shareEle = matchElement({line: item.line}, 'share')
            let fileEle = matchElement({line: item.line}, 'file')
            let contactsEle = matchElement({line: item.line}, 'contacts')
            let shareFirstNode = shareEle?.firstChild
            let fileFirstNode = fileEle?.firstChild
            let contactsFirstNode = contactsEle?.firstChild

            if(!shareFirstNode || !fileFirstNode){
                continue
            }
            changeBtnStyle({
                action: data.action,
                state: data.state,
                mark: data.mark,
                shareEle: shareEle,
                fileEle: fileEle,
                contactsEle: contactsEle,
                shareFirstNode: shareFirstNode,
                fileFirstNode: fileFirstNode,
                contactsFirstNode: contactsFirstNode
            })
        }
    }
}

/** 更改共享文件按钮样式 (页面默认都是禁用且icon是置灰的，只有对端回复成功才会解除对应的线路样式)
 *@param msg.action： start、end、recovery、holdLine、 unHoldLine
 *@param msg.mark   是否标记解除
 *@param msg.state  当前线路的状态
 *@param msg?.shareEle
 *@param msg?.shareFirstNode
 * */
function changeBtnStyle(msg){
    console.log("changeBtnStyle:", msg)
    if(!msg || !msg.action){
        console.log("changeStyle: current invalid parameter ")
        return
    }
    // 匹配获取线路icon
    let shareEle = msg?.shareEle
    let fileEle = msg?.fileEle
    let contactsEle = msg?.contactsEle
    let shareFirstNode = msg?.shareFirstNode
    let fileFirstNode = msg?.fileFirstNode
    let contactsFirstNode = msg?.contactsFirstNode

    let aboutShareStyle = function(value){
        if(shareEle.isSharing || value === 'green'){
            shareFirstNode.classList.remove('GRP-icon-share-ash')
            shareFirstNode.classList.remove('GRP-icon-share-black')

            if(!shareFirstNode.classList.contains('GRP-icon-share-green')){
                shareFirstNode.classList.add('GRP-icon-share-green')
            }
        }else{
            shareFirstNode.classList.remove('GRP-icon-share-ash')
            shareFirstNode.classList.remove('GRP-icon-share-green')

            if(!shareFirstNode.classList.contains('GRP-icon-share-black')){
                shareFirstNode.classList.add('GRP-icon-share-black')
            }
        }
    }

    if(msg.mark){
        /** 解除置灰样式和鼠标样式 **/

        // 针对共享桌面按钮
        shareEle.removeAttribute('title')
        shareEle.setAttribute("disabled", 'false')                                   // 取消不可点击按钮
        aboutShareStyle()

        if(!shareFirstNode.classList.contains("changeStyle")){
            shareFirstNode.classList.add("changeStyle")                              // 设置鼠标样式
        }

        // 针对共享文件按钮
        fileEle.removeAttribute('title')
        fileEle.setAttribute("disabled", 'false')                                     // 取消不可点击按钮

        fileFirstNode.classList.remove('GRP-icon-file-ash')
        if(!fileFirstNode.classList.contains('GRP-icon-file-black')){
            fileFirstNode.classList.add('GRP-icon-file-black')
        }
        if(!fileFirstNode.classList.contains("changeStyle")){
            fileFirstNode.classList.add("changeStyle")                                // 设置鼠标样式
        }

        // 针对contactsIcon
        contactsEle.removeAttribute('title')
        contactsEle.setAttribute("disabled", 'false')                                 // 取消不可点击按钮
        contactsFirstNode.classList.remove('GRP-icon-contacts-ash')
        if(!contactsFirstNode.classList.contains('GRP-icon-contacts-black')){
            contactsFirstNode.classList.add('GRP-icon-contacts-black')
        }
        if(!contactsFirstNode.classList.contains("changeStyle")){
            contactsFirstNode.classList.add("changeStyle")                            // 设置鼠标样式
        }
    }


    switch(msg.action){
        case 'start':
            // 当前表示开启共享 改变icon样式 shareIcon 设置为 green

            //改变属性
            shareEle.removeAttribute('title')                                        // 移除title
            shareEle.setAttribute("isSharing", true)
            shareFirstNode.classList.remove("changeStyle")                    // 设置鼠标样式

            if(msg.state === 'onhold'){
                shareEle.setAttribute("disabled", 'true')                            // 设置不可点击按钮
            }else{
                shareEle.setAttribute("disabled", 'false')                           // 取消不可点击按钮
            }

            aboutShareStyle()
            break;
        case 'end':
            // 当前表示关闭共享 改变icon样式 shareIcon 设置为 black

            //改变属性
            shareEle.setAttribute("isSharing", false)
            shareEle.setAttribute("disabled", 'false')                                 // 取消不可点击按钮
            shareEle.removeAttribute('title')                                          // 移除title
            if(msg.state === 'onhold'){                                                // 设置鼠标样式
                shareFirstNode.classList.remove("changeStyle")
            }else{
                if(!shareFirstNode.classList.contains("changeStyle")){
                    shareFirstNode.classList.add("changeStyle")
                }
            }
            aboutShareStyle()
            break;
        case 'recovery':
            // 当前表示 对端建立webSocket 需要恢复为black 或者 yellow
            if(shareEle.isSharing){  // 表示当前在共享
                shareEle.setAttribute("disabled", 'false')                                      // 设置不可点击按钮
                if(msg.state !== 'onhold'){
                    shareFirstNode.classList.remove("changeStyle")                       // 设置鼠标样式
                }
            }else{
                shareEle.setAttribute("disabled", 'false')                                      // 设置不可点击按钮
                if(msg.state === 'onhold'){                                                     // 设置鼠标样式
                    shareFirstNode.classList.remove("changeStyle")
                }else{
                    if(!shareFirstNode.classList.contains("changeStyle")){
                        shareFirstNode.classList.add("changeStyle")
                    }
                }
            }

            // 针对shareIcon
            shareEle.removeAttribute('title')                                                   // 移除title
            aboutShareStyle()
            break;
        case 'holdLine':
            if(msg.state === 'onhold'){                                                // 设置鼠标样式
                shareFirstNode.classList.remove("changeStyle")
            }else{
                if(!shareFirstNode.classList.contains("changeStyle")){
                    shareFirstNode.classList.add("changeStyle")
                }
            }

            if(msg.mark){
                shareEle.setAttribute("disabled", 'true')                                      // 设置不可点击按钮
                aboutShareStyle()
            }
            break;
        case 'unHoldLine':
            if(msg.state === 'onhold' || shareEle.isSharing){                                                        // 设置鼠标样式
                shareFirstNode.classList.remove("changeStyle")
            }else{
                if(!shareFirstNode.classList.contains("changeStyle")){
                    shareFirstNode.classList.add("changeStyle")
                }
            }

            if(msg.mark){
                shareEle.setAttribute("disabled", 'false')                                      // 设置可点击按钮
                aboutShareStyle()
            }
            break;
        default:
            console.log(" current state is ", msg.state)
            break;
    }
}

window.handleBackgroundMessage = handleBackgroundMessage

/**样式切换
 * **/
function iconStyleToggle(data){
    console.log("iconStyleToggle data: "+ JSON.stringify(data, null, '    '))
    let lineId = data.lineId
    let type = data.shareType
    let value
    if(data.value === 'false'){
        value = 'false'
    }else{
        value = 'true'
    }

    let dom = document.querySelectorAll('grp-fun-button')   // 获取页面上的grp-button 组件
    let getDom

    for(let i in dom){                           // 获取当前线路的dom
        if(dom[i].line === lineId){
            getDom = dom[i]
        }
    }

    switch(type){
        case 'shareScreen':        // 共享按钮
            if(getDom.type === 'share'){
                getDom.setAttribute('issharing', value)
            }

            break
    }
}

/*****************************************************************************************************************/
/**
 * 发送消息
 * @param message
 */
function popupSendMessage2Background(message) {
    if (!message) {
        return
    }

    message.requestType = 'popupMessage2Background'
    try{
        popupPort.postMessage(message)
    }catch(e){
        console.log(e)
        popupPort = extensionNamespace.runtime.connect({ name: 'popup' })
        // 监听连接断开事件
        popupPort.onDisconnect.addListener(function() {
            console.log("Connection is disconnected, close Popup page");
            window.close();
        })
        popupPort.onMessage.addListener(handleBackgroundMessage)
        popupPort.postMessage(message)
    }
}

/**
 * 拨号框自动填充号码
 */
function autoFillNumber(callInfo, isShake) {
    if (!grpClick2Talk || !grpClick2Talk.isLogin) {
        console.log('Not currently logged in~')
        return
    }

    let setInfo = function () {
        if(isShake){
            phoneNumber.classList.add('number-input-shake')
            setTimeout(function(){
                if(phoneNumber.classList.value.includes('number-input-shake')){
                    phoneNumber.classList.remove('number-input-shake')
                }
            },3000)
        }
        phoneNumber.value = callInfo.number
        searchForContacts()
        extensionNamespace.storage.local.remove(key)
    }

    let key = 'temporaryCallInfo'
    if (callInfo && callInfo.number) {
        console.log('auto fill number in input with ', callInfo.number)
        setInfo()
    } else {
        extensionNamespace.storage.local.get(key, function (obj) {
            if (obj[key]) {
                callInfo = obj[key]
                setInfo()
            }
        })
    }
}

if (window.chrome && window.chrome.runtime && window.chrome.runtime.connect) {  // chrome
    extensionNamespace = chrome
    popupPort = window.chrome.runtime.connect({ name: 'popup' })
} else if (window.browser && window.browser.runtime && window.browser.runtime.connect) {  // firefox
    extensionNamespace = browser
    // https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onConnect
    popupPort = window.browser.runtime.connect({ name: 'popup' });
}
// 监听连接断开事件
if(popupPort){
    popupPort.onDisconnect.addListener(function() {
        console.log("Connection is disconnected, close Popup page");
        window.close();
    })
}

// 监听 storage 变化
extensionNamespace.storage.onChanged.addListener(function (changes, namespace) {
    for (let key in changes) {
        if (key === 'temporaryCallInfo' && changes[key].newValue) {
            // 自动填充号码
            let storageChange = changes[key];
            console.log('Storage key "%s" in namespace "%s" changed. ',
                + 'Old value was "%s", new value is "%s".',
                key,
                namespace,
                storageChange.oldValue,
                storageChange.newValue
            );

            autoFillNumber(storageChange.newValue, true)
        }
    }
})

window.onload = function () {
    console.log('window onload')
    if (popupPort) {
        /**
         * Listen for messages from the backgroundJS.
         */
        popupPort.onMessage.addListener(handleBackgroundMessage)

        // 插件加载
        setDomBindingEvent()

        /**
         * 1.发送消息给backgroundJs，获取用户配置信息
         */
        popupSendMessage2Background({
            cmd: 'popupOnOpen',
            screen: {
                height: window.screen.height,
                width: window.screen.width
            },
            language: window.currentLocale
        })
    }
    gsRTC.on('quicallLocalSDPCompleted', function (message, localShare) {
        console.log('on quicall local sdp completed.')
        if (localShare) {
            popupSendMessage2Background({ cmd: 'quicallLocalOfferSdp', data: JSON.stringify(message) })
        } else {
            popupSendMessage2Background({ cmd: 'quicallLocalAnswerSdp', data: JSON.stringify(message) })
        }
    })

    gsRTC.on('quicallFileConfirmPopup', function (data) {
        console.log('on quicall local sdp completed.')
        mb.classList.add('mb');
        document.body.appendChild(mb);
        refuseShareBtn.innerText = currentLocale['L83']
        refuseShareBtn.classList.toggle('requestShare-bottom-cancel', false)
        acceptShareBtn.innerText = currentLocale['L84']
        let remoteName
        for(let i in grpClick2Talk.lineData){
            if(grpClick2Talk.lineData[i].state !== 'idle' && grpClick2Talk.lineData[i].line == data.lineId){
                remoteName = grpClick2Talk.lineData[i].remotename || grpClick2Talk.lineData[i].remotenumber
            }
        }
        let fileName = data.fileName + ' (' + formatFileSize(data.fileSize) + ')'
        requestShareText.innerHTML = currentLocale['L123'].replace('{0}', remoteName).replace('{1}', fileName)
        sharePopup.classList.toggle('requestShareBox-show',true)
        countDown()
    })
    // 恢复初始窗口高度
    window.resizeTo(window.outerWidth, initOuterHeight)
}

/**
 * 监听窗口大小变化
 */
window.addEventListener('resize', handleWindowResize)

/**
 * 监听回车事件
 * @param event_e
 */
document.onkeydown = function (event_e) {
    if (window.event) {
        event_e = window.event;
    }
    let int_keycode = event_e.charCode || event_e.keyCode;
    if (int_keycode === 13) {
        if (grpClick2Talk) {
            if (!grpClick2Talk.isLogin) {
                login()
            } else {
                console.log('[EXT] already login...')
            }
        } else {
            console.log('[EXT] grpClick2Talk {}')
        }
    }
}

/**
 * 判断当前元素的父元素
 * @param event
 * @param parent
 * @returns {boolean}
 */
function parentElementCompare(event, parent) {
    if (!event || !parent) {
        return false
    }

    if (event.parentElement) {
        if (event.parentElement === parent) {
            return true
        } else {
            return parentElementCompare(event.parentElement, parent)
        }
    }
}

/**
 * JS 点击某元素以外的地方触发事件
 * @param e
 */
document.addEventListener('click', (e) => {
    e = e || window.event;

    // 收起账号列表
    if ((e.path && !e.path.includes(deviceArea)) || (e.target !== deviceArea && !parentElementCompare(e.target, deviceArea))) {
        // 收起账号列表
        deviceAccounts.style.display = 'none'
        accountArrowSwitch.classList.remove('GRP-icon-arrow_up')
        accountArrowSwitch.classList.add('GRP-icon-arrow_down')
    }
    // 收起设置菜单
    if ((e.path && !e.path.includes(settingNav) && !e.path.includes(settingNavList))
        || (e.target !== settingNav && !parentElementCompare(e.target, settingNav) && e.target !== settingNavList && !parentElementCompare(e.target, settingNavList))) {
        // 收起账号列表
        settingNavList.style.display = 'none'
    }

    let phoneNumberInputArea = document.getElementsByClassName('phoneNumber-input')[0]
    if ((e.path && !e.path.includes(phoneNumberInputArea)) || (e.target !== phoneNumberInputArea && !parentElementCompare(e.target, phoneNumberInputArea))) {
        // 点击input以外的地方，号码输入框失去焦点
        phoneNumber.blur()
    }
    if ((e.path && !e.path.includes(searchResult)) || (e.target !== searchResult && !parentElementCompare(e.target, searchResult))) {
        // 隐藏搜索列表
        searchResult.style.display = 'none'
    }
})

/** 弹框倒计时
 * */
function countDown(lineId, countDownNum = 40){
    countDownNumText = document.getElementsByClassName('countDown_num')[0]
    let countDownCallback = function(){
        if(countDownTimer){
            clearInterval(countDownTimer)
            countDownTimer = null
        }
        countDownNumber = countDownNum
        sharePopup.classList.toggle('requestShareBox-show',false)
        mb.parentNode.removeChild(mb);
    }
    if(!countDownTimer){
        countDownTimer = setInterval (function () {
            countDownNum--
            countDownNumText.innerHTML = `(${countDownNum}s)`
            if(countDownNum <= 0){
                console.log(" end of countDown")
                countDownCallback()
                if(peerInfoMessage){
                    // 共享文件响应超时
                    console.log('Shared file response timeout')
                    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: peerInfoMessage.localLineId})
                    if(!session){
                        popupSendMessage2Background({
                            cmd: 'sharePopupTimeOut',
                            message:{
                                lineId: peerInfoMessage.localLineId,
                                reqId: peerInfoMessage.reqId,
                                action: peerInfoMessage.action,
                                shareType: peerInfoMessage.shareType
                            }
                        })
                    }else {
                        session.sendMessageByDataChannel({lineId: peerInfoMessage.localLineId, type: 'fileInfo', state: 'timeout'})
                    }
                }else{
                    // 共享屏幕响应超时
                    console.log('Shared screen response timeout')
                    popupSendMessage2Background({ cmd: 'sharePopupTimeOut', message:{ lineId: lineId, shareType: 'shareScreen'}})
                }
            }
        }, 1000);
    }else{
        countDownCallback()
    }
}

/**
 * 处理点击事件
 * @param event
 */
function handleClickEvent(event){
    if (!event || !event.target) {
        return
    }
    let target = event.target
    let value = target.textContent
    let type = target.getAttribute("type")          // 类型： call（来电）、shareScreen（共享）
    let role = target.getAttribute("role")          // 角色： caller（发起方）、 receive（接收方）
    let line = target.getAttribute("line")

    switch(value){
        case currentLocale['L84']:                  // 接受共享或共享文件
            console.log('Accept sharing')
            countDown(line)
            if(remoteShareInfo.shareType === 'shareFile'){
                let session = WebRTCSession.prototype.getSession({key: 'lineId', value: remoteShareInfo.lineId})
                if(session && session.pc && session.pc.dataChannel && session.pc.dataChannel.readyState === 'open'){
                    console.log('Accept sharing file')
                    // （2）popup页面二次接收共享
                    session.sendMessageByDataChannel({lineId: remoteShareInfo.lineId, type: 'fileInfo', state: 'receive'})
                }else {
                    // （1）popup页面首次收到共享请求
                    let content = peerInfoMessage
                    let lineId = content.localLineId
                    let param = {
                        sdp: content.sdp.data,
                        lineId: lineId,
                        remoteLineId: content.remoteLineId,
                        reqId: content.reqId,
                        shareType: content.shareType,
                        action: content.action
                    }
                    gsRTC.acceptShareFile(param)
                }
            }else {
                popupSendMessage2Background({cmd: 'isReceiveScreen', message: { isReceive: true, lineId: line, shareType: 'shareScreen' } })

                deleteAttrubite()                   // 删除标签属性
            }
            break
        case currentLocale['L83']:                 // 拒绝共享或共享文件
            console.log('Deny sharing')
            countDown(line)
            if(peerInfoMessage){
                // 拒绝共享文件
                console.log('Deny sharing files')
                let session = WebRTCSession.prototype.getSession({key: 'lineId', value: peerInfoMessage.localLineId})
                if(session && session.pc && session.pc.dataChannel && session.pc.dataChannel.readyState === 'open'){
                    console.log('Accept sharing file')
                    session.sendMessageByDataChannel({lineId: peerInfoMessage.localLineId, type: 'fileInfo', state: 'reject'})
                }else {
                    popupSendMessage2Background({
                        cmd: 'isReceiveScreen',
                        message:{
                            isReceive: false,
                            lineId: peerInfoMessage.localLineId,
                            reqId: peerInfoMessage.reqId,
                            action: peerInfoMessage.action,
                            shareType: peerInfoMessage.shareType
                        }
                    })
                }
            }else {
                // 拒绝共享屏幕
                console.log('Reject screen sharing')
                popupSendMessage2Background({cmd: 'isReceiveScreen', message: { isReceive: false, lineId: line, shareType: 'shareScreen' } })
                deleteAttrubite()                   // 删除标签属性
            }
            break
        case currentLocale['L59']:                  // 确定发起新的共享
            console.log("Confirm  open new line:",line)
            // 首先判断是来电还是共享
            if(type === 'call'){
                if(role === 'caller'){
                    call()
                }else if(role === 'callee' && line){
                    // 表示接受来电
                    console.log("receive caller")
                    popupSendMessage2Background({cmd: 'popupAcceptLine', lineId: line})
                }
            }else if(type === 'shareScreen'){
                // 确定开启新共享，关闭之前的pc
                popupSendMessage2Background({cmd: 'localShareScreenRequest', data: clickContent })
            }

            //取消蒙版
            if(sharePopup.classList.contains('requestShareBox-show')){
                mb.parentNode.removeChild(mb);
                sharePopup.classList.toggle('requestShareBox-show',false)
            }

            //删除标签属性
            deleteAttrubite()
            break
        case currentLocale['L60']:                 // 取消发起新共享
            console.log("cancel line：", line)

            // 首先判断是来电还是共享
            if(type === 'call'){
                if(role === 'caller'){
                    // 不做任何处理
                }else if(role === 'callee' && line){
                    // 表示拒绝来电
                    console.log("refuse caller")
                    popupSendMessage2Background({
                        cmd: 'popupRejectLine',
                        lineId: line
                    })
                }
            }else if(type === 'shareScreen'){
                // 暂时不做任何处理
            }
            //取消蒙版
            if(sharePopup.classList.contains('requestShareBox-show')){
                mb.parentNode.removeChild(mb);
                sharePopup.classList.toggle('requestShareBox-show',false)
            }

            //删除标签属性
            deleteAttrubite()
            break;
        default:
            console.log("value:",value)
            break
    }
}

/**
 * 解析浏览器UA信息
 * @returns {{}}
 */
function getBrowserDetail() {
    function extractVersion(uastring, expr, pos) {
        let match = uastring.match(expr)
        return match && match.length >= pos && parseInt(match[pos], 10)
    }

    // Returned result object.
    var result = {}
    result.browser = null
    result.version = null
    result.UIVersion = null
    result.chromeVersion = null
    result.systemFriendlyName = null

    if (navigator.userAgent.match(/Windows/)) {
        result.systemFriendlyName = 'windows'
    } else if (navigator.userAgent.match(/Mac/)) {
        result.systemFriendlyName = 'mac'
    } else if (navigator.userAgent.match(/Linux/)) {
        result.systemFriendlyName = 'linux'
    }

    // Fail early if it's not a browser
    if (typeof window === 'undefined' || !window.navigator) {
        result.browser = 'Not a browser.'
        return result
    }

    // Edge.
    if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
        result.browser = 'edge'
        result.version = extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2)
        result.UIVersion = navigator.userAgent.match(/Edge\/([\d.]+)/)[1] // Edge/16.17017
    } else if (!navigator.mediaDevices && (!!window.ActiveXObject || 'ActiveXObject' in window || navigator.userAgent.match(/MSIE (\d+)/) || navigator.userAgent.match(/rv:(\d+)/))) {
        // IE
        result.browser = 'ie'
        if (navigator.userAgent.match(/MSIE (\d+)/)) {
            result.version = extractVersion(navigator.userAgent, /MSIE (\d+).(\d+)/, 1)
            result.UIVersion = navigator.userAgent.match(/MSIE ([\d.]+)/)[1] // MSIE 10.6
        } else if (navigator.userAgent.match(/rv:(\d+)/)) {
            /* For IE 11 */
            result.version = extractVersion(navigator.userAgent, /rv:(\d+).(\d+)/, 1)
            result.UIVersion = navigator.userAgent.match(/rv:([\d.]+)/)[1] // rv:11.0
        }

        // Firefox.
    } else if (navigator.mozGetUserMedia) {
        result.browser = 'firefox'
        result.version = extractVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1)
        result.UIVersion = navigator.userAgent.match(/Firefox\/([\d.]+)/)[1] // Firefox/56.0

        // all webkit-based browsers
    } else if (navigator.webkitGetUserMedia && window.webkitRTCPeerConnection) {
        // Chrome, Chromium, Webview, Opera, Vivaldi all use the chrome shim for now
        var isOpera = !!navigator.userAgent.match(/(OPR|Opera).([\d.]+)/)
        // var isVivaldi = navigator.userAgent.match(/(Vivaldi).([\d.]+)/) ? true : false;
        if (isOpera) {
            result.browser = 'opera'
            result.version = extractVersion(navigator.userAgent, /O(PR|pera)\/(\d+)\./, 2)
            result.UIVersion = navigator.userAgent.match(/O(PR|pera)\/([\d.]+)/)[2] // OPR/48.0.2685.39
            if (navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2]) {
                result.chromeVersion = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
            }
        } else {
            result.browser = 'chrome'
            result.version = extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)
            result.UIVersion = navigator.userAgent.match(/Chrom(e|ium)\/([\d.]+)/)[2] // Chrome/61.0.3163.100
        }
    } else if ((!navigator.webkitGetUserMedia && navigator.userAgent.match(/AppleWebKit\/([0-9]+)\./)) || (navigator.webkitGetUserMedia && !navigator.webkitRTCPeerConnection)) {
        if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
            result.browser = 'safari'
            result.version = extractVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1)
            result.UIVersion = navigator.userAgent.match(/Version\/([\d.]+)/)[1] // Version/11.0.1
        } else { // unknown webkit-based browser.
            result.browser = 'Unsupported webkit-based browser ' + 'with GUM support but no WebRTC support.'
            return result
        }
        // Default fallthrough: not supported.
    } else {
        result.browser = 'Not a supported browser.'
        return result
    }

    return result
}

/**
 * 监听页面隐藏和显示事件
 */
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") {
    // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}
document.addEventListener(visibilityChange, function (){
    if (document.hidden){
        if(getBrowserDetail().browser === 'safari'){
            // TODO: Safari popup页面打开一段时间后Service Worker 脚本会失效。需重新加载插件才能使用。为避免该问题，页面最小化时直接关闭popup页面
            console.log('document hidden')
            window.close()
        }
    }
}, false);
