
let gsContentScript = {
    language: '',
    extensionNamespace: '',

    // 忽略的HTML DOM对象列表
    ignoreHTMLDomList: [
        'AUDIO',
        'VIDEO',
        'CANVAS',
        'SCRIPT',
        'STYLE',
        'A',
        'SCRIPT',
        'IMG',
        'TEXTAREA',
        'INPUT',
        'SELECT',
        'PRE',
        'CODE',
        'STYLE',
        'CANVAS',
        'SVG',
        'rect',
        'clipPath',
        'GRPSPAN'
    ],
    phoneCallProtocolList: ['tel:', 'mailto:', 'sms:'],
    regexIP: new RegExp('((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])($|\\s|[;,])', 'g'),
    regexURL: new RegExp('http[s]?:\\/\\/\\S*(\\s|$)', 'g'),
    regexDate: [
        new RegExp('([1-9][0-9])([0-9]{2})-(1[0-2]|0[1-9])(-)?(3[0-1]|[1-2][0-9]|0[0-9])?($|\\)|\\s)', 'g'),
        new RegExp('(3[0-1]|[0-2][0-9]|[1-9])[\\/.-](1[0-2]|0[1-9]|[1-9])[\\/.-](([1-9][0-9])?[0-9]{2})($|\\)|\\s)', 'g'),
        new RegExp('(1[0-2]|0[1-9]|[1-9])[\\/.-](3[0-1]|[0-2][0-9]|[1-9])[\\/.-](([1-9][0-9])?[0-9]{2})($|\\)|\\s)', 'g'),
    ],

    poneMatchRegex: /[1][3,4,5,7,8][0-9]{9}/g,   // 手机号
    telMatchRegex: /(([0\+]\d{2,3}-)?(0\d{2,3})-)(\d{7,8})(-(\d{3,}))?/g,   // 电话号码
    emailMatchRegex: /([a-zA-Z]|[0-9])(\w|\-)+@[a-zA-Z0-9]+\.([a-zA-Z]{2,4})/g,    // 邮箱   /\w+([\.\-]\w+)*\@\w+([\.\-]\w+)*\.\w+/g
    dialplanregulars: [],

    tipCount: 0,
    panel: document.createElement('div'),
    addGRPElement: '',         //  获取panel 元素
    isHiddenElement: false,


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
     * 创建并返回一个新的观察器，它会在触发指定 DOM 事件时，调用指定的回调函数。
     * MutationObserver 对 DOM 的观察不会立即启动；而必须先调用 observe() 方法来确定，要监听哪一部分的 DOM 以及要响应哪些更改.
     *
     * 回调函数，每当被指定的节点或子树以及配置项有Dom变动时会被调用。
     * 回调函数拥有两个参数：一个是描述所有被触发改动的 MutationRecord 对象数组，另一个是调用该函数的MutationObserver 对象
     */
    nodeObserver: new MutationObserver((mutationList) => {
        // 当观察到变动时执行的回调函数
        mutationList.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                const { tagName } = node
                if ('A' === tagName) {
                    // console.log('Dynamic element "A" will be processed')
                    gsContentScript.tryReWriteAnchorTag(node)
                } else if (gsContentScript.ignoreHTMLDomList.indexOf(tagName) >= 0) {
                    // console.log('Dynamic element ignored: ' + tagName)
                } else {
                    // console.log('Dynamic element parsed: ' + tagName)
                    gsContentScript.urlToIgnored()
                    setTimeout(() => {
                        gsContentScript.pageScan(node)
                    }, 1000)
                }
            })
        })
    }),

    /**
     * 启动节点变化观察器
     */
    attachObserver: function (targetNode) {
        const observerOptions = {
            attributes: !0, // 观察属性变动
            childList: !0, // 观察目标子节点的变化，是否有添加或者删除
            characterData: !0, // 观察节点或节点中包含的字符数据的更改
            subtree: !0, // 观察后代节点，默认为 false
        }
        this.nodeObserver.observe(targetNode, observerOptions)
    },

    /**
     * 停止节点变化观察器
     */
    detachObserver: function () {
        // 停止观察
        this.nodeObserver.disconnect()
    },

    /**
     * 判断是否符合手机号或号码格式
     * @param str
     * @returns {boolean}
     */
    complyPhoneOrTelFromat: function (str) {
        let result = this.poneMatchRegex.test(str)
        if (!result) {
            result = this.telMatchRegex.test(str)
        }
        return result
    },

    /**
     * 匹配手机号，处理规则：
     * 1--以1为开头；
     * 2--第二位可为3,4,5,7,8,中的任意一位；
     * 3--最后以0-9的9个整数结尾。
     * @param str
     * @returns {boolean}
     */
    poneMatch: function (str) {
        return str.match(this.poneMatchRegex)
    },

    /**
     * 匹配电话号码
     * @param str
     * @returns {boolean}
     */
    telMatch: function (str) {
        return str.match(this.telMatchRegex)
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

    /**
     * 匹配邮箱
     * 规则：
     * 以数字字母开头、中间可以是多个数字字母下划线或"-"，
     * 然后是"@"符号，后面是数字字母
     * 然后是"."符号加2-4个字母结尾
     * @param str
     * @returns {boolean}
     */
    emailMatch: function (str) {
        return str.match(this.emailMatchRegex)
    },

    /**
     * 需要忽略的页面
     * 忽略不处理的页面
     * @constructor
     */
    urlToIgnored: function () {
        let ignoredURLArr = [
            // 'https://bugzilla.grandstream.com',
            // 'https://192.168.120.245',
            // 'https://192.168.120.246'
        ]
        const locationStr = window.location.toString().toLowerCase()
        let host = window.location.host.toLowerCase()

        for (const item of ignoredURLArr) {
            let url = item.trim().toLowerCase()
            if (url) {
                if (locationStr.indexOf(url) >= 0) {
                    console.log(`URL ignored ${locationStr} because it matches ${item}`)
                    return true
                }
            }
        }
        return false
    },

    /**
     * 转义 HTML 标签字符
     */
    escapeHtmlTagChars: function (nodeValue) {
        return nodeValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    },

    /**
     * 替换no breaking space字符
     * @param text
     * @returns {*}
     */
    replaceNBSPChar: function (text) {
        return text.replace(new RegExp(' ', 'g'), ' ')
    },

    /**
     * 格式化号码，保存数字部分
     * @param e
     * @returns {*}
     */
    formatNumber: function (e) {
        return e.replace(/[^0-9+]/gi, '')
    },

    /**
     * 鼠标hover时显示的调试内容
     * @param e
     * @returns {string}
     */
    phoneCallTitle: function (e) {
        return `Call ${e} via GRP Click2Dial`
    },

    /**
     * 自定义dom节点内容
     * @param t
     * @returns {``}
     */
    phoneCallItem: function (t) {
        return `<grpSpan grpcallnumber="${this.formatNumber(t)}" title="${this.phoneCallTitle(t)}">${t}</grpSpan>`
    },

    /**
     * 根据邮箱查找到的电话号码
     * @param email 邮箱
     * @param number 号码
     * @returns {``}
     */
    phoneCallItemWithEmail: function (email, number) {
        // return `<grpSpan grpcallnumber="${this.formatNumber(number)}" title="${this.phoneCallTitle(number)}">${email}</grpSpan>`
        return `<grpSpan grpcallnumber="${number}" email="${email}" title="${this.phoneCallTitle(number)}">${email}</grpSpan>`
    },

    /**
     * 替换目标文本为自定义dom节点
     * @param searchedElement
     */
    replaceNodeText: function (searchedElement) {
        let This = this
        let domNode = searchedElement.element
        let textParentNode = domNode.parentNode
        if (domNode.data) {  // 文本存在数据
            let newhtml = searchedElement.newhtml
            // 1.把所有<grpphone></grpphone>包含的内容进行解密
            // 查找到的号码替换为自定义span标签
            newhtml = newhtml.replace(new RegExp('(?:<grpphone>)(.*?)(?:</grpphone>)', 'gm'), function () {
                /**
                 * arguments[0]是匹配到的子字符串
                 * arguments[1]是匹配到的分组项
                 * arguments[2]是匹配到的字符串的索引位置
                 * arguments[3]是源字符串本身
                 */
                const decryptedStr = decodeURIComponent(escape(atob(arguments[1])))
                return This.phoneCallItem(decryptedStr)
            })

            // 查找到的邮箱查询到号码后，替换为自定义标签
            let email
            newhtml = newhtml.replace(new RegExp('(?:<grpemail>)(.*?)(?:</grpemail>)', 'gm'), function () {
                email = decodeURIComponent(escape(atob(arguments[1])))
                return ''
            })
            if (email) {
                newhtml = newhtml.replace(new RegExp('(?:<grpCallNumber>)(.*?)(?:</grpCallNumber>)', 'gm'), function () {
                    let callNumber = decodeURIComponent(escape(atob(arguments[1])))
                    return This.phoneCallItemWithEmail(email, callNumber)
                })
            }

            // 2.获取除目标字符串之外的其他文本信息：
            let outerHTMLWithReplace = textParentNode.innerHTML
            textParentNode.childNodes.forEach((childNode) => {
                if (childNode.nodeType !== 3 && childNode.outerHTML) {  // nodeType: 3 为text文本节点
                    // outerHTML全部替换为*，outerHTML能够获取到带标签和属性等所有内容
                    outerHTMLWithReplace = outerHTMLWithReplace.replace(childNode.outerHTML, '*'.repeat(childNode.outerHTML.length))
                }
            })

            const escapeData = This.escapeHtmlTagChars(domNode.data).replace(/\xa0/g, '&nbsp;')
            let newhtmlStartIndex = outerHTMLWithReplace.indexOf(escapeData)

            // 3.更新Dom节点innerHTML值
            if (newhtmlStartIndex >= 0) {
                let originalPreContent = textParentNode.innerHTML.substring(0, newhtmlStartIndex)  // 被替换字符串前面的内容
                // newhtml: 被添加了grpSpan标签的内容
                let originalEndContent = textParentNode.innerHTML.substring(newhtmlStartIndex + escapeData.length) // 被替换字符串后面的内容

                if (newhtml && newhtml.indexOf('grpSpan') >= 0) {
                    let htmlStr = originalPreContent + newhtml + originalEndContent
                    const parser = new DOMParser();
                    const parsed = parser.parseFromString(htmlStr, `text/html`);
                    const tags = parsed.getElementsByTagName(`body`);

                    textParentNode.innerHTML = ``;
                    for (const tag of tags) {
                        tag.style.clear = 'both'
                        tag.style.margin = 0
                        tag.style.padding = 0
                        if (tag.childNodes && tag.childNodes.length) {
                            for (const child of tag.childNodes) {
                                // issuse: appendChild一个的注意点之会删除原dom树节点
                                let cloneChild = child.cloneNode(true)
                                textParentNode.appendChild(cloneChild)
                            }
                        }
                    }
                }
            }
        }
    },

    /**
     * 处理文本
     * @param targetNode
     */
    parseNodeText: function (targetNode, observe) {
        let searchedElement
        let tagChars = this.escapeHtmlTagChars(targetNode.nodeValue)
        tagChars = tagChars.replace(/\s*/g, "")
        // console.log('targetNode.nodeValue:', tagChars)
        if (tagChars) {
            if (observe) {
                this.detachObserver()
            }
            // if (this.regexURL.test(tagChars)) { 	// 忽略URL
            // 	// console.log(tagChars + ' skipped: matches URL regex')
            // 	return;
            // }
            // if (this.regexIP.test(tagChars)) { 	// 忽略IP
            // 	// console.log(tagChars + ' skipped: matches IP address regex')
            // 	return;
            // }
            // for (const item of this.regexDate) {  // 忽略日期
            // 	if (item.test(tagChars)) {
            // 		// console.log(tagChars + ' skipped: matches date regex')
            // 		return;
            // 	}
            // }

            let matchList = this.emailMatch(tagChars)
            if (matchList) {
                // console.log('match email:', matchList)
                let numberFind = false
                for (let i = 0; i < matchList.length; i++) {
                    let matchStr = matchList[i]
                    let phoneNumber = this.getNumberFromPhoneBook({ email: matchStr })
                    if (phoneNumber) {
                        numberFind = true
                        tagChars = tagChars.replace(
                            matchStr,
                            '<grpemail>' + btoa(unescape(encodeURIComponent(matchStr))) + '</grpemail><grpCallNumber>' + btoa(unescape(encodeURIComponent(phoneNumber))) + '</grpCallNumber>'
                        )
                    }
                }
                if (numberFind) {
                    searchedElement = { element: targetNode, newhtml: tagChars }
                }
            } else {
                // matchList = this.poneMatch(tagChars) || this.telMatch(tagChars)
                matchList = this.grpDialPlan(tagChars)
                if (matchList) {
                    // console.log('match number:', matchList)
                    for (let i = 0; i < matchList.length; i++) {
                        let matchStr = matchList[i]
                        if (!this.complyPhoneOrTelFromat(matchStr)) {
                            // console.log(matchStr, ', Inappropriate number format! !')
                            continue
                        }

                        // 文本加密
                        let target = '</grpphone>'
                        let index = tagChars.lastIndexOf(target)
                        if (index >= 0) {
                            // TODO: solve 被加密后的字符串转换后还存在数字时，会被再次加密问题
                            let preStr = tagChars.substring(0, index + target.length)
                            let endStr = tagChars.substring(index + target.length)
                            tagChars = preStr + endStr.replace(matchStr, '<grpphone>' + btoa(unescape(encodeURIComponent(matchStr))) + '</grpphone>')
                        } else {
                            tagChars = tagChars.replace(matchStr, '<grpphone>' + btoa(unescape(encodeURIComponent(matchStr))) + '</grpphone>')
                        }
                    }
                    searchedElement = { element: targetNode, newhtml: tagChars }
                }
            }

            if (searchedElement) {
                this.replaceNodeText(searchedElement)
            }
            if (observe) {
                this.attachObserver(document.body)
            }
        }
    },

    /**
     * 查找目标dom.nodeType = 3 的文本节点
     * Node.ELEMENT_NODE	1	一个 元素 节点，例如 <p> 和 <div>。
     * Node.ATTRIBUTE_NODE	2	元素 的耦合 属性。
     * Node.TEXT_NODE	    3	Element 或者 Attr 中实际的 文字
     * Node.COMMENT_NODE	8	一个 Comment 节点。
     * @param targetNode
     * @returns {*[]}
     */
    searchTextNode: function (targetNode, observe) {
        targetNode.childNodes.forEach((node) => {
            // nodeType 属性可用来区分不同类型的节点，比如元素,文本和注释。
            const { nodeType } = node

            // 3: Node.TEXT_NODE,Element或者Attr中实际的文字
            // 8: Node.COMMENT_NODE,一个 Comment 节点。
            if (nodeType !== 3 && nodeType !== 8 && this.ignoreHTMLDomList.indexOf(node?.tagName) === -1) {
                // console.log(`search TextNode node: ${node}, nodeType: ${nodeType} nodeValue: ${node.nodeValue}, node tagName ${node?.tagName}`)
                this.searchTextNode(node, observe)
            }
            if (nodeType === 3 && node.nodeValue) {
                // console.log(`parseNodeText node: ${node}, nodeType: ${nodeType} nodeValue: ${node.nodeValue}, node tagName ${node?.tagName}`)

                // console.log('node.nodeValue：', node.nodeValue)
                this.parseNodeText(node, observe)
            }
        })
    },

    /**
     * 获取 nodeType === 1 的节点
     * @param targetNode
     */
    pageScan: function (targetNode) {
        if (!targetNode || this.urlToIgnored()) {
            return
        }

        let iframes = document.getElementsByTagName("iframe");
        for (let i = 0; i < iframes.length; i++) {
            if (iframes[i] && iframes[i].contentDocument && iframes[i].contentDocument.body) {
                let iframeBody = iframes[i].contentDocument.body
                this.searchTextNode(iframeBody, false)

                if (iframeBody.getElementsByTagName) {
                    const anchorTagList = iframeBody.getElementsByTagName('A')
                    if (anchorTagList && anchorTagList.length) {
                        for (let i = 0; i < anchorTagList.length; i++) {
                            try {
                                const anchorTag = anchorTagList[i]
                                this.tryReWriteAnchorTag(anchorTag)
                            } catch (e) {
                                // console.log(`tryReWriteAnchorTag: ${e}`)
                            }
                        }
                    }
                }
            }
        }


        // 1.查找目标dom.nodeType = 3 的文本节点
        this.searchTextNode(targetNode, true)

        // 2.处理超连接
        if (targetNode.getElementsByTagName) {
            const anchorTagList = targetNode.getElementsByTagName('A')
            if (anchorTagList && anchorTagList.length) {
                for (let i = 0; i < anchorTagList.length; i++) {
                    try {
                        const anchorTag = anchorTagList[i]
                        this.tryReWriteAnchorTag(anchorTag)
                    } catch (e) {
                        // console.log(`tryReWriteAnchorTag: ${e}`)
                    }
                }
            }
        }
    },

    /**
     * TBD: 超链接处理的意义好像不大~~~
     * 处理带有tel等呼叫表示的超链接标签
     * @param targetNode
     * @returns {*}
     */
    tryReWriteAnchorTag: function (targetNode) {
        let This = this
        const url = decodeURI(targetNode.getAttribute('href'))
        if (url) {
            for (const item of this.phoneCallProtocolList) {
                if (url.substr(0, item.length) === item) {
                    This.detachObserver()
                    let phoneCallProtocol = url.substr(item.length)
                    let number
                    let email
                    if (item === 'tel:') {   // 点击后直接拨打电话
                        number = phoneCallProtocol
                    } else if (item === 'mailto:') { // 点击后发送邮件
                        email = phoneCallProtocol
                        if (phoneCallProtocol.split) {
                            email = phoneCallProtocol.split('?')[0]   // 包含抄送地址、密件抄送地址、邮件主题或内容等
                            email = email.split(';')[0]   // 包含多个收件人、抄送、密件抄送人
                        }

                        let phoneNumber = This.getNumberFromPhoneBook({ email: email })
                        if (phoneNumber) {
                            number = phoneNumber
                        }
                    } else if (item === 'sms:') {   // 点击后发送短信
                        number = phoneCallProtocol.split ? phoneCallProtocol.split('?')[0].split(';')[0] : phoneCallProtocol  // 去除可能包含的内容等
                    }

                    if (number) {
                        // 修改超链接内容
                        targetNode.setAttribute('title', this.phoneCallTitle(number))
                        targetNode.setAttribute('grpcallnumber', this.formatNumber(number))
                        if (email) {
                            targetNode.setAttribute('email', email)
                        }
                    }
                    This.attachObserver(document.body)  // 重写完成后再重新设置观察器
                    break
                }
            }
        }

        return targetNode
    },

    /**
     * 处理页面点击事件
     * @param e
     */
    handleClick: function (e) {
        if (e && e.target && e.target.getAttribute) {
            let callNumber = e.target.getAttribute('grpcallnumber')
            console.log('get target call number: ', callNumber)
            if (callNumber) {
                let email = e.target.getAttribute('email')
                this.handleClick2DialNumber(callNumber, email)
                e.preventDefault()
            }
        }
    },

    /**
     * 处理点击呼叫的号码
     * @param number
     */
    handleClick2DialNumber: function (number, email) {
        // console.log('handleClick2DialNumber:', number)
        this.sendMessageToBackgroundJS({
            cmd: 'contentScriptClick2Dial',
            data: {
                number: number,
                email: email
            }
        })
    },

    /**************************************************************************************************************/
    /**********************************************和背景页间的消息通信**********************************************/
    /**************************************************************************************************************/
    /**
     * send message to backgroud
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

    /*******************************************************************************************************************/
    /******************************************* 查找通讯录联系人 *********************************************************/
    /*******************************************************************************************************************/
    /**
     * 使用邮箱根据本地通讯录查找号码
     * @param data: {
     *     email: '被叫邮箱',
     * }
     */
    getNumberFromPhoneBook: function (data) {
        if (!data || !data.email) {
            console.log('[EXT] email parameter MUST offer!')
            return ''
        }

        let phoneNumber = ''
        let phoneBooks = this.phoneBooks
        if (phoneBooks) {
            if (data.email) {
                // 优先查询ldap
                if (phoneBooks.ldap) {
                    for (let i = 0; i < phoneBooks.ldap.length; i++) {
                        if (phoneBooks.ldap[i].email === data.email) {
                            phoneNumber = phoneBooks.ldap[i].AccountNumber
                            // console.log('get phoneNumber form ldap:', phoneNumber)
                            break
                        }
                    }
                }

                // 然后再查询本地通讯录、通讯录组
                if (!phoneNumber) {
                    for (const key in phoneBooks) {
                        if (key !== 'ldap' && !phoneNumber) {
                            let localAddressBook = phoneBooks[key]
                            if (key === 'localAddressBook') {
                                for (let j = 0; j < localAddressBook.length; j++) {
                                    if (localAddressBook[j].email === data.email || localAddressBook[j].Mail === data.email) {
                                        phoneNumber = localAddressBook[j].Phone?.phonenumber
                                        // console.log(`get phoneNumber form ${key}:`, phoneNumber)
                                        break
                                    }
                                }
                            } else {
                                if (localAddressBook.memberList && localAddressBook.memberList.length) {
                                    let memberList = localAddressBook.memberList
                                    for (let j = 0; j < memberList.length; j++) {
                                        if (memberList.email === data.email || memberList.Mail === data.email) {
                                            phoneNumber = memberList[j].Phone?.phonenumber
                                            // console.log(`get phoneNumber form ${key}:`, phoneNumber)
                                            break
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return phoneNumber
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
    getContentForfuzzyMatch: function(data){
        if (!data) {
            console.log('[EXT] data parameter MUST offer!')
            return ''
        }
        let getContentArray = []
        let index = 0
        let phoneIndex = 0
        let phoneNumber, email;
        let phoneBooks = this.phoneBooks
        if(phoneBooks){
            if(phoneBooks.ldap){
                for (let i = 0; i < phoneBooks.ldap.length; i++) {
                    let user = phoneBooks.ldap[i]
                    let firstKeys = Object.keys(user)[0]
                    let callerIDName = user?.CallerIDName
                    let isExistChinese = this.isChinese(callerIDName)
                    if(isExistChinese){
                        callerIDName = callerIDName?.split(' ').reverse().join("").replace(/[ ]/g,"")
                    }
                    let emailPrefix = user?.email?.split('@')[0]
                    if (user?.AccountNumber?.includes(data) || callerIDName?.includes(data) ||
                        emailPrefix === data || user?.email === data
                    ){
                        let phoneNumber = []
                        if(firstKeys){
                            phoneNumber[phoneIndex] = {}
                            phoneNumber[phoneIndex].accountNumber = user[firstKeys]
                        }
                        if(user?.HomeNumber ){
                            phoneNumber[phoneIndex].homeNumber = user?.HomeNumber
                        }
                        if(user?.MobileNumber ){
                            phoneNumber[phoneIndex].mobileNumber = user?.MobileNumber
                        }

                        index = index + 1
                        getContentArray[index - 1] = {}
                        getContentArray[index - 1].from = 'ldap'
                        getContentArray[index - 1].phoneNumber = phoneNumber

                        if(user?.CallerIDName){
                            getContentArray[index - 1].name = user?.CallerIDName
                        }

                        if(user?.email){
                            getContentArray[index - 1].email = user?.email
                        }
                    }
                }

            }

            // 然后再查询本地通讯录、通讯录组
            if (!getContentArray.length) {
                for (const key in phoneBooks) {
                    if (key !== 'ldap' && !phoneNumber) {
                        let localAddressBook = phoneBooks[key]
                        if (key === 'localAddressBook') {
                            for (let j = 0; j < localAddressBook.length; j++) {
                                let accountInfo = localAddressBook[j]
                                let phone = accountInfo?.Phone
                                let firstName, lastName,firstLastName,lastFirstName ;
                                let callerIdname = accountInfo?.calleridname
                                let emailPrefix = accountInfo?.email?.split('@')[0]
                                if(accountInfo?.FirstName){
                                    firstName = accountInfo?.FirstName
                                }

                                if(accountInfo?.LastName){
                                    lastName = accountInfo?.LastName
                                }
                                if(firstName && lastName){
                                    firstLastName = firstName + lastName
                                    lastFirstName = lastName + firstName
                                }

                                if( firstLastName?.includes(data) || lastFirstName?.includes(data) ||callerIdname === data ||
                                    emailPrefix === data || accountInfo?.email === data
                                ){
                                    let phoneNumber = []
                                    index = index + 1

                                    getContentArray[index -1] = {}

                                    if(phone){
                                        phoneNumber.push(phone)
                                    }

                                    getContentArray[index -1].from = 'localAddressBook'
                                    getContentArray[index -1].phoneNumber = phoneNumber
                                    getContentArray[index -1].name = callerIdname || firstLastName || lastName
                                    getContentArray[index -1].email = accountInfo?.email
                                    getContentArray[index -1].jobTitle = accountInfo?.JobTitle
                                    getContentArray[index -1].company = accountInfo?.Company
                                }
                            }
                        } else {
                            if (localAddressBook.memberList && localAddressBook.memberList.length) {
                                let memberList = localAddressBook.memberList
                                for (let j = 0; j < memberList.length; j++) {
                                    if (memberList.email === data || memberList.Mail === data) {
                                        phoneNumber = memberList[j].Phone?.phonenumber
                                        console.log(`get phoneNumber form ${key}:`, phoneNumber)
                                        break
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 然后匹配是否是number类型且是telephone
            if(!getContentArray.length){
                if(!isNaN(Number(data)) && gsContentScript.dialplanregulars.length){
                    let matchList = this.grpDialPlan(data)
                    let obj = {
                        phoneNumber:[
                            {
                                phoneNumber: matchList
                            }
                        ]
                    }
                    getContentArray.push(obj)
                }
            }
        }
        return getContentArray
    },

    /** 注入内容
     * **/
    initCustomPannel: function( data= {}){
        this.panel.className = 'addGrpSpan addGrpSpan_hidden'
        this.panel.innerHTML = `
            <div class="addContentWrapper">
                <div class="addGrpTop">
                    <div class="addGrpLeft" href="javascript:sendMessageToContentScriptByClick('你好啊！我是通过DOM事件发送的消息！')">
                        <span class="addGrpIcon GRP-icon-icon_left"  href="javascript:sendMessageToContentScriptByClick('你好啊！我是通过DOM事件发送的消息！')"></span>
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

    /** 向页面注入js
     * **/
    injectCustomJs: function(jsPath) {
        jsPath = jsPath || 'contentScripts/injectScript.js';
        var temp = document.createElement('script');
        temp.setAttribute('type', 'text/javascript');
        // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
        temp.src = this.extensionNamespace.runtime.getURL(jsPath) || this.extensionNamespace.extension.getURL(jsPath);;
        temp.onload = async function() {
            // 放在页面不好看，执行完后移除掉
            this.parentNode.removeChild(this);
        }
        document.body.appendChild(temp);
    },

    /*** 监听事件
     * **/
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
                gsContentScript.handlePreElementClickEvent()
            },false)
        }

        /****右边按钮点击事件********/
        let addGrpIconRight = document.getElementsByClassName("GRP-icon-icon_right")[0]
        if(addGrpIconRight){
            addGrpIconRight.addEventListener("click",function(e){
                e.stopPropagation();
                gsContentScript.handleNextElementClickEvent()
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
        let This = this
        let tipContents = {}

        /**** 获取当前活跃的number *****/
        let getCurrentActiveSpan = function(){
            let element
            let addGrpCenterContent = document.getElementsByClassName("addGrpCenter_content")[0]
            for(let i = 0; i < addGrpCenterContent.children.length; i++ ){
                let children = addGrpCenterContent.children[i]
                if(children.classList.contains('addGrp_active')){
                    element = children
                    break
                }
            }
            return element
        }

        /**** 处理划过或者移入的显示内容问题 ****/
        let mousemoveContent = function(tipContents){
            /** 首先判断长度 来定位tips的显示的位置 ***/
            let len = Object.keys(tipContents).length
            if(len === 0){
                document.getElementsByClassName("addGrpTips")[0].style.display = "none"
                return
            }else {
                if(len === 1){
                    document.getElementsByClassName("addGrpTips")[0].style.top = " -40px"
                }else if(len == 2){
                    document.getElementsByClassName("addGrpTips")[0].style.top = " -60px"
                }if(len === 3){
                    document.getElementsByClassName("addGrpTips")[0].style.top = " -80px"
                }else if(len === 4){
                    document.getElementsByClassName("addGrpTips")[0].style.top = " -100px"
                }else if(len === 5){
                    document.getElementsByClassName("addGrpTips")[0].style.top = " -120px"
                }
                document.getElementsByClassName("addGrpTips")[0].style.display = "block"
            }

            /*** 通过获取的内容来处理显示和隐藏的内容 ****/
            let tipsNumber = document.getElementsByClassName("addGrp_tips_number")[0]
            let tipsName = document.getElementsByClassName("addGrp_tips_name")[0]
            let tipsEmail = document.getElementsByClassName("addGrp_tips_email")[0]
            let tipsCompany = document.getElementsByClassName("addGrp_tips_company")[0]
            let tipsDepartment = document.getElementsByClassName("addGrp_tips_department")[0]

            if(tipContents.number){
                document.getElementsByClassName("addGrp_tip_number")[0].textContent = tipContents.number
                tipsNumber.style.display = "flex"
            }else{
                tipsNumber.style.display = "none"
            }
            if(tipContents.name){
                document.getElementsByClassName("addGrp_tip_name")[0].textContent = tipContents.name
                tipsName.style.display = "flex"
            }else{
                tipsName.style.display = "none"
            }
            if(tipContents.email){
                document.getElementsByClassName("addGrp_tip_email")[0].textContent = tipContents.email
                tipsEmail.style.display = "flex"
            }else{
                tipsEmail.style.display = "none"
            }
            if(tipContents.company){
                document.getElementsByClassName("addGrp_tip_company")[0].textContent = tipContents.company
                tipsCompany.style.display = "flex"
            }else{
                tipsCompany.style.display = "none"
            }
            if(tipContents.department){
                document.getElementsByClassName("addGrp_tip_department").textContent = tipContents.department
                tipsDepartment.style.display = "flex"
            }else{
                tipsDepartment.style.display = "none"
            }
        }

        let element= getCurrentActiveSpan()
        if(element){
            let email = element.getAttribute('email')
            let name = element.getAttribute('name')
            let jobTitle = element.getAttribute('jobTitle')
            let company = element.getAttribute('company')
            let department = element.getAttribute('department')
            let number = element.getAttribute('phone')
            if(email){
                tipContents.email = email
            }
            if(name){
                tipContents.name = name
            }
            if(jobTitle){
                tipContents.jobTitle = jobTitle
            }
            if(company){
                tipContents.company = company
            }
            if(department){
                tipContents.department = department
            }
            if(number){
                tipContents.number = number
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
        let len = addGrpCenterContent.children.length  // 子元素的个数
        if(len > 0){
            for(let i=0; i < addGrpCenterContent.children.length; i++){
                let children = addGrpCenterContent.children[i]
                if(children.classList.contains('addGrp_active')){
                    currentElement = children
                    currentIndex = i
                    break
                }
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


        if(addGrp_email){
            if(email && name ){
                addGrp_email.textContent = `${email}(${name})`
            }else if(email){
                addGrp_email.textContent = email
            }else if(name){
                addGrp_email.textContent = name
            }else{
                addGrp_email.textContent = ''
            }
        }
    },

    /***
     * 更换email 中关于tips内容
     ***/
    changeTips: function(element){
        let email = element.getAttribute('email')
        let name = element.getAttribute('name')
        let jobTitle = element.getAttribute('jobTitle')
        let company = element.getAttribute('company')
        let department = element.getAttribute('department')
        let number = element.getAttribute('phone')

        let tip_number = document.getElementsByClassName("addGrp_tip_number")[0]
        let tip_name = document.getElementsByClassName("addGrp_tip_name")[0]
        let tip_email = document.getElementsByClassName("addGrp_tip_email")[0]
        let tip_company = document.getElementsByClassName("addGrp_tip_company")[0]
        let tip_department = document.getElementsByClassName("addGrp_tip_department")[0]

        if(tip_number){
            if(number){
                tip_number.textContent = number
            }else{
                tip_number.textContent = ''
            }
        }
        if(tip_name){
            if(name){
                tip_name.textContent = name
            }else{
                tip_name.textContent = ''
            }
        }
        if(tip_email){
            if(email){
                tip_email.textContent = email
            }else{
                tip_email.textContent = ''
            }
        }
        if(tip_company){
            if(company){
                tip_company.textContent = company
            }else{
                tip_company.textContent = ''
            }
        }
        if(tip_department){
            if(department){
                tip_department.textContent = department
            }else{
                tip_department.textContent = ''
            }
        }
    },

    /** 左边按钮点击显示内容
     * ***/
    handlePreElementClickEvent: function(){
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
                index  = currentIndex - 1
                if(index < 0){
                    index = addGrpCenterContent.children.length -1
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

    /*** 右边按钮点击显示内容
     * ***/
    handleNextElementClickEvent: function (){
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

                index  = currentIndex + 1
                if(index > addGrpCenterContent.children.length - 1){
                    index = 0
                }
                if(i === index){
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

    /** 基于当前语言显示内容
     * **/
    displayContentBasedOnlanguage: function(){
        /** 根据语言修改 显示内容**/
        let addGrpCall = document.getElementsByClassName("addGrp_call")[0]  || gsContentScript.target?.document.getElementsByClassName("addGrp_call")[0]
        let addGrpTipNumberTxt = document.getElementsByClassName("addGrp_tip_number_txt")[0] || gsContentScript.target?.document.getElementsByClassName("addGrp_tip_number_txt")[0]
        let addGrpTipNameTxt = document.getElementsByClassName("addGrp_tip_name_txt")[0]   || gsContentScript.target?.document.getElementsByClassName("addGrp_tip_name_txt")[0]
        let addGrpTipEmailTxt = document.getElementsByClassName("addGrp_tip_email_txt")[0]  ||gsContentScript.target?.document.getElementsByClassName("addGrp_tip_email_txt")[0]
        let addGrpTipCompanyTxt = document.getElementsByClassName("addGrp_tip_company_txt")[0]  || gsContentScript.target?.document.getElementsByClassName("addGrp_tip_company_txt")[0]
        let addGrpTipDepartmentTxt = document.getElementsByClassName("addGrp_tip_department_txt")[0] || gsContentScript.target?.document.getElementsByClassName("addGrp_tip_department_txt")[0]

        if(gsContentScript.language){
            if(addGrpCall){
                addGrpCall.textContent = `${ gsContentScript.language['call'] }`
            }
            if(addGrpTipNumberTxt){
                addGrpTipNumberTxt.textContent = `${ gsContentScript.language['number'] }:`
            }
            if(addGrpTipNameTxt){
                addGrpTipNameTxt.textContent = `${ gsContentScript.language['name'] }:`
            }

            if(addGrpTipEmailTxt){
                addGrpTipEmailTxt.textContent = `${ gsContentScript.language['email'] }:`
            }

            if(addGrpTipCompanyTxt){
                addGrpTipCompanyTxt.textContent = `${ gsContentScript.language['company'] }:`
            }

            if(addGrpTipDepartmentTxt){
                addGrpTipDepartmentTxt.textContent = `${ gsContentScript.language['department'] }:`
            }
        }
    },

    /*** 处理位置显示问题
     *****/
    showContentPosition: function(getPhoneContents,e){
        let addGRPElement = document.getElementsByClassName("addGrpSpan")[0] || gsContentScript.target?.document.getElementsByClassName("addGrpSpan")[0]

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
            let addGrpLeft = document.getElementsByClassName("addGrpLeft")[0]  ||  gsContentScript.target?.document.getElementsByClassName("addGrpLeft")[0]
            let addGrpRight = document.getElementsByClassName("addGrpRight")[0]  ||  gsContentScript.target?.document.getElementsByClassName("addGrpRight")[0]
            let addGrpTop = document.getElementsByClassName("addGrpTop")[0] || gsContentScript.target?.document.getElementsByClassName("addGrpTop")[0]

            if(getPhoneContents.length === 1){
                /**** 隐藏内容 ***/

                if(addGrpLeft){
                    addGrpLeft.style.display = "none"
                }

                if(addGrpRight){
                    addGrpRight.style.display = "none"
                }

                if(addGrpTop){
                    addGrpTop.style.paddingLeft = '30px'
                }

            }else{
                /**** 显示内容 ***/

                if(addGrpLeft){
                    addGrpLeft.style.display = "flex"
                }

                if(addGrpRight){
                    addGrpRight.style.display = "flex"
                }

                if(addGrpTop){
                    addGrpTop.style.paddingLeft = '10px'
                }
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
                        content = selection.toString()?.trim()
                        if (content){
                            break
                        }
                    }catch(e){}
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
                    content = selection.toString()?.trim()
                }

            }else if(self.frameElement){
                if(self.frameElement.length){
                    getSelectionForIframe(self.frameElement)
                }else{
                    selection = self.frameElement?.contentWindow?.getSelection()
                    content = selection.toString()?.trim()
                }
            }

            /*** 针对window ***/
            if(!content){
                selection = window.getSelection ? window.getSelection() : window.document.getSelection();
                content =  selection.toString()?.trim()
            }
        }catch(e){}

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

    startHandle(e) {
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
            return
        }

        /** 网页拨号 **/
        new Promise((res, rej) => {
            let getPhoneContents = gsContentScript.getContentForfuzzyMatch(content)
            content = null
            if (getPhoneContents && Object.prototype.toString.call(getPhoneContents) === '[object Array]') {
                gsContentScript.showContent(getPhoneContents)
                gsContentScript.displayContentBasedOnlanguage()
                res(getPhoneContents)
            } else {
                rej('The current data is not an array or data is null')
            }
        }).then((data) => {
            if(data && data.length) {
                if(addGrpSpan){
                    addGrpSpan.style.display = "block"
                }
                gsContentScript.showContentPosition(data, e)
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
    }
}


/*******************************************************************************************************************/
/***********************************************屏幕取词呼叫***********************************************************/
/*******************************************************************************************************************/



/** 内容注入
 **/
// 注意： 必须设置了run_at=document_start 此段代码才会生效  DOMContentLoaded
document.addEventListener('DOMContentLoaded',async function(){

    // 注入自定义JS
    await gsContentScript.init()

    await gsContentScript.injectCustomJs();
    await gsContentScript.initCustomPannel()
    await gsContentScript.initCustomEventListens()
})


/**
 * 页面dom节点扫描
 */
window.addEventListener('load',function(){

    window.addEventListener("click",function(e){
        gsContentScript.startHandle(e)
    },false)
})
