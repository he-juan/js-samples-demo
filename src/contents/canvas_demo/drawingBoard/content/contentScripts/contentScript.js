
let gsContentScript = {
    language: '',
    extensionNamespace: '',
    dialplanregulars: [],
    tipCount: 0,
    panel: document.createElement('div'),
    addGRPElement: '',         //  获取panel 元素
    isHiddenElement: false,
    contactSearchFrom: { // 通讯录搜索来源
        ldap: true,
        localAddressBook: true
    },
    wordDialingEnabled: true,   // 划词拨号

    /**
     * 设置当前命名空间
     */
    init: async function () {
        console.log('namespace init')
        let nameSpace
        try {
            if (chrome && chrome.runtime) {
                nameSpace = chrome
                console.log('get extension namespace, ', chrome)
            }
        } catch (e) {
            if (browser && browser.runtime) {
                nameSpace = browser
                console.log('get extension namespace, ', browser)
            }
        }

        if (nameSpace && nameSpace.runtime && nameSpace.runtime.onMessage) {
            console.log('set runtime onMessage listener')
            await nameSpace.runtime.onMessage.addListener(this.runtimeOnMessageListener)
        }
        this.extensionNamespace = nameSpace

        // 获取通讯录
        await this.extensionNamespace.storage.local.get('phoneBooks', function (obj) {
            if (obj && obj['phoneBooks']) {
                gsContentScript.phoneBooks = JSON.parse(obj['phoneBooks'])
            }
            console.log('gsContentScript.phoneBooks:', gsContentScript.phoneBooks)
        });

        await this.extensionNamespace.storage.local.get('dialplanregulars', function (obj) {
            if (obj && obj['dialplanregulars']) {
                let dialplanregulars = obj['dialplanregulars']
                for (let i = 0; i < dialplanregulars.length; i++) {
                    let pattern = dialplanregulars[i].pattern
                    if (pattern) {
                        pattern = pattern.replace(/\$$/g, '')   // 去除结尾的结束符
                        gsContentScript.dialplanregulars[i] = {
                            pattern: new RegExp(pattern, 'g'),
                            block: dialplanregulars[i].block
                        }
                    }
                }
                console.log('get dial plan regular:', gsContentScript.dialplanregulars)
            }
        });

        // 获取账号信息
        await this.extensionNamespace.storage.local.get('updateAccountLists', function (obj) {
            gsContentScript.accountLists = obj.updateAccountLists
            console.log('gsContentScript.accountLists:', gsContentScript.accountLists)
        });


        // 监听事件，实时更新内容
        this.extensionNamespace.storage.onChanged.addListener(function (changes) {
            for (let key in changes) {
                if (key === 'phoneBooks' && changes[key].newValue) {
                    gsContentScript.phoneBooks = JSON.parse(changes[key].newValue)
                }
                if(key === 'language' && changes[key].newValue){
                    gsContentScript.language = changes[key].newValue
                }

                if(key === 'updateAccountLists' && changes[key].newValue){
                    gsContentScript.accountLists = changes[key].newValue
                    gsContentScript.handlePhoneNumber()
                }
            }
        })

        //获取当前语言
        await this.extensionNamespace.storage.local.get('language', function (obj) {
            gsContentScript.language = obj.language
            console.log('gsContentScript.language:', gsContentScript.language)
        });
    },

    /**
     * GRP dial plan 规则
     */
    grpDialPlan: function (str) {
        let result
        for (const item of this.dialplanregulars) {
            result = str.match(item.pattern)
            if (result && !item.block) {
                break
            }
        }
        return result
    },

    /**************************************************************************************************************/
    /**********************************************和背景页间的消息通信**********************************************/
    /**************************************************************************************************************/
    /**
     * send message to background
     * @param message
     * @param callback
     */
    sendMessageToBackgroundJS: function (message, callback) {
        if (this.extensionNamespace.runtime && this.extensionNamespace.runtime.sendMessage) {
            try {
                message.requestType = 'contentMessage2Background'
                this.extensionNamespace.runtime.sendMessage(message, function (response) {
                    if (callback) {
                        callback(response)
                    }
                });
            } catch (e) {
                // 当在扩展管理中心刷新或更新了扩展后切换到浏览器某标签页的页面中直接使用该扩展时，扩展存在报错"Extension context invalidated"
            }
        } else {
            console.log('sendMessage to Background runtime not found')
        }
    },

    /**
     * Listen for messages from the background script.
     */
    runtimeOnMessageListener: function (request, sender, sendResponse) {
        if (request && request.requestType === 'backgroundMessage2ContentScript') {
            switch (request.cmd) {
                case "pageReload":
                    console.log('[EXT] Reload the page after authorization')
                    if (confirm('Reload the page after authorization is complete.') === true) {
                        window.location.reload(true)
                    }
                    break
                default:
                    break
            }
        }
        sendResponse('request success');
    },

    /*********************************** 网页拨号*************************************************/
    /** 防止节流
     * **/
    throttle(func, wait) {
        var previous = 0;
        return function() {
            let now = Date.now();
            let context = this;
            let args = arguments;
            if (now - previous > wait) {
                func.apply(context, args);
                previous = now;
            }
        }
    },

    isEmptyStr(s) {
        if (s == undefined || s == null || s == '') {
            return true
        }
        return false
    },

    isChinese: function (data){
        if(!data){
            return  false
        }
        var reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
        if (reg.test(data)) {
            // 包括汉字
            return true;
        } else {
            // 没有汉字
            return false;
        }
    },

    /** 简单消息通知
     * **/
    tip:function(info) {
        info = info || '';
        let  ele = document.createElement('div');
        ele.className = 'chrome-plugin-simple-tip slideInLeft';
        ele.style.top = this.tipCount * 70 + 20 + 'px';
        ele.innerHTML = `<div>${info}</div>`;
        document.body.appendChild(ele);
        ele.classList.add('animated');
        this.tipCount++;
        setTimeout(() => {
            ele.style.top = '-100px';
            setTimeout(() => {
                ele.remove();
                this.tipCount--;
            }, 1000);
        }, 1000);
    },

    /*** 通过模糊匹配获取内容
     **/
    getContentForFuzzyMatch: function(searchContent){
        if (!searchContent) {
            console.log('[EXT] searchContent parameter MUST offer!')
            return ''
        }
        let getContentArray = []
        let index = 0
        let phoneIndex = 0
        let phoneBooks = this.phoneBooks
        if(phoneBooks){
            if(gsContentScript.contactSearchFrom.ldap && phoneBooks.ldap){
                for (let i = 0; i < phoneBooks.ldap.length; i++) {
                    let user = phoneBooks.ldap[i]
                    let callerIDName = user?.CallerIDName
                    let isExistChinese = this.isChinese(callerIDName)
                    if(isExistChinese){
                        // TODO: CallerIDName 存在 “王无名” 和 “无名 王” 两种格式
                        callerIDName = callerIDName?.split(' ').reverse().join("").replace(/[ ]/g,"")
                    }
                    let emailPrefix = user?.email?.split('@')[0]
                    if (user?.AccountNumber?.includes(searchContent) || callerIDName?.includes(searchContent) ||
                        emailPrefix === searchContent || user?.email === searchContent
                    ){
                        let phoneNumber = []
                        if(!phoneNumber[phoneIndex]){
                            phoneNumber[phoneIndex] = {}
                        }
                        if(user?.AccountNumber){
                            phoneNumber[phoneIndex].accountNumber = user?.AccountNumber
                        }
                        if(user?.HomeNumber ){
                            phoneNumber[phoneIndex].homeNumber = user?.HomeNumber
                        }
                        if(user?.MobileNumber ){
                            phoneNumber[phoneIndex].mobileNumber = user?.MobileNumber
                        }

                        getContentArray[index] = {}
                        getContentArray[index].from = 'ldap'
                        getContentArray[index].phoneNumber = phoneNumber

                        if(user?.CallerIDName){
                            getContentArray[index].name = user?.CallerIDName
                        }

                        if(user?.email){
                            getContentArray[index].email = user?.email
                        }
                        index++
                    }
                }
            }

            // 然后再查询本地通讯录、通讯录组
            if(gsContentScript.contactSearchFrom.localAddressBook && phoneBooks.localAddressBook) {
                let localAddressBook = phoneBooks.localAddressBook
                for (let j = 0; j < localAddressBook.length; j++) {
                    let accountInfo = localAddressBook[j]
                    let phone = accountInfo?.Phone
                    let emailPrefix = accountInfo?.email?.split('@')[0]
                    let firstLastName, lastFirstName;
                    if(accountInfo.FirstName && accountInfo.LastName){
                        firstLastName = accountInfo.FirstName + accountInfo.LastName
                        lastFirstName = accountInfo.LastName + accountInfo.FirstName
                    }else if(accountInfo.FirstName){
                        firstLastName = accountInfo.FirstName
                    }else if(accountInfo.LastName){
                        lastFirstName = accountInfo.LastName
                    }

                    if (firstLastName?.includes(searchContent) || lastFirstName?.includes(searchContent) ||
                        emailPrefix === searchContent || accountInfo?.email === searchContent) {
                        let phoneNumber = []
                        getContentArray[index] = {}
                        if (phone) {
                            if(Object.prototype.toString.call(phone) === '[object Array]'){
                                phoneNumber = phone
                            }else {
                                phoneNumber.push(phone)
                            }
                        }

                        getContentArray[index].from = 'localAddressBook'
                        getContentArray[index].phoneNumber = phoneNumber
                        getContentArray[index].name = firstLastName || lastFirstName
                        getContentArray[index].email = accountInfo?.email
                        getContentArray[index].jobTitle = accountInfo?.JobTitle
                        getContentArray[index].company = accountInfo?.Company
                        index++
                    }
                }
            }

            // 然后匹配是否是number类型且是telephone
            if(!getContentArray.length){
                if(!isNaN(Number(searchContent)) && gsContentScript.dialplanregulars.length){
                    let matchList = this.grpDialPlan(searchContent)
                    let obj = {
                        phoneNumber:[{phoneNumber: matchList}]
                    }
                    getContentArray.push(obj)
                }
            }
        }
        return getContentArray
    },

    /**
     * 加载content script 脚本
     */
    loadContentScript: async function (){
        console.log('load content script')
        await gsContentScript.init()
        await gsContentScript.initCustomPanel()
        await gsContentScript.initCustomEventListens()
    },

    /**
     * 初始化自定义面板
     * 注入内容
     * @param data
     */
    initCustomPanel: function( data= {}){
        this.panel.className = 'addGrpSpan addGrpSpan_hidden'
        this.panel.innerHTML = `
            <div class="addContentWrapper">
                <div class="addGrpTop">
                    <div class="addGrpLeft">
                        <span class="addGrpIcon GRP-icon-icon_left"></span>
                    </div>
                    <div class="addGrpCenter">
                        <div class="addGrpCenter_icon">
                            <span class="addGrp_iconText GRP-icon-icon_meeting"> </span>
                        </div>
                        <div class="addGrpCenter_content"></div>
                    </div>
                    <div class="addGrpRight">
                        <span class="addGrpIcon GRP-icon-icon_right " ></span>
                    </div>
                </div>

                <div class="addGrpBottom">
                    <div class="addGrpContent">
                        <div class="addGrpShow">
                            <span class="addGrp_email"></span>
                        </div>

                        <div id="addGrpTipsContent" class="addGrpTips">
                            <div class="addGrp_tips_content addGrp_tips_number">
                                <span class="addGrp_tip_number_txt">Number：</span>
                                <span class="addGrp_tip_number"></span>
                            </div>
                            <div class="addGrp_tips_content addGrp_tips_name">
                                <span class="addGrp_tip_name_txt">Name：</span>
                                <span class="addGrp_tip_name"></span>
                            </div>
                            <div class="addGrp_tips_content addGrp_tips_email">
                                <span class="addGrp_tip_email_txt">Email：</span>
                                <span class="addGrp_tip_email"></span>
                            </div>
                            <div class="addGrp_tips_content addGrp_tips_company">
                                <span class="addGrp_tip_company_txt">Company：</span>
                                <span class="addGrp_tip_company"></span>
                            </div>
                            <div class="addGrp_tips_content addGrp_tips_department">
                                <span class="addGrp_tip_department_txt">Department：</span>
                                <span class="addGrp_tip_department"></span>
                            </div>
                        </div>
                    </div>
                    <div class="userAccount"> 
                        <div class="addGrp_showSelectOption">
                            <ul class="addGrp_ul"></ul>
                        </div>
                        <div class="addGrp_wrapper">
                            <div class="addGrp_selectContent">
                                <div class="addGrp-icon-parent GRP-icon-person">
                                    <div class="addGrp-icon-floater"></div>
                                </div>
                                <div class="addGrp_getContent_wrapper">
                                  <div class="addGrp_getContent addGrp_container_words "></div>
                                </div>                              
                                <div class="addGrp_iconBtn">
                                     <span class="addGrp_icon GRP-icon-down"></span>
                                </div>
                            </div>
                            <div class="addGrp_btn">
                                <button class="addGrp_call">呼叫</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`
        document.body.append(this.panel)
    },

    /**
     * 初始化自定义事件
     */
    initCustomEventListens: function() {
        this.clickEvent()
        this.hoverEvent()
        this.leaveEvent()
    },

    /*** 鼠标点击事件 ***/
    clickEvent:function(){
        /*** 点击呼叫 ***/
        let callBtn = document.getElementsByClassName("addGrp_btn")[0]
        if (callBtn) {
            callBtn.addEventListener('click', function (e) {
                let addGrpGetContent = document.getElementsByClassName("addGrp_getContent")[0]
                let index = addGrpGetContent.getAttribute('accountid')
                let { currentElement }= gsContentScript.getCurrent()
                let callNumber = currentElement.value?.trim()

                gsContentScript.sendMessageToBackgroundJS({
                    cmd: 'contentScriptMakeCall',
                    data: {
                        accountId: index,
                        phonenumber: callNumber
                    }
                })
            });
        }


        /****左边按钮点击事件******/
        let addGrpIconLeft = document.getElementsByClassName("GRP-icon-icon_left")[0]
        if(addGrpIconLeft){
            addGrpIconLeft.addEventListener("click",function(e){
                e.stopPropagation();
                gsContentScript.switchContacts('pre')
            },false)
        }

        /****右边按钮点击事件********/
        let addGrpIconRight = document.getElementsByClassName("GRP-icon-icon_right")[0]
        if(addGrpIconRight){
            addGrpIconRight.addEventListener("click",function(e){
                e.stopPropagation();
                gsContentScript.switchContacts('next')
            },false)
        }

        /****点击展开下拉框*****/
        let addGrp_showSelectOption = document.getElementsByClassName("addGrp_showSelectOption")[0]
        let addGrp_selectContent = document.getElementsByClassName("addGrp_selectContent")[0]
        if (addGrp_selectContent) {
            addGrp_selectContent.onclick = function () {
                if(!gsContentScript.isHiddenElement){
                    gsContentScript.isHiddenElement = true
                    addGrp_showSelectOption.style.display = 'block'
                }else{
                    gsContentScript.isHiddenElement = false
                    addGrp_showSelectOption.style.display = 'none'
                }
            }
        }

        /***点击下拉框 显示对应的内容***/
        let ulElement = document.getElementsByClassName("addGrp_ul")[0]
        let addGrpGetContent = document.getElementsByClassName("addGrp_getContent")[0]
        let grpIconFloater = document.getElementsByClassName("addGrp-icon-floater")[0]
        if(ulElement){
            ulElement.onclick =  function(e){
                gsContentScript.isHiddenElement =  false

                /** 获取当前元素父节点的所有元素，并设置默认样式***/
                let parent = e.target.parentNode?.parentNode
                let children = parent?.children
                for(let i=0; i < children.length; i++){
                    let node = children[i]
                    if(node){
                        node.style.color = "#222222"
                        if(i === children.length -1 && e.target.parentNode){
                            /** 对当前的元素 更换样式**/
                            e.target.parentNode.style.color = '#2F91FF'
                        }
                    }
                }
                grpIconFloater.textContent = e.target.getAttribute('accountId') || e.target.getAttribute('currentindex')
                addGrpGetContent.textContent = `${e.target.getAttribute('name')} (${e.target.getAttribute('sipId')})`
                /**删除当前元素跑马灯效果以及tips**/
                if(addGrpGetContent.classList.contains('addGrp_container_words_hover')){
                    addGrpGetContent.classList.remove('addGrp_container_words_hover')
                    addGrpGetContent.setAttribute('title','')
                }
                addGrpGetContent.setAttribute('accountId',e.target.getAttribute('accountId'))
                addGrpGetContent.setAttribute('name',e.target.getAttribute('name'))
                addGrpGetContent.setAttribute('sipId', e.target.getAttribute('sipId'))
                addGrp_showSelectOption.style.display = 'none'
            }
        }
    },

    hoverEvent: function(){
        /****email 鼠标移入*****/
        let addGrpShow = document.getElementsByClassName("addGrpShow")[0]
        if(addGrpShow){
            addGrpShow.onmousemove = function () {
                gsContentScript.handleTipsContent()
            }
        }

        /** 鼠标移入当前账号，查看当前账号内容是否溢出***/
        let addGrpGetContent = document.getElementsByClassName("addGrp_getContent")[0]
        if(addGrpGetContent){
            addGrpGetContent.onmousemove = function(event){
                let element = event.target
                let offsetWidth = element.offsetWidth
                let scrollWith = element.scrollWidth

                /** 判断元素是否出现了省略号，即文本内容的宽度是否超过了元素的宽度 **/
                /** 若超出，则显示tips **/
                if(scrollWith > offsetWidth){
                    element.title = element.textContent
                    element.classList.add("addGrp_container_words_hover")
                }
            }
        }

        /***下拉框 鼠标移入(li ----> 转变)***/
        let ulElement = document.getElementsByClassName("addGrp_ul")[0]
        if(ulElement){
            ulElement.onmousemove = function (e){
                let currentElement = e.target
                let offsetWidth = currentElement.offsetWidth
                let scrollWith = currentElement.scrollWidth

                /***简单的处理tips**/
                if(!currentElement.classList.contains('addGrp_span')) return

                /**判断元素是否出现了省略号，即文本内容的宽度是否超过了元素的宽度**/
                if(scrollWith > offsetWidth){
                    currentElement.title = currentElement.textContent
                }
            }
        }
    },

    leaveEvent:function(){
        /****email 鼠标移出*****/
        let addGrpShow = document.getElementsByClassName("addGrpShow")[0]
        if(addGrpShow){
            addGrpShow.onmouseleave = function(){
                gsContentScript.handleTipsContent()
                document.getElementsByClassName("addGrpTips")[0].style.display = "none"
            }
        }
    },

    /***鼠标移入email显示tips内容***/
    handleTipsContent: function(){
        let tipContents = {}

        /**** 处理划过或者移入的显示内容问题 ****/
        let mousemoveContent = function(tipContents){
            /** 首先判断长度 来定位tips的显示的位置 ***/
            const addGrpTips = document.querySelector(".addGrpTips")
            let len = Object.keys(tipContents).length
            if (len === 0) {
                addGrpTips.style.display = "none";
                return;
            } else {
                const topValue = -40 - (len - 1) * 20;
                addGrpTips.style.top = topValue + "px";
                addGrpTips.style.display = "block";
            }

            /*** 通过获取的内容来处理显示和隐藏的内容 ****/
            const fields = ["number", "name", "email", "company", "department"];

            // 循环处理每个字段
            fields.forEach(field => {
                // 获取相应的元素和提示元素
                const fieldElement = document.querySelector(`.addGrp_tips_${field}`)
                const tipElement = document.querySelector(`.addGrp_tip_${field}`)

                // 检查字段是否存在
                if (tipContents[field]) {
                    tipElement.textContent = tipContents[field];
                    fieldElement.style.display = "flex";
                } else {
                    fieldElement.style.display = "none";
                }
            });
        }

        /**** 获取当前活跃的number *****/
        let element = gsContentScript.getCurrent().currentElement
        if(element){
            if (element) {
                const attributes = ["email", "name", "jobTitle", "company", "department", "phone"];

                attributes.forEach(attribute => {
                    const value = element.getAttribute(attribute);
                    if (value) {
                        if(attribute === 'phone'){
                            tipContents['number'] = value;
                        }else {
                            tipContents[attribute] = value;
                        }
                    }
                });
            }
        }

        if(Object.prototype.toString.call(tipContents) === '[object Object]'){
            mousemoveContent(tipContents)
        }
    },

    /** 获取当前内容用户的账号内容
     * ***/
    getCurrent:function(){
        let currentIndex
        let currentElement
        let addGrpCenterContent = document.getElementsByClassName("addGrpCenter_content")[0]
        for (let i = 0; i < addGrpCenterContent.children.length; i++) {
            let children = addGrpCenterContent.children[i]
            if (children.classList.contains('addGrp_active')) {
                currentElement = children
                currentIndex = i
                break
            }
        }
        return { currentIndex, currentElement}
    },

    /***
     * 更换email相关内容
     ***/
    changeEmail:function(element){
        let addGrp_email = document.getElementsByClassName("addGrp_email")[0]
        let email = element.getAttribute('email')
        let name = element.getAttribute('name')

        if (addGrp_email) {
            addGrp_email.textContent = email && name ? `${email}(${name})` : (email || name || '')
        }
    },

    /***
     * 更换email 中关于tips内容
     ***/
    changeTips: function(element){
        const attributes = {
            email: "addGrp_tip_email",
            name: "addGrp_tip_name",
            jobTitle: "addGrp_tip_jobTitle",
            company: "addGrp_tip_company",
            department: "addGrp_tip_department",
            phone: "addGrp_tip_number"
        };

        for (const attr in attributes) {
            const value = element.getAttribute(attr);
            const tipElement = document.getElementsByClassName(attributes[attr])[0];

            if (tipElement) {
                tipElement.textContent = value || '';
            }
        }
    },

    /**
     * 点击左右两边按钮 切换显示的联系人内容
     * direction: pre 左； next 右
     */
    switchContacts: function(direction){
        let addGrpCenterContent = document.getElementsByClassName("addGrpCenter_content")[0]
        let len = addGrpCenterContent.children.length  // 子元素的个数
        let { currentIndex } = gsContentScript.getCurrent()
        let index
        if(len > 0 ){
            for(let i=0; i < addGrpCenterContent.children.length; i++){
                let children = addGrpCenterContent.children[i]
                if(currentIndex === i){
                    children.style.display = "none"
                    children.classList.remove('addGrp_active')
                    break
                }
            }

            for(let i=0; i < addGrpCenterContent.children.length; i++){
                let children = addGrpCenterContent.children[i]
                if(direction === 'pre'){
                    index  = currentIndex - 1
                    if(index < 0){
                        index = addGrpCenterContent.children.length -1
                    }
                }else {
                    index  = currentIndex + 1
                    if(index > addGrpCenterContent.children.length - 1){
                        index = 0
                    }
                }
                if(i === index) {
                    children.style.display = "block"
                    children.classList.add('addGrp_active')
                    gsContentScript.handleIcon(children)
                    gsContentScript.changeEmail(children)
                    gsContentScript.changeTips(children)
                }
            }
        }
    },

    /*** 处理对应显示的icon***/
    handleIcon: function(element){
        let iconSpan = document.getElementsByClassName("addGrp_iconText")[0]
        let numberType = element.numberType?.toLowerCase()
        let addName
        // 先删除再添加
        let deleteClassName = function(){
            if(iconSpan){
                iconSpan.classList.value = iconSpan.classList.value.split(" ").splice(0, 1).join("")
            }
        }

        let addClassName = function(){
            if(iconSpan){
                iconSpan.classList.add(addName)
            }
        }

        if(numberType === 'work' || numberType === 'office' || numberType === 'number'  || numberType === 'accountnumber'){
            addName = 'GRP-icon-icon_company'
        }else if(numberType === 'home' || numberType === 'homenumber'){
            addName = 'GRP-icon-icon_home'
        }else if(numberType === 'mobile' || numberType === 'cell' || numberType === 'phone' || numberType === 'mobilenumber'){
            addName = 'GRP-icon-icon_phone'
        }else if(numberType === 'conference'){
            addName = 'GRP-icon-icon_meeting'
        }else{
            addName = 'GRP-icon-icon_phone_default'
        }

        deleteClassName()
        addClassName()
    },
    /*** handleTopContent:   处理top 账号内容
     *   handleCenterContent: 处理email 显示内容
     * ***/
    showContent: function(data){
        /*** 处理top 账号内容 ***/
        let handleTopContent = function(data){

            let addContent = function(contents){
                let addGrpCenterContent = document.getElementsByClassName("addGrpCenter_content")[0] || gsContentScript.target?.document.getElementsByClassName("addGrpCenter_content")[0]
                let fragment = document.createDocumentFragment()
                fragment.className = 'addGrpFragment'

                for(let i = 0; i < contents.length; i++){
                    let content = contents[i]
                    let name = content?.name
                    let email = content?.email
                    let jobTitle = content?.jobTitle
                    let company = content?.company
                    let department = content?.department
                    let startCreateInput = function(param, phoneArray, index){
                        for(let num = 0 ; num < phoneArray.length; num++){
                            let indexObj = phoneArray[num]
                            let values = param[indexObj]
                            if(indexObj === 'accountindex' || indexObj === '_type'){
                                break
                            }else{
                                let input = document.createElement("input").cloneNode(true)
                                input.className = `addGrp_input addGrp_${values}`
                                input.value = values
                                input.placeholder = values
                                input.number = values
                                input.numberType = param?._type || indexObj
                                input.setAttribute('phone', values)
                                if(name){
                                    input.setAttribute('name', name)
                                }
                                if(email){
                                    input.setAttribute('email', email)
                                }
                                if(jobTitle){
                                    input.setAttribute('jobTitle', jobTitle)
                                }
                                if(company){
                                    input.setAttribute('company', company)
                                }
                                if(param?._type || indexObj){
                                    input.setAttribute('phoneType', param?._type || indexObj)
                                }

                                if(department){
                                    input.setAttribute('department', department)
                                }
                                gsContentScript.handleIcon(input)

                                if(!param){
                                    if(i === 0 && num === 0 && num === 0){
                                        input.className += ' addGrp_active'
                                    }else{
                                        input.style.display = "none"
                                    }
                                }else{
                                    if( i === 0 && index === 0 && num === 0 ){
                                        input.className += ' addGrp_active'
                                    }else{
                                        input.style.display = "none"
                                    }

                                }
                                fragment.appendChild(input)
                            }

                        }
                    }
                    let handleInput = function(param = null, index = null){
                        let phoneArray
                        if(Object.prototype.toString.call(param) === '[object Object]'){
                            phoneArray = Object.keys(param)
                        }

                        if(phoneArray && phoneArray.length){
                            startCreateInput(param, phoneArray, index)
                        }
                    }

                    if( Object.prototype.toString.call(content.phoneNumber) === '[object Object]'){
                        handleInput()
                    }else if(Object.prototype.toString.call(content.phoneNumber) === '[object Array]'){
                        for(let j = 0; j < content.phoneNumber.length; j++ ){
                            let numberArray = content.phoneNumber[j]
                            handleInput(numberArray, j)
                        }
                    }
                }
                if(addGrpCenterContent && fragment){
                    addGrpCenterContent.appendChild(fragment)
                }
            }

            let removeContent = function(data){
                let addGrpCenterContent = document.getElementsByClassName("addGrpCenter_content")[0] || gsContentScript.target?.document.getElementsByClassName("addGrpCenter_content")[0]
                if(addGrpCenterContent && addGrpCenterContent.children.length){
                    for(let i = addGrpCenterContent.children.length - 1; i >= 0; i-- ){
                        let children = addGrpCenterContent.children[i]
                        addGrpCenterContent.removeChild(children)
                        if(addGrpCenterContent.children.length === 0){
                            addContent(data)
                        }
                    }
                }else{
                    addContent(data)
                }
            }

            removeContent(data)
        }

        /*** 处理email 显示内容 ****/
        let handleCenterContent = function(data){
            let addGrpEmail = document.getElementsByClassName("addGrp_email")[0] ||gsContentScript.target?.document.getElementsByClassName("addGrp_email")[0]
            for(let i = 0; i < data.length; i++){
                let index = data[i]
                if(i === 0 && addGrpEmail){
                    let email = index?.email
                    let name = index?.name

                    if(email && name ){
                        addGrpEmail.textContent = `${email}(${name})`
                    }else if(email){
                        addGrpEmail.textContent = email
                    }else if(name){
                        addGrpEmail.textContent = name
                    }else{
                        addGrpEmail.textContent = ''
                    }

                }
            }
        }

        handleTopContent(data)
        handleCenterContent(data)
    },

    /**
     * 基于当前语言显示内容
     */
    displayContentBasedOnLanguage: function(){
        /** 根据语言修改 显示内容**/
        const elementsToTextContent = {
            addGrp_call: "call",
            addGrp_tip_number_txt: "number",
            addGrp_tip_name_txt: "name",
            addGrp_tip_email_txt: "email",
            addGrp_tip_company_txt: "company",
            addGrp_tip_department_txt: "department"
        };

        if (gsContentScript.language) {
            for (const elementClass in elementsToTextContent) {
                const element = document.querySelector(`.${elementClass}`) || gsContentScript.target?.document.querySelector(`.${elementClass}`);
                const labelText = gsContentScript.language[elementsToTextContent[elementClass]];

                if (element && labelText) {
                    if(elementClass === 'addGrp_call'){
                        element.textContent = `${labelText}`;
                    }else {
                        element.textContent = `${labelText}:`;
                    }
                }
            }
        }
    },

    /***
     * 处理位置显示问题
     * @param getPhoneContents
     * @param e
     */
    setContentPosition: function(getPhoneContents, e){
        let addGRPElement= document.querySelector(".addGrpSpan") || document.querySelector(".addGrpSpan")

        if(getPhoneContents.length && addGRPElement){
            /***** 针对整体内容显示位置 *****/
            if (addGRPElement && e.currentTarget !== top){     // 当前元素在iframe中
                addGRPElement.classList.add('addGrpSpan_center')
                addGRPElement.style.top = '0'
                addGRPElement.style.left = '0'
                addGRPElement.style.right = '0'
                addGRPElement.style.bottom = '0'
            }else{
                addGRPElement.classList.remove('addGrpSpan_center')
                addGRPElement.style.left = e.pageX - 20 + 'px'
                addGRPElement.style.top = e.pageY + 20 + 'px'
                addGRPElement.style.right = ''
                addGRPElement.style.bottom = ''
            }

            if(addGRPElement && addGRPElement.classList.contains('addGrpSpan_hidden')){
                addGRPElement.classList.toggle('addGrpSpan_hidden')
            }

            /**** 针对top图标显示问题 *****/
            let setElementStyle = function(element, displayValue, paddingLeftValue) {
                if (element) {
                    if(displayValue){
                        element.style.display = displayValue
                    }else if (paddingLeftValue) {
                        element.style.paddingLeft = paddingLeftValue
                    }
                }
            }

            let addGrpLeft = document.querySelector(".addGrpLeft") || gsContentScript.target?.document.querySelector(".addGrpLeft");
            let addGrpRight = document.querySelector(".addGrpRight") || gsContentScript.target?.document.querySelector(".addGrpRight");
            let addGrpTop = document.querySelector(".addGrpTop") || gsContentScript.target?.document.querySelector(".addGrpTop");

            if (getPhoneContents.length === 1) {
                setElementStyle(addGrpLeft, "none")
                setElementStyle(addGrpRight, "none")
                setElementStyle(addGrpTop, "", "30px")
            } else {
                setElementStyle(addGrpLeft, "flex")
                setElementStyle(addGrpRight, "flex")
                setElementStyle(addGrpTop, "", "10px")
            }
        }else{
            /**** 隐藏整体内容 ***/
            if(addGRPElement && !addGRPElement.classList.contains('addGrpSpan_hidden')){
                addGRPElement.classList.toggle('addGrpSpan_hidden')
            }
        }
    },

    /** 针对ul li 内容进行修改
     * **/
    handlePhoneNumber: async function(){

        // 先删除li 再添加li内容
        let deleteLiContent = function(){
            let ulElement = document.getElementsByClassName("addGrp_ul")[0] ||gsContentScript.target?.document.getElementsByClassName("addGrp_ul")[0]
            if(ulElement && ulElement.children.length > 0 ){
                for(let i = ulElement.children.length - 1; i >= 0; i--){
                    let li = ulElement.children[i]
                    ulElement.removeChild(li)
                    if(!ulElement.children.length){
                        addLiContent()
                    }
                }
            }else{
                addLiContent()
            }
        }
        let addLiContent = function(){
            let fragment = document.createDocumentFragment()
            let ulElement = document.getElementsByClassName("addGrp_ul")[0] || gsContentScript.target?.document.getElementsByClassName("addGrp_ul")[0]
            let addGrp_getContent =  document.getElementsByClassName("addGrp_getContent")[0] || gsContentScript.target?.document.getElementsByClassName("addGrp_getContent")[0]
            let addGrpIconFloater =  document.getElementsByClassName("addGrp-icon-floater ")[0] || gsContentScript.target?.document.getElementsByClassName("addGrp-icon-floater ")[0]
            if (gsContentScript.accountLists) {
                for (let i = 0; i < gsContentScript.accountLists.length; i++) {
                    let accountObj = gsContentScript.accountLists[i]
                    let sipId = accountObj['sip_id']
                    let name = accountObj['name']
                    let id = accountObj['id']
                    let option = document.createElement("li").cloneNode(true)
                    option.className = 'addGrpOption'
                    option.setAttribute('currentIndex', id)
                    option.setAttribute('sipId', sipId)
                    option.setAttribute('name', name)
                    option.setAttribute('accountId', id)

                    /***处理显示icon***/
                    let icon = document.createElement('div').cloneNode(true)
                    icon.className = `addGrp-icon-parent GRP-icon-person`
                    icon.setAttribute('sipId', sipId)
                    icon.setAttribute('accountId', id)
                    icon.setAttribute('name', name)
                    icon.setAttribute('accountType', accountObj.auto_cfg)

                    let iconText = document.createElement('div').cloneNode(true)
                    iconText.className = 'addGrp-icon-floater'
                    iconText.setAttribute('sipId', sipId)
                    iconText.setAttribute('accountId', id)
                    iconText.setAttribute('name', name)
                    iconText.setAttribute('accountType', accountObj.auto_cfg)

                    iconText.textContent = id
                    icon.appendChild(iconText)
                    option.appendChild(icon)

                    /*** 处理显示账号内容***/
                    let span = document.createElement('span').cloneNode(true)
                    span.className = `addGrp${sipId} addGrp_span`
                    span.setAttribute('accountId', id)
                    span.setAttribute('name', name)
                    span.setAttribute('accountType', accountObj.auto_cfg)
                    span.setAttribute('sipId', sipId)

                    span.textContent = `${name} (${sipId})`
                    option.appendChild(span)

                    fragment.appendChild(option)

                    if (i === 0) {
                        if(addGrpIconFloater){
                            addGrpIconFloater.textContent = id
                        }
                        option.style.color = '#6fa8dc'
                        if(addGrp_getContent){
                            addGrp_getContent.textContent = `${name} (${sipId})`
                            addGrp_getContent.setAttribute('accountId', id)
                            addGrp_getContent.setAttribute('sipId', sipId)
                            if( addGrp_getContent.classList.contains('addGrp_container_words_hover')){
                                addGrp_getContent.classList.remove('addGrp_container_words_hover')
                                addGrp_getContent.setAttribute('title', '')
                            }
                        }
                    }

                    if (i === gsContentScript.accountLists.length - 1 && ulElement) {
                        ulElement.appendChild(fragment)
                    }
                }
            }
        }

        if (!gsContentScript?.accountLists || JSON.stringify(gsContentScript?.accountLists) === '{}') {
            new Promise(async (res)=>{
                await gsContentScript.extensionNamespace.storage.local.get('updateAccountLists', function (obj) {
                    gsContentScript.accountLists = obj.updateAccountLists
                    res(gsContentScript.accountLists)
                });
            }).then((data)=>{
                if(data){
                    deleteLiContent()
                }
            }).catch((e)=>{
                console.log("handlePhoneNumber error")
            })
        }else{
            deleteLiContent()
        }

        // 默认 ul li 的下拉框是不显示的；
        let addGrp_showSelectOption = document.getElementsByClassName("addGrp_showSelectOption")[0] || gsContentScript.target?.document.getElementsByClassName("addGrp_showSelectOption")[0]
        if(addGrp_showSelectOption){
            addGrp_showSelectOption.style.display = "none"
        }
    },

    getMousePosition:function (iframe,event) {
        let mouseX = event.clientX;
        let mouseY = event.clientY;
        let offsetX = 0; // 窗口相对于父窗口的x偏移量
        let offsetY = 0; // 窗口相对于父窗口的y偏移量

        if(iframe){
            iframe = iframe.frameElement; // 当前窗口所在的iframe元素
            var iframeRect = iframe?.getBoundingClientRect(); // iframe相对于父窗口的位置和尺寸

            offsetX += iframeRect.left; // 窗口相对于父窗口的x偏移量
            offsetY += iframeRect.top; // 窗口相对于父窗口的y偏移量
        }

        let mouseXRelativeToParent = mouseX + offsetX; // 鼠标相对于父窗口的位置
        let mouseYRelativeToParent = mouseY + offsetY;

        return { x: mouseXRelativeToParent, y: mouseYRelativeToParent };
    },

    getSelectionContent: function () {
        let selection
        let content
        let getSelectionForIframe = function(iframes){
            if(iframes.length){
                for (let i = 0; i < iframes.length; i++) {
                    try{
                        let iframe = iframes[i]
                        selection = iframe.frameElement?.contentWindow?.getSelection()
                        content = selection?.toString()?.trim()
                        if (content){
                            break
                        }
                    }catch(e){
                        // console.log('get selection for iframe error:', e)
                    }
                }
            }
        }

        try{
            /*** 针对iframe ***/
            if (self.length) {
                getSelectionForIframe(self)
            }else if(self.frames){
                if(self.frames.length){
                    getSelectionForIframe(self.frames)
                }else{
                    selection = self.frames?.frameElement?.contentWindow?.getSelection()
                    content = selection?.toString()?.trim()
                }

            }else if(self.frameElement){
                if(self.frameElement.length){
                    getSelectionForIframe(self.frameElement)
                }else{
                    selection = self.frameElement?.contentWindow?.getSelection()
                    content = selection?.toString()?.trim()
                }
            }

            /*** 针对window ***/
            if(!content){
                selection = window.getSelection ? window.getSelection() : window.document.getSelection();
                content =  selection?.toString()?.trim()
            }
        }catch(e){
            console.log('get selection content error:', e)
        }

        return content
    },

    /**删除iframe内容 ***/
    deleteIframeElement: function(){
        let iframes = document.getElementsByTagName("iframe")
        for(let i = 0; i < iframes.length; i++){
            let iframe = iframes[i]
            let doc = iframe?.contentDocument || iframe?.contentDocument?.document
            /**删除添加的元素**/
            let addGrpSpan = doc?.getElementsByClassName("addGrpSpan")[0]
            if(addGrpSpan){
                addGrpSpan.parentNode.removeChild(addGrpSpan)
            }
            /**删除添加的script**/
            var scr = doc?.getElementsByTagName("script")[0]
            if(scr){
                scr.parentNode.removeChild(scr);
            }
        }
    },

    /**
     * 处理页面点击事件
     * @param e
     */
    processSelectionTextContent(e) {
        if (e.target.nodeName === 'GRPSPAN' || (e.target.getAttribute && e.target.getAttribute('grpcallnumber'))) {
            // 已添加自定义grpspan的内容不做处理
            return
        }

        if (e.target.classList && (e.target.classList.contains('addGrp_account') || e.target.classList.contains('addGrp_call') ||
            e.target.classList.value.indexOf('addGrp') > -1)) {
            return
        }
        gsContentScript.target  = e.currentTarget && e.currentTarget?.window?.parent

        /*** 先删除不需要的内容，再处理****/
        gsContentScript.deleteIframeElement()
        let addGrpSpan = document.getElementsByClassName("addGrpSpan")[0] || gsContentScript.target?.document.getElementsByClassName("addGrpSpan")[0]
        let content = gsContentScript.getSelectionContent()
        if (!content) {
            if (addGrpSpan) {
                addGrpSpan.style.display = "none"
            }
            // console.log('select content is not get!')
            return
        }

        // 发送消息给背景页查询是否启用划词拨号功能
        gsContentScript.sendMessageToBackgroundJS({cmd: 'configureQuery'}, function (configs){
            gsContentScript.wordDialingEnabled = configs.wordDialing
            gsContentScript.contactSearchFrom = configs.contactSearchFrom

            if(gsContentScript.wordDialingEnabled){
                /** 网页拨号 **/
                new Promise((res, rej) => {
                    let getPhoneContents = gsContentScript.getContentForFuzzyMatch(content)
                    content = null
                    if (getPhoneContents && Object.prototype.toString.call(getPhoneContents) === '[object Array]') {
                        gsContentScript.showContent(getPhoneContents)
                        gsContentScript.displayContentBasedOnLanguage()
                        res(getPhoneContents)
                    } else {
                        rej('The current data is not an array or data is null')
                    }
                }).then((data) => {
                    if(data && data.length) {
                        if(addGrpSpan){
                            addGrpSpan.style.display = "block"
                        }
                        gsContentScript.setContentPosition(data, e)
                        gsContentScript.handlePhoneNumber()
                    }else{
                        if(addGrpSpan){
                            addGrpSpan.style.display = "none"
                        }
                    }
                }).catch((e) => {
                    console.log("error:", e)
                    if (addGrpSpan) {
                        addGrpSpan.style.display = "none"
                    }
                })
            }else {
                //  nothing to do
            }
        })
    },

    /**
     * 解析浏览器UA信息
     * @returns {{}}
     */
    getBrowserDetail() {
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
    },
}


/*******************************************************************************************************************/
/***********************************************屏幕取词呼叫***********************************************************/
/*******************************************************************************************************************/
if(gsContentScript.getBrowserDetail().browser === 'firefox'){
    gsContentScript.loadContentScript()

    window.addEventListener("mouseup",   function (event){
        gsContentScript.processSelectionTextContent(event)
    })
}else {
    /**
     * 内容注入
     * 注意：必须设置了run_at=document_start 此段代码才会生效  DOMContentLoaded。
     **/
    document.addEventListener('DOMContentLoaded',function(){
        console.log('DOMContentLoaded completed')
        // 注入自定义JS
        gsContentScript.loadContentScript()
    })

    /**
     * 页面dom节点扫描获取选中文本内容
     */
    window.addEventListener("mouseup", function (event){
        gsContentScript.processSelectionTextContent(event)
    })
}
