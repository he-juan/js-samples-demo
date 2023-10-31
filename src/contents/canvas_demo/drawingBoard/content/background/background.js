import { DBmanager } from './indexedDB.js';
import { X2JS } from './xml2json.js'
import { GsApi } from './gs.sdk.min.js'
import { WebRTCSocketInstance } from './gsRTC.socket.js'

const DEFAULT_COLOR = 'rgb(47, 145, 255)'
/***************************************（一）gsApi创建、注册、呼叫****************************************************/
let grpDialingApi = {
    language: '',
    screen: {  // 屏幕尺寸
        width: '',
        height: ''
    },
    manifestVersion: '',
    extensionNamespace: '',
    keepUserInfo: true,  // 默认保存登录数据
    contactSearchFrom: { // 通讯录搜索来源
        ldap: true,
        localAddressBook: true
    },
    wordDialingEnabled: true,   // 划词拨号
    popupPort: '',
    openerPopupId: 0,    // 已打开的popup页面ID
    isLogin: false,
    permissionCheckRefuse: false,
    gsApi: null,
    lineData: null,     // 线路
    ldapKeys: ['emailAttributes', 'nameAttributes', 'numberAttributes'],
    loginData: {
        selectedAccountId: '',
        accountLists: [],
        password: "",
        url: "",
        username: "",
        // ldapConfig
        emailAttributes: 'email',
        nameAttributes: 'CallerIDName',
        numberAttributes: 'AccountNumber,MobileNumber,HomeNumber'
    },
    sid: '',
    waitingCall: false,
    call401Authentication: false,
    intervalList: {   // setInterval 定时器
        getLine: null,
        getAccounts: null,
        getPhone: null,
        willLogin: null
    },
    intervalTime: {  // setInterval 定时器间隔
        getLine: 1000,
        getAccounts: 5 * 1000,
        getPhone: 5 * 1000,
        willLogin: 30 * 1000
    },

    xml2Json: new X2JS(),
    phoneBooks: {
        phoneBookGroup: [],
        phoneBookGroupWithContact: [],
        localAddressBook: [],
        ldap: [],
    },
    phoneBookDB: new self.DBmanager('phoneBookDB', "phoneBook", null, ["phoneBookName", "TS"]),
    getContentNumber: '',              // 网页拨号获取的号码

    incomingCallNotificationQueue: [],
    randomReqIdArray: [],

    // 通过插件收发演示流
    socket: null,                      // 处理收发演示的请求
    websocketStatus: 0,                // webSocket 连接状态:-1 异常关闭； 0 未连接， 1 连接成功， 2 正在重连
    localShare: false,                 // 表示当前本端是否开启共享，true表示本端开启共享，false表示本端未开启共享
    currentShareLineId: '',            // 表示当前线路id
    saveShareLineContent: [],          // 保存共享线路内容
    shareScreenPopupPort: '',
    openShareScreenTabId: '',          // 打开共享页面的 tabId
    shareTimer: null,                  // 共享通知定时器
    notificationId: null,              // 共享通知 id
    currentShareContent:{
        lineId: '',                    // 本端线路
        remoteLineId: '',              // 远端线路
        shareType: ''  ,               // 共享内容： 'shareScreen'、'shareFile'
        isEstablishSuccessPc: false,   // pc是否建立成功
        remoteCallInfo : ''            // 远端线路信息
    },
    peerInfoMessage: {                 // 接受消息体相关信息
        action: '',
        reqId: '',
        localLineId: '',
        sdp: '',
        remoteLineId: '',
        updateMessage: "",      // 更新的sdp内容
        infoMsg: "",            // 回复当前的状态信息
    },
    notifyEvent: {
        shareScreen: {
            title: '{0} 对你发起共享，请点击查看。',
            message: 'Click to receive present stream in tab'
        }
    },
    CODE_TYPE: {
        timeOut: {
            codeType: 486,
            message: "Desktop notification disappears,Time out",
        },
        rejectScreen: {
            codeType: 300,
            message: "The opposite side refuses to accept the screen",
        },
    },

    /**
     * gsApi init
     */
    createGsApiOrUpdateConfig: function () {
        let loginData = grpDialingApi.loginData
        if (!loginData || !loginData.url || !loginData.username || !loginData.password) {
            console.info("Invalid parameter for login")
            return
        }

        let config = {
            url: loginData.url,
            username: loginData.username,
            password: loginData.password,
            autoKeepAlive: false,
            onerror: grpDialingApi.onErrorCatchHandler
        }
        if (!grpDialingApi.gsApi) {
            console.info('create new gsApi')
            grpDialingApi.gsApi = new GsApi(config)
        } else {
            console.log('update gsApi config')
            grpDialingApi.gsApi.updateCfg(config)
        }
    },

    /**
     * 创建webSocket，主要用于接收ws主动推送和桌面共享
     */
    createWebSocket: function (callback ) {
        let url = grpDialingApi.loginData.url.split('//')
        let websocketUrl
        if (url[0] === 'http:') {
            websocketUrl = `ws://${url[1]}/websockify`
        } else if (url[0] === 'https:') {
            websocketUrl = `wss://${url[1]}/websockify`
        } else {
            console.log('websocketUrl error ' + grpDialingApi.loginData.url)
            return
        }
        if (!grpDialingApi.socket || (grpDialingApi.socket && (!grpDialingApi.socket.wsIsConnected() || grpDialingApi.socket.websocketUrl !== websocketUrl))) {
            if (grpDialingApi.socket) {
                console.log('clear before websocket first.')
                grpDialingApi.socket.wsCleanUp()
            }
            let protocol = 'gs-ws-addon'
            let socket = new WebRTCSocketInstance(websocketUrl, protocol, function (event) {
                console.log('create ws callback event：', event)
                if (event && event.code === 999) {
                    grpDialingApi.socket = socket
                    grpDialingApi.getAccountDialPlan()
                    grpDialingApi.getExtendedContacts()
                    grpDialingApi.cgiKeepAlive()
                    callback && callback({codeType: event.code})
                }

                if (grpDialingApi.popupPort){
                    event.status = grpDialingApi.websocketStatus
                    grpDialingApi.sendMessage2Popup({cmd: 'websocketStatus', data: event})
                }
            })
        }else {
            console.log('create webSocket: already connect.')
        }
    },

    socketOnClose: function (evt){
        let This = this
        if(This.openerPopupId > 0){
            console.log('popup page is opened')
            grpDialingApi.sendMessage2Popup({cmd: 'websocketStatus', data: { code: evt.code, status: evt.status }})
        }
    },

    /**
     * 错误处理
     * @param event
     */
    onErrorCatchHandler: function (event) {
        console.log('on error catch handler event:', event)
        if (event.target && event.target.readyState) {
            console.log('** An error occurred during the transaction, readyState,' + event.target.readyState + ' status ', event.target.status)
        } else {
            console.info('** An error occurred during the transaction, status ', event.status)
        }

        if (grpDialingApi.loginData && grpDialingApi.loginData.url && event.status === 401) {
            console.log('error occurred, check permission!')
            grpDialingApi.permissionCheck(grpDialingApi.loginData.url, function () {
                console.log("success!!!!!!!!!!")
                if(event.url.indexOf('api-make_call') !== -1 && !grpDialingApi.call401Authentication){
                    // 其他地方登录导致sid变化，需要重新登录
                    console.info('Authentication information is invalid, login again')
                    grpDialingApi.call401Authentication = true
                    grpDialingApi.accountLogin()
                }
            })
        } else {
            console.log('url empty.')
        }
    },

    /**
     * 由于lighttpd配置 长时间未收到cgi请求 会将webcgi进程给kill掉
     * 所以即使使用websocket连接 也需要定时发送cgi请求进行保活
     */
    cgiKeepAlive: function () {
        if (grpDialingApi.intervalList.willLogin) {
            clearInterval(grpDialingApi.intervalList.willLogin)
            grpDialingApi.intervalList.willLogin = null
        }
        grpDialingApi.intervalList.willLogin = setInterval(function () {
            grpDialingApi.permissionCheck(grpDialingApi.loginData.url)
        }, grpDialingApi.intervalTime.willLogin)
    },

    autoReLogin: function () {
        console.log('The login may have timed out')
        grpDialingApi.isLogin = false
        // 登出后重置图标状态
        grpDialingApi.setBrowserAction({
            color: DEFAULT_COLOR,
            iconPath: '../quicall/assets/logo.png'
        })
        // 修改登录状态
        grpDialingApi.sendMessage2Popup({
            cmd: 'loginStatus',
            grpClick2TalObj: grpDialingApi,
            data: { response: 'unauthorized' }
        })

        grpDialingApi.permissionCheck(grpDialingApi.loginData.url, grpDialingApi.accountLogin, 'loginStatus')
    },

    /**
     * 检查是否已授权访问grp host连接
     */
    permissionCheck: function (serverURL, actionCallback, returnCmd) {
        if (!serverURL) {
            return
        }
        serverURL = grpDialingApi.checkUrlFormat(serverURL)
        let requestRUL = serverURL + '/cgi-bin/api-will_login'

        // TODO: service_worker不支持直接使用 XMLHttpRequest 接口来进行网络请求，统一使用fetch
        let initOptions = {
            "method": "GET",
            "credentials": "include",
            "body": null,
            "referrer": serverURL,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "mode": "cors",
            "headers": {
                "accept": "application/json, text/plain, */*",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
            },
        }
        fetch(requestRUL, initOptions).then(function (response) {
            // console.log('fetch response:', response)
            if (!response.ok) {
                console.info('Network response was not OK')
                if (grpDialingApi.popupPort) {
                    grpDialingApi.sendMessage2Popup({
                        cmd: returnCmd,
                        grpClick2TalObj: grpDialingApi,
                        data: { response: 'failed' }
                    })
                }
                return
            }
            if (response.status === 200 && response.ok) {
                // console.info('connection authorized already.')
                grpDialingApi.permissionCheckRefuse = false
                actionCallback && actionCallback()
            }
        }).catch(function (error) {
            console.info("An error occurred during the transaction\r\n", error);
            if (grpDialingApi.popupPort) {
                grpDialingApi.sendMessage2Popup({
                    cmd: returnCmd,
                    grpClick2TalObj: grpDialingApi,
                    data: { response: 'failed' }
                })
            }
        })
    },

    /**
     * 登录
     */
    accountLogin: function () {
        try {
            if (!grpDialingApi.gsApi) {
                grpDialingApi.createGsApiOrUpdateConfig()
            }

            grpDialingApi.isLogin = false
            grpDialingApi.gsApi.login({
                onreturn: grpDialingApi.loginCallback,
                onerror: grpDialingApi.loginErrorCallback
            })
        } catch (e) {
            console.log('request error:\r\n', e)
            if (grpDialingApi.popupPort) {
                // 返回当前登录状态
                grpDialingApi.sendMessage2Popup({
                    cmd: 'loginStatus',
                    grpClick2TalObj: grpDialingApi,
                    data: {
                        response: e.name,
                        message: e.message
                    }
                })
            }
        }
    },

    loginErrorCallback: function (error) {
        console.log('login error: request ', error.url, ' get response status ', error.status)
        if (grpDialingApi.popupPort) {
            grpDialingApi.sendMessage2Popup({
                cmd: 'loginStatus',
                grpClick2TalObj: grpDialingApi,
                data: {
                    response: {
                        status: error.status,
                        url: error.url
                    },
                    body: error.body,
                }
            })
        }
    },

    loginCallback: function (event) {
        if (event.readyState === 4 || event.ok) {
            let response
            if (event.bodyInJsonFormat) {
                response = event.bodyInJsonFormat
            } else if (event.response) {
                response = JSON.parse(event.response)
            }
            if (response) {
                console.info('login response:' + response.response)
                if (event.status === 200 && response.response === 'success') {
                    grpDialingApi.sid = response.body.sid
                    grpDialingApi.isLogin = true

                    // 登录成功后更新图标状态
                    grpDialingApi.setBrowserAction({
                        color: '#27CA15',
                        iconPath: '../quicall/assets/logo.blue.png'
                    })

                    grpDialingApi.createWebSocket( )

                    if (grpDialingApi.popupPort) {
                        // 返回当前登录状态
                        grpDialingApi.sendMessage2Popup({
                            cmd: 'loginStatus',
                            grpClick2TalObj: grpDialingApi,
                            data: { response: 'success', body: response.body }
                        })

                        // // 说明：通过webSocket推送的功能可用后 这里将不再需要定时获取账号和线路状态！
                        // grpDialingApi.getAccounts()
                        // 获取线路的状态
                        // grpDialingApi.showLineStatus()
                        // 获取设备当前登录状态
                        grpDialingApi.getPhoneStatus()
                    }

                    if (grpDialingApi.call401Authentication || grpDialingApi.waitingCall) {
                        if (grpDialingApi.waitingCall) {
                            grpDialingApi.waitingCall = false
                        } else {
                            console.log('Call 401, re-authentication success')
                        }
                        grpDialingApi.extMakeCall({ phonenumber: grpDialingApi.remotenumber })
                    }
                } else if (grpDialingApi.popupPort) {
                    // 返回当前登录状态
                    grpDialingApi.sendMessage2Popup({
                        cmd: 'loginStatus',
                        grpClick2TalObj: grpDialingApi,
                        data: { response: response.response, body: response.body }
                    })
                }
            } else {
                console.info("login return response: ", event)
                if (grpDialingApi.call401Authentication) {
                    console.info('call failed')
                    grpDialingApi.call401Authentication = false
                }
            }
        }
    },

    /**
     * 呼叫回调
     * @param event
     */
    makeCallActionCallback: function (event) {
        if (event.readyState === 4 || event.ok) {
            // 200 不代表呼叫成功，只标示cgi请求的成功与否。实际状态需要实时获取线路状态才能知道
            console.info("make call return status code : " + event.status)
            if (event.status === 200) {
                if (grpDialingApi.call401Authentication) {
                    grpDialingApi.call401Authentication = false
                }

                let response
                if (event.bodyInJsonFormat) {
                    response = event.bodyInJsonFormat
                } else if (event.response) {
                    response = JSON.parse(event.response)
                }
                console.log('make call response:', response)
                if (response && response.response === 'error') {
                    if (grpDialingApi.popupPort) {
                        grpDialingApi.sendMessage2Popup({ cmd: 'makeCallCallback', data: response.body })
                    } else {
                        confirm(grpDialingApi.language['L1001'])
                    }
                }else if(response && response.response === 'success'){
                    if (grpDialingApi.popupPort) {
                        grpDialingApi.sendMessage2Popup({ cmd: 'makeCallCallback', data: response.body })
                    }
                }
            } else if (event.status === 401 && !grpDialingApi.call401Authentication) {
                // 其他地方登录导致sid变化，需要重新登录
                console.info('Authentication information is invalid, login again')
                grpDialingApi.call401Authentication = true
                grpDialingApi.accountLogin()
            } else {
                if (grpDialingApi.call401Authentication) {
                    grpDialingApi.call401Authentication = false
                }
            }
        }
    },

    /**
     * 呼叫指定号码
     * @param data
     */
    extMakeCall: function (data) {
        if (!data) {
            console.info('Invalid phoneNumber parameter to set for make call')
            return
        }

        grpDialingApi.remotenumber = data.phonenumber
        if (!grpDialingApi.gsApi) {
            console.log('[EXT] gsAPI not exist')
            grpDialingApi.waitingCall = true
            grpDialingApi.automaticLoginCheck(true) 	// login first
            return
        }

        // 1.呼叫前先检查连接是否授权
        grpDialingApi.permissionCheck(grpDialingApi.loginData.url, function () {
            // 2.每次呼叫前检查click to dial功能是否开启
            console.log('permissionCheck 成功，检查click to dial功能')
            grpDialingApi.clickToDialFeatureCheck(grpDialingApi.clickToDialActionCheckCallback, data)
        }, 'makeCallCallback')
    },

    /**
     * clickToDial 接口调用完成后的回调
     * @param enable
     * @param data
     */
    clickToDialActionCheckCallback: function (enable, data) {
        console.log('click to dial feature enable ', enable)
        if (enable !== false) {
            let accountId = data.accountId || parseInt(grpDialingApi.loginData.selectedAccountId)
            // TODO: 注意：呼叫时的account与账号ID不一致
            let account = accountId - 1
            let callData = {
                account: account,
                phonenumber: data.phonenumber,
                password: grpDialingApi.loginData.password,
                onreturn: grpDialingApi.makeCallActionCallback,
                onerror: grpDialingApi.onErrorCatchHandler
            }

            let accountActive = false
            if (grpDialingApi.loginData && grpDialingApi.loginData.accountLists && grpDialingApi.loginData.accountLists.length) {
                for (let i = 0; i < grpDialingApi.loginData.accountLists.length; i++) {
                    if (parseInt(grpDialingApi.loginData.accountLists[i].reg) === 1) {
                        accountActive = true
                        break
                    }
                }
            }

            // 判断是否存在已注册的账号
            if (accountActive) {
                console.info("gsApi call phone number " + callData.phonenumber)
                grpDialingApi.gsApi.makeCall(callData)
            } else {
                console.log('[EXT] no active account here:', grpDialingApi.loginData.accountLists)
                alert('Call failed: account not registered.')
            }
        } else {
            // 已开启或请求失败（失败时无法正常判断当前是否开启了click to dial功能，按正常呼叫处理，呼叫失败后再做提示）
        }
    },

    /**
     * 检查是否开启了 Click-To-Dial Feature 功能
     * @param actionCallback
     * @param data 登录数据
     */
    clickToDialFeatureCheck: function (actionCallback, data) {
        if (!grpDialingApi.gsApi) {
            return
        }

        let configGetCallBack = function (event) {
            // console.log('clickToDialFeatureCheck:', event)
            if (event.readyState === 4 || event.ok) {
                let response
                if (event.bodyInJsonFormat) {
                    response = event.bodyInJsonFormat
                } else if (event.response) {
                    response = JSON.parse(event.response)
                }
                if (event.status === 200 && response !== 'error') {
                    let configs = response.configs
                    if (configs && configs.length && configs[0].pvalue === '1561') {
                        console.log('Click-To-Dial Feature enable: ', configs[0].value)
                        if (configs[0].value === '1') {
                            actionCallback && actionCallback(true, data)  // 功能已经开启
                        } else {
                            console.info('Click-To-Dial Feature is not enabled')
                            if (grpDialingApi.popupPort) {
                                // alert() in background script seems to block the extension. https://bugzilla.mozilla.org/show_bug.cgi?id=1545513
                                grpDialingApi.sendMessage2Popup({ cmd: 'clickToDialDisabled', data: data })
                            } else {
                                // Isuuse: In firefox, background pages do not support the use of alert(),confirm() or prompt()
                                // service_worker not support the use of alert(),confirm() or prompt()
                            }
                        }
                    }
                } else {
                    console.log('config get response:', response)
                    actionCallback && actionCallback(response)
                }
            }
        }

        grpDialingApi.gsApi.configGet({
            pvalues: '1561',
            onreturn: configGetCallBack,
            onerror: grpDialingApi.onErrorCatchHandler
        })
    },

    /**
     * 更新配置
     * @param data
     */
    apiConfigUpdate: function (data) {
        if (!data || !grpDialingApi.gsApi) {
            return
        }
        let actionCallback = data.callback
        let configUpdateCallBack = function (event) {
            if (event.readyState === 4 || event.ok) {
                if (event.status === 200) {
                    let response
                    if (event.bodyInJsonFormat) {
                        response = event.bodyInJsonFormat
                    } else if (event.response) {
                        response = JSON.parse(event.response)
                    }
                    if (response && response.body && response.body.status === 'right') {
                        console.info('config update success')
                        actionCallback && actionCallback(true)
                    } else {
                        console.info('config update failed: ', response.body.status)
                        actionCallback && actionCallback(false)
                    }
                } else {
                    console.log('config update failed, code: ', event.status)
                    actionCallback && actionCallback(false)
                }
            }
        }

        grpDialingApi.gsApi.configUpdate({
            body: { alias: {}, pvalue: { '1561': "1" }, },  // 开启点击拨打功能
            onreturn: configUpdateCallBack,
            onerror: grpDialingApi.onErrorCatchHandler
        })
    },

    /**
     * 获取激活的账号列表
     */
    getAccounts: function (popupOpen) {
        if (!grpDialingApi.loginData || !grpDialingApi.loginData.url) {
            return
        }

        let getAccountsCallback = function (event) {
            if ((event.readyState === 4 && event.status === 200) || event.ok) {
                let responseRes
                if (event.response) {
                    responseRes = JSON.parse(event.response)
                } else if (event.bodyInJsonFormat) {
                    responseRes = event.bodyInJsonFormat
                }

                if (responseRes && responseRes.response === "success") {
                    if (responseRes.body.length) {
                        grpDialingApi.loginData.accountLists = responseRes.body
                        grpDialingApi.sendMessage2Popup({ cmd: 'updateAccountLists', accountLists: responseRes.body })
                    } else {
                        console.info('account []')
                    }
                }
            } else if (event.status === 401) {
                console.info('get account unauthorized')
                grpDialingApi.sendMessage2Popup({
                    cmd: 'loginStatus',
                    grpClick2TalObj: grpDialingApi,
                    data: { response: 'unauthorized' }
                })
            }
        }

        if (popupOpen) {
            grpDialingApi.clearAccountsStatusInterval()
            grpDialingApi.intervalList.getAccounts = setInterval(function () {
                grpDialingApi.gsApi.getLineStatus({
                    onreturn: getAccountsCallback,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
            }, grpDialingApi.intervalTime.getAccounts)
        } else {
            grpDialingApi.gsApi.getAccounts({
                onreturn: getAccountsCallback,
                onerror: grpDialingApi.onErrorCatchHandler
            })
        }
    },

    /**
     * 获取设备当前登录状态
     */
    getPhoneStatus: function () {
        if (!grpDialingApi.gsApi) {
            return
        }
        let getPhoneStatusCallback = function (event) {
            if ((event.readyState === 4 || event.ok) && (event.response || event.bodyInJsonFormat)) {
                let data
                if (event.bodyInJsonFormat) {
                    data = event.bodyInJsonFormat
                } else if (event.response) {
                    data = JSON.parse(event.response)
                }
                if (data && data.body === 'unauthorized') {  // 登录鉴权失败
                    console.log('login authentication failed')
                    grpDialingApi.isLogin = false

                    // 登出后重置图标状态
                    grpDialingApi.setBrowserAction({
                        color: DEFAULT_COLOR,
                        iconPath: '../quicall/assets/logo.png'
                    })
                    // 鉴权过期，或抢占下线
                    grpDialingApi.clearPhoneStatusInterval()
                    // 修改登录状态
                    grpDialingApi.sendMessage2Popup({
                        cmd: 'loginStatus',
                        grpClick2TalObj: grpDialingApi,
                        data: { response: 'unauthorized' }
                    })

                    if(grpDialingApi.socket){
                        console.log('get phone status authentication failed, clear webSocket')
                        grpDialingApi.socket.wsCleanUp()
                    }
                }
            }
        }

        grpDialingApi.clearPhoneStatusInterval()
        grpDialingApi.intervalList.getPhone = setInterval(function () {
            grpDialingApi.gsApi.getPhoneStatus({
                onreturn: getPhoneStatusCallback,
                onerror: grpDialingApi.onErrorCatchHandler
            })
        }, grpDialingApi.intervalTime.getPhone)
    },

    /**
     * 获取线路信息
     */
    showLineStatus: function (popupOpen) {
        if (!grpDialingApi.gsApi) {
            return
        }
        let lineStatusCallback = function (event) {
            if ((event.readyState === 4 && event.status === 200) || event.ok) {
                let responseRes
                if (event.bodyInJsonFormat) {
                    responseRes = event.bodyInJsonFormat
                } else if (event.responseText) {
                    responseRes = JSON.parse(event.responseText)
                }

                if (responseRes && responseRes.response === "success") {
                    if (responseRes.body && responseRes.body.length) {
                        grpDialingApi.sendMessage2Popup({ cmd: 'setLineStatus', lines: responseRes.body })
                    }
                }
            } else if (event.status === 401) {
                grpDialingApi.isLogin = false
                // 登出后重置图标状态
                grpDialingApi.setBrowserAction({
                    color: DEFAULT_COLOR,
                    iconPath: '../quicall/assets/logo.png'
                })
                // 鉴权过期
                grpDialingApi.clearLineStatusInterval()
                // 修改登录状态
                grpDialingApi.sendMessage2Popup({
                    cmd: 'loginStatus',
                    grpClick2TalObj: grpDialingApi,
                    data: { response: 'unauthorized' }
                })

                if(grpDialingApi.socket){
                    console.log('get line status authentication failed, clear webSocket')
                    grpDialingApi.socket.wsCleanUp()
                }
            }
        }

        if (popupOpen) {
            grpDialingApi.clearLineStatusInterval()
            grpDialingApi.intervalList.getLine = setInterval(function () {
                grpDialingApi.gsApi.getLineStatus({
                    onreturn: lineStatusCallback,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
            }, grpDialingApi.intervalTime.getLine)
        } else {
            grpDialingApi.gsApi.getLineStatus({
                onreturn: lineStatusCallback,
                onerror: grpDialingApi.onErrorCatchHandler
            })
        }
    },

    /**
     * 清除获取线路状态的定时器
     */
    clearAccountsStatusInterval: function () {
        if (grpDialingApi.intervalList.getAccounts) {
            clearInterval(grpDialingApi.intervalList.getAccounts)
            grpDialingApi.intervalList.getAccounts = null
        }
    },

    /**
     * 清除获取线路状态的定时器
     */
    clearLineStatusInterval: function () {
        if (grpDialingApi.intervalList.getLine) {
            clearInterval(grpDialingApi.intervalList.getLine)
            grpDialingApi.intervalList.getLine = null
        }
    },

    /**
     * 清除获取设备当前登录状态的定时器
     */
    clearPhoneStatusInterval: function () {
        if (grpDialingApi.intervalList.getPhone) {
            clearInterval(grpDialingApi.intervalList.getPhone)
            grpDialingApi.intervalList.getPhone = null
        }
    },

    /**
     * 清除保活定时器
     */
    clearApiKeepAliveInterval: function () {
        if (grpDialingApi.gsApi && grpDialingApi.gsApi.stopKeepAlive) {
            grpDialingApi.gsApi.stopKeepAlive({
                onerror: grpDialingApi.onErrorCatchHandler
            })
        }
    },

    /**
     * 更新登录信息
     * @param data
     */
    updateCallCfg: function (data) {
        console.log('update call data: \r\n' + JSON.stringify(data, null, '    '))
        if (!data) {
            console.info('Invalid parameter to set update')
            return
        }
        let isServerChange = false
        let isLoginDataChange = false
        /* update save config and check info change or not */
        Object.keys(data).forEach(function (key) {
            if (key === 'url') {
                data[key] = grpDialingApi.checkUrlFormat(data[key])
                if (data[key] !== grpDialingApi.loginData.url) {
                    isServerChange = true
                    console.log('[EXT] clear the selected account information when switching devices to log in.')
                    grpDialingApi.loginData.selectedAccountId = ''  // 切换设备时，清除选择的账号信息
                }
            } else if ((key === 'username' || key === 'password') && data[key] !== grpDialingApi.loginData[key]) {
                isLoginDataChange = true
            }
            grpDialingApi.loginData[key] = data[key]
        })

        let copyLoginData = grpDialingApi.objectDeepClone(grpDialingApi.loginData)
        grpDialingApi.extensionNamespace.storage.local.set({ 'XNewestData': copyLoginData }, function () {
            console.log('set XNewestData success.');
        });

        // update gsApi config
        grpDialingApi.createGsApiOrUpdateConfig()

        if (isServerChange) {
            console.info("Recheck permission of : " + data.url)
            console.log('clear accountLists')
            grpDialingApi.loginData.accountLists = []
            // 恢复默认值
            grpDialingApi.keepUserInfo = true
            grpDialingApi.contactSearchFrom = {
                ldap: true,
                localAddressBook: true
            }
            grpDialingApi.wordDialingEnabled = true
            if(grpDialingApi.popupPort){
                grpDialingApi.sendMessage2Popup({ cmd: 'updateAccountLists', accountLists: grpDialingApi.loginData.accountLists })
            }
            grpDialingApi.permissionCheck(data.url, grpDialingApi.accountLogin, 'loginStatus')
        } else if (isLoginDataChange || !grpDialingApi.isLogin) {
            console.log('username/password change or logout..')
            grpDialingApi.accountLogin()
        }
    },

    /**
     * 符合条件时自动登录
     */
    automaticLoginCheck: function (showAlert) {
        let loginDatas = grpDialingApi.loginData
        if (loginDatas && loginDatas.url && loginDatas.username && loginDatas.password) {
            console.info('check permission before auto login')
            grpDialingApi.permissionCheck(loginDatas.url, grpDialingApi.accountLogin, 'loginStatus')
        } else if (showAlert) {
            grpDialingApi.waitingCall = false
            alert('Please login on the GRP Click2Dial page first')
        }
    },

    /**
     * Http 转换为Https
     * @param url
     * @returns {string}
     */
    checkUrlFormat: function (url) {
        if (url.substr(0, 7) !== "http://" && url.substr(0, 8) !== "https://" && url.indexOf('addon') === -1) {
            url = "http://" + url + '/addon';
        } else if(url.substr(0, 7) === "http://" && url.indexOf('addon') === -1){
            url = url + '/addon';
        }else if(url.substr(0, 8) === "https://" && url.indexOf('addons') === -1){ // addons是针对https登录
            url = url + '/addons';
        }
        return url
    },

    /***
     * Function that deep clone an object.
     * @param obj
     * @returns {*}
     */
    objectDeepClone: function (obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj
        }

        let copy = function (data) {
            let copy = data.constructor()
            for (let attr in data) {
                if (data.hasOwnProperty(attr)) {
                    copy[attr] = data[attr]
                }
            }
            return copy
        }

        if (typeof obj === 'object' && !Array.isArray(obj)) {
            try {
                return JSON.parse(JSON.stringify(obj))
            } catch (err) {
                return copy(obj)
            }
        }

        return copy(obj)
    },

    isObjectXExactlyEqualToY: function (x, y) {
        let i, l, leftChain, rightChain

        function compare2Objects(x, y) {
            let p

            // remember that NaN === NaN returns false
            // and isNaN(undefined) returns true
            if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
                return true
            }

            // Compare primitives and functions.
            // Check if both arguments link to the same object.
            // Especially useful on the step where we compare prototypes
            if (x === y) {
                return true
            }

            // Works in case when functions are created in constructor.
            // Comparing dates is a common scenario. Another built-ins?
            // We can even handle functions passed across iframes
            if ((typeof x === 'function' && typeof y === 'function') ||
                (x instanceof Date && y instanceof Date) ||
                (x instanceof RegExp && y instanceof RegExp) ||
                (x instanceof String && y instanceof String) ||
                (x instanceof Number && y instanceof Number)) {
                return x.toString() === y.toString()
            }

            // At last checking prototypes as good as we can
            if (!(x instanceof Object && y instanceof Object)) {
                return false
            }

            if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
                return false
            }

            if (x.constructor !== y.constructor) {
                return false
            }

            if (x.prototype !== y.prototype) {
                return false
            }

            // Check for infinitive linking loops
            if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
                return false
            }

            // Quick checking of one object being a subset of another.
            // todo: cache the structure of arguments[0] for performance
            for (p in y) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false
                } else if (typeof y[p] !== typeof x[p]) {
                    return false
                }
            }

            for (p in x) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false
                } else if (typeof y[p] !== typeof x[p]) {
                    return false
                }

                switch (typeof (x[p])) {
                    case 'object':
                    case 'function':

                        leftChain.push(x)
                        rightChain.push(y)

                        if (!compare2Objects(x[p], y[p])) {
                            return false
                        }

                        leftChain.pop()
                        rightChain.pop()
                        break

                    default:
                        if (x[p] !== y[p]) {
                            return false
                        }
                        break
                }
            }

            return true
        }

        if (arguments.length < 1) {
            console.log('Need two or more arguments to compare')
            return true
        }

        for (i = 1, l = arguments.length; i < l; i++) {
            leftChain = []
            rightChain = []

            if (!compare2Objects(arguments[0], arguments[i])) {
                return false
            }
        }

        return true
    },

    /**
     * 本地联系人根据群组分组情况分出群组列表
     * @param pbgroup  群组列表  （数组格式）
     * @param localAddressBook  本地联系人列表
     * @returns {{}}  分组后的群组列表（对象格式）
     */
    contactGrouping: function (pbgroup, localAddressBook) {
        if (!pbgroup || !localAddressBook) {
            console.log('pbgroup or localAddressBook can not be empty!')
            return {}
        }

        // 群组分组
        let arrToObject = function (arr) {
            let obj = {}
            arr.forEach(function (item) {
                if (!obj[item.id]) {
                    obj[item.id] = item
                    item.memberList = []   // 存在本群组的联系人列表
                } else {
                    // 群组 ID 不能重复
                }
            })
            return obj
        }
        // 将数组格式的群组转换为对象格式
        let groupWithContact = arrToObject(pbgroup)

        // 遍历本地通讯录，根据群组分组情况给联系人归类
        localAddressBook.forEach(function (con) {
            if ('Group' in con) {
                if (Array.isArray(con.Group)) {
                    // 联系人存在多个分组中
                    con.Group.forEach(function (group) {
                        if (groupWithContact[group]) {
                            groupWithContact[group].memberList.push(con)
                        }
                    })
                } else {
                    if (groupWithContact[con.Group]) {
                        groupWithContact[con.Group].memberList.push(con)
                    }
                }
            } else {
                // 联系人未存在任何分组
            }
        })
        console.log('分组后的联系人列表：', groupWithContact)

        grpDialingApi.phoneBooks.phoneBookGroupWithContact = groupWithContact
        grpDialingApi.phoneBookDB.setItems([{
            phoneBookName: 'phoneBookGroupWithContact',
            content: groupWithContact,
            TS: (new Date()).getTime(),
            deviceId: grpDialingApi.loginData.url.split('//')[1]
        }]);
    },

    /**
     * 2.获取GRP本地通讯录
     */
    getLocalPhoneBook: function () {
        console.log('get local phone book ', grpDialingApi.isLogin)
        if (!grpDialingApi.gsApi || !grpDialingApi.isLogin) {
            return
        }

        // 2.获取GRP本地联系人(兼容GRP261X)
        console.log('获取GRP本地联系人(兼容GRP261X)')
        let getAddressBookCallback = function (event) {
            if (event.readyState === 4 || event.ok) {
                if (event.status === 200 && event.statusText === 'OK') {
                    let responseData
                    let response = event.bodyInJsonFormat || event.response
                    if (response && response.startsWith('<?xml')) {
                        console.log('GET LOCAL ADDRESS BOOK SUCCESS')
                        responseData = grpDialingApi.xml2Json.xml_str2json(response)

                        let localAddressBook = []
                        let pbgroup = []
                        if (responseData && responseData.AddressBook) {
                            // 联系人
                            if (responseData.AddressBook.Contact) {
                                if (responseData.AddressBook.Contact.length) {
                                    localAddressBook = responseData.AddressBook.Contact
                                } else if (Object.prototype.toString.call(responseData.AddressBook.Contact) === '[object Object]') {
                                    // Todo: 只有一个联系人时，xml_str2json解析后返回的数据格式为Object
                                    localAddressBook[0] = responseData.AddressBook.Contact
                                }
                            }

                            // 群组
                            if (responseData.AddressBook.pbgroup) {
                                if (responseData.AddressBook.pbgroup.length) {
                                    pbgroup = responseData.AddressBook.pbgroup
                                } else if (Object.prototype.toString.call(responseData.AddressBook.pbgroup) === '[object Object]') {
                                    // Todo: 只有一个联系人时，xml_str2json解析后返回的数据格式为Object
                                    pbgroup[0] = responseData.AddressBook.pbgroup
                                }
                            }
                        }

                        if (localAddressBook && localAddressBook.length) {
                            grpDialingApi.phoneBooks.localAddressBook = localAddressBook
                        } else {
                            console.log('未获取到本地通讯录数据:', responseData)
                            grpDialingApi.phoneBooks.localAddressBook = []
                        }

                        if (pbgroup && pbgroup.length) {
                            grpDialingApi.phoneBooks.phoneBookGroup = pbgroup
                            grpDialingApi.phoneBookDB.setItems([{
                                phoneBookName: 'phoneBookGroup',
                                content: grpDialingApi.phoneBooks.phoneBookGroup,
                                TS: (new Date()).getTime(),
                                deviceId: grpDialingApi.loginData.url.split('//')[1]
                            }]);

                            // 联系人分组
                            if (localAddressBook && localAddressBook.length) {
                                grpDialingApi.contactGrouping(pbgroup, localAddressBook)
                            }
                        } else {
                            console.log('未获取到群组信息')
                        }

                        grpDialingApi.phoneBookDB.setItems([{
                            phoneBookName: 'localAddressBook',
                            content: grpDialingApi.phoneBooks.localAddressBook,
                            TS: (new Date()).getTime(),
                            deviceId: grpDialingApi.loginData.url.split('//')[1]
                        }]);

                        grpDialingApi.extensionNamespace.storage.local.set({ 'phoneBooks': JSON.stringify(grpDialingApi.phoneBooks) }, function () {
                            console.log('save phoneBooks success')
                        });
                    }
                } else {
                    console.log('GET AddressBook FAILED, ', event.status)
                }
            }
        }

        grpDialingApi.gsApi.phonebookDownload({
            onreturn: getAddressBookCallback,
            onerror: function (event) {
                console.log('errorCallback', event)
            }
        })
    },

    /**
     * * 获取LDAP扩展联系人
     * 1.杭州分公司通讯录
     [{
     dialAccount: 1,
     ou=hz,dc=pbx,dc=com: {AccountNumber: "3593", CallerIDName: "chrou", email: "chrou@grandstream.cn"}
     }]
     */
    getLdap: function (requestData) {
        if (!grpDialingApi.gsApi || !grpDialingApi.isLogin) {
            return
        }

        let ldapSearchParam = grpDialingApi.getLdapSearchParam(requestData)
        let getLdapCallback = function (event) {
            if (event.readyState === 4 || event.ok) {
                if (event.status === 200 && event.statusText === 'OK') {
                    let responseData
                    console.log('GET LDAP SUCCESS')
                    let ldapList = []
                    if (event.bodyInJsonFormat) {
                        responseData = event.bodyInJsonFormat
                    } else if (event.response) {
                        responseData = JSON.parse(event.response)
                    }
                    Object.keys(responseData).forEach(function (key) {
                        let accountList = responseData[key]
                        if (accountList && accountList.length) {   // 可能存在多个电话本
                            ldapList = ldapList.concat(accountList)
                        }
                    })

                    if (ldapList.length && ldapList[0] !== 'timeout' && ldapList[0] !== 'param error') {
                        grpDialingApi.phoneBooks.ldap = ldapList
                    } else {
                        grpDialingApi.phoneBooks.ldap = []
                        console.log('未获取到ldap数据:', ldapList)
                    }
                } else {
                    console.log('GET LDAP FAILED, ', event.status)
                    grpDialingApi.phoneBooks.ldap = []
                }

                grpDialingApi.phoneBookDB.setItems([{
                    phoneBookName: 'ldap',
                    content: grpDialingApi.phoneBooks.ldap,
                    TS: (new Date()).getTime(),
                    ldapParam: ldapSearchParam
                }]);

                // 重新获取联系人后更新联系人列表
                grpDialingApi.extensionNamespace.storage.local.set({ 'phoneBooks': JSON.stringify(grpDialingApi.phoneBooks) }, function () {
                    console.log('save phoneBooks success')
                });
            }
        }

        grpDialingApi.gsApi.ldapSearch({
            body: {
                ldapParam: ldapSearchParam
            },
            contentType: 'application/json',
            onreturn: getLdapCallback,
            onerror: function (event) {
                console.log('errorCallback', event)
            }
        })
    },

    /**
     * 获取账号的拨号规则
     */
    getAccountDialPlan: function () {
        console.log('get account dial plan')
        let requestURL = grpDialingApi.loginData?.url + '/cgi-bin/api-dialplan_regex'
        let handleRegulars = function (regulars) {
            let index = grpDialingApi.loginData.selectedAccountId - 1
            if (regulars && regulars.length && regulars[index] && regulars[index].regex && regulars[index].regex.length) {
                grpDialingApi.dialplanregulars = regulars
                grpDialingApi.extensionNamespace.storage.local.set({ 'dialplanregulars': regulars[index].regex })
            } else {
                console.log('get dial plan regulars:', regulars)
            }
        }

        let initOptions = {
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        }
        fetch(requestURL, initOptions).then(function (response) {
            if (response.ok && response.status === 200) {
                return response.json()
            } else {
                return null
            }
        }).then(function (responseBody) {
            if (responseBody) {
                if (responseBody.response === "success") {
                    handleRegulars(responseBody.result.regex)
                }
            } else {
            }
        }).catch(function (error) {
            console.error('get DialPlan error:', error)
        })
    },

    /**
     * 获取所有通讯录信息
     */
    getExtendedContacts: function () {
        console.log('get extended contacts.')
        if (!grpDialingApi.gsApi) {
            console.log('no login, can not authorized')
            return
        }

        // let actionCallback = function (params){
        // 	if(params.isAddressBookNeedUpdated){
        // 		grpDialingApi.getLocalPhoneBook()
        // 	}else {
        // 		console.log('no need update local phone book')
        // 	}
        //
        // 	if(params.isLdapNeedUpdated){
        // 		grpDialingApi.getLdap()
        // 	}else {
        // 		console.log('no need update ldap')
        // 	}
        // }
        //
        // // 先获取当前数据，判断是否需要更新
        // grpDialingApi.getPhoneBookFromDB({
        // 	callback: actionCallback
        // })


        // 不做判断，每次登录成功后重新获取ldap数据
        grpDialingApi.getLocalPhoneBook()
        grpDialingApi.getLdap()
    },

    getLdapSearchParam: function (requestData) {
        let returnKey = ''
        Object.keys(grpDialingApi.loginData).forEach(function (key) {
            if (grpDialingApi.ldapKeys.includes(key)) {
                if (!returnKey) {
                    returnKey = grpDialingApi.loginData[key]
                } else {
                    returnKey = returnKey + ',' + grpDialingApi.loginData[key]
                }
            }
        })

        return {
            searchWord: requestData?.searchWord || "",
            searchKey: requestData?.searchKey || "",
            returnKey: returnKey || "email,CallerIDName,AccountNumber,MobileNumber,HomeNumber",
            returnLimit: requestData?.limit || 0
        }
    },

    getPhoneBookFromDB: function (data = {}) {
        if (!grpDialingApi.phoneBookDB) {
            return
        }

        grpDialingApi.phoneBookDB.getAllItems(function (storeInfos = []) {
            let isAddressBookNeedUpdated = true
            let isLdapNeedUpdated = true
            let dayTimeStamp = 1000 * 60 * 60 * 24 * 7;   // 每7天更新一次信息
            if (storeInfos.length) {
                console.log('wave extended contacts', storeInfos)
                for (let i = 0; i < storeInfos.length; i++) {
                    let name = storeInfos[i].phoneBookName
                    grpDialingApi.phoneBooks[name] = storeInfos[i].content
                    let diffValue = new Date().getTime() - storeInfos[i].TS; //时间差
                    let currentDeviceId = grpDialingApi.loginData.url.split('//')[1]
                    if (name === 'localAddressBook' && storeInfos.deviceId === currentDeviceId && (diffValue <= dayTimeStamp)) {
                        isAddressBookNeedUpdated = false
                    } else if (name === 'ldap' && diffValue <= dayTimeStamp) {
                        isLdapNeedUpdated = false
                    }
                }
            }

            if (data.callback) {
                data.callback({
                    isAddressBookNeedUpdated: isAddressBookNeedUpdated,
                    isLdapNeedUpdated: isLdapNeedUpdated,
                })
            }
        })
    },

    /**
     * 用户数据管理，是否要清除设备信息，登录账号密码，以及ldap数据
     */
    userInfoManagement: function () {
        let clearData = function () {
            // 清除数据库
            grpDialingApi.phoneBookDB?.clear()

            // 登录信息恢复初始值
            grpDialingApi.loginData = {
                selectedAccountId: '',
                accountLists: [],
                password: "",
                url: "",
                username: "",
                // ldapConfig
                emailAttributes: 'email',
                nameAttributes: 'CallerIDName',
                numberAttributes: 'AccountNumber,MobileNumber,HomeNumber'
            }
            grpDialingApi.phoneBooks.ldap = []
            grpDialingApi.isLogin = false
            // 恢复默认值
            grpDialingApi.keepUserInfo = true
            grpDialingApi.contactSearchFrom = {
                ldap: true,
                localAddressBook: true
            }
            grpDialingApi.wordDialingEnabled = true
        }

        grpDialingApi.extensionNamespace.storage.local.get('keepUserInfo', function (obj) {
            if (obj.keepUserInfo !== 'true' && obj.keepUserInfo !== true) {
                // 清除用户数据
                clearData()
                grpDialingApi.extensionNamespace.storage.local.clear(function () {
                    console.log('local storage clear success.')
                })
            }
        });
    },

    /*****************************************************************************************************************/
    /*************************************************插件间通信********************************************************/
    /*****************************************************************************************************************/
    /**
     * Chrome插件中有2种通信方式，
     * 一个是短连接（chrome.tabs.sendMessage和chrome.runtime.sendMessage），
     * 一个是长连接（chrome.tabs.connect和chrome.runtime.connect）
     * 发送消息给content script
     * background.js 向 content 主动发送消息
     * @param message
     * @param callback
     */
    sendMessageToContentScript: function (message, callback) {
        if (grpDialingApi.extensionNamespace) {
            if (grpDialingApi.extensionNamespace.tabs && grpDialingApi.extensionNamespace.tabs.query) {
                grpDialingApi.extensionNamespace.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (tabs && tabs.length) {
                        message.requestType = 'backgroundMessage2ContentScript'
                        grpDialingApi.extensionNamespace.tabs.sendMessage(tabs[0].id, message, function (response) {
                            if (!grpDialingApi.extensionNamespace.runtime.lastError) {
                                // message processing code goes here
                                if (callback) {
                                    callback(response)
                                }
                            } else {
                                console.log(`Error: ${grpDialingApi.extensionNamespace.runtime.lastError.message}`);
                                // error handling code goes here
                            }
                        });
                    }
                });
            }
        } else {
            console.log('unknown tab type')
        }
    },

    /**
     * 处理来自content-script的消息
     * @param request
     */
    chromeRuntimeOnMessage: function (request, sendResponse) {
        switch (request.cmd) {
            case 'contentScriptMakeCall':
                console.info("contentScriptMakeCall extension make call data:", request.data)
                grpDialingApi.extMakeCall(request.data)
                break;
            case 'configureQuery':  // 配置查询
                if(sendResponse){
                    sendResponse({
                        contactSearchFrom: grpDialingApi.contactSearchFrom,
                        wordDialing: grpDialingApi.wordDialingEnabled
                    });
                }
                break
            default:
                break
        }
    },

    /**
     * 监听 popup 传递来的消息
     * @param port
     */
    runTimeOnConnect: function (port) {
        console.log('runTime Connect port:', port)
        if (port.name === 'popup') {
            grpDialingApi.popupPort = port
            port.onMessage.addListener(request => {
                if (request && request.requestType === 'popupMessage2Background') {
                    grpDialingApi.revPopupMessage(request, port)
                }
            })

            port.onDisconnect.addListener(function () {
                console.log('onDisconnect, clear popup port and interval')
                grpDialingApi.popupPort = null

                if(!grpDialingApi.isLogin) {
                    // 清除获取线路状态的定时器
                    grpDialingApi.clearLineStatusInterval()
                    // 清除获取设备状态的定时器
                    grpDialingApi.clearPhoneStatusInterval()
                    // 清除gs API保活定时器
                    grpDialingApi.clearApiKeepAliveInterval()

                    grpDialingApi.userInfoManagement()
                }
            })
        } else if (port.name === 'shareScreen') {
            console.log('save screen share popup port.')
            grpDialingApi.shareScreenPopupPort = port
            port.onMessage.addListener(request => {
                if (request && request.requestType === 'shareScreenToBackground') {
                    grpDialingApi.receiveShareScreenMessage(request, port)
                }
            })

            port.onDisconnect.addListener(function () {
                console.log('onDisconnect, clear screenShare popupPort interval')
                grpDialingApi.shareScreenPopupPort = null
            })
        }
    },

    /**
     * 给popup发送消息
     * @param data
     */
    sendMessage2Popup: function (data) {
        if (grpDialingApi.popupPort) {
            data = JSON.stringify(data)   // 不转换为字符串格式，firefox无法成功发送消息
            grpDialingApi.popupPort.postMessage(data)
        } else {
            console.log('popup port not exist!')
        }
    },

    /**
     * 处理popup open 事件
     */
    handlePopupOpen: function (request){
        // popup 页面打开
        // 返回当前的配置信息
        console.log('islogin ', grpDialingApi.isLogin)
        grpDialingApi.createGsApiOrUpdateConfig()

        if (grpDialingApi.popupPort) {
            grpDialingApi.sendMessage2Popup({
                cmd: 'popupShowConfig',
                grpClick2TalObj: grpDialingApi
            })
        }

        if (!grpDialingApi.isLogin) {
            if (grpDialingApi.permissionCheckRefuse) {
                console.log('[EXT] already refuse permission check, do not auto login when popup open')
                return;
            }
            // server/username/password字段都有时，popup打开时自动登录
            grpDialingApi.automaticLoginCheck()
        } else {
            // 获取线路的状态
            // grpDialingApi.showLineStatus()
            // 获取设备当前登录状态
            grpDialingApi.getPhoneStatus()

            console.log('websocket status:', grpDialingApi.websocketStatus)
            if(grpDialingApi.websocketStatus){
                grpDialingApi.sendMessage2Popup({cmd: 'websocketStatus', data: {status: grpDialingApi.websocketStatus}})
            }
        }

        if (request.screen) {
            grpDialingApi.screen = request.screen
            grpDialingApi.extensionNamespace.storage.local.set({ 'screen': request.screen })
        }
        if(request.language){
            grpDialingApi.language = request.language
            grpDialingApi.extensionNamespace.storage.local.set({ 'language': grpDialingApi.language }, function(){
                console.log("set language success")
            })
        }
        if(grpDialingApi.lineData){
            grpDialingApi.sendMessage2Popup({cmd: 'setLineStatus', lines: grpDialingApi.lineData})
        }
    },

    /**
     * 登出时清除相关数据
     */
    logoutProcess: function (){
        grpDialingApi.clearLineStatusInterval()
        grpDialingApi.clearPhoneStatusInterval()
        grpDialingApi.gsApi.dologout()
        grpDialingApi.isLogin = false
        grpDialingApi.lineData = null
        grpDialingApi.websocketStatus = 0

        grpDialingApi.userInfoManagement()
        if(grpDialingApi.socket){
            console.log('clear websocket for logout')
            grpDialingApi.socket.wsCleanUp()
        }

        // 登出后重置图标状态
        grpDialingApi.setBrowserAction({
            color: DEFAULT_COLOR,
            iconPath: '../quicall/assets/logo.png'
        })
    },

    /** 接受演示
     * */
    receiveScreen: function(type){
        console.log("receiveScreen type:", type + ", Is the current shared page being shared :", grpDialingApi.currentShareContent?.isEstablishSuccessPc)

        if(grpDialingApi.currentShareContent.isEstablishSuccessPc){         //接受共享之前，判断当前是否存在共享，若存在，则先关闭pc再创建；否则直接打开共享页面；
            grpDialingApi.sendMessage2ShareScreen({type: 'closeShareWindow' })
            setTimeout(function(){
                grpDialingApi.openPopup("../shareScreen/shareScreen.html", "shareScreen");
            },2000)
        }else{
            grpDialingApi.openPopup("../shareScreen/shareScreen.html", "shareScreen");
        }
    },

    /** 拒绝演示或共享或者倒计时结束
     * */
    rejectScreen: function (type, message = {}) {
        console.log("current reject type:" + type);
        clearTimeout(grpDialingApi.shareTimer);

        // 首先区分当前是否存在pc：若没有pc 则是首次拒绝；
        // 若有pc则是分两种情况，一种是当前确定开启新的演示，被拒绝； 另外一种是之前的pc, 更换开启演示者（第二种目前已经不存在）

        console.log("The length of the current shared line is :", grpDialingApi.saveShareLineContent.length)
        if (!grpDialingApi.shareScreenPopupPort || grpDialingApi.saveShareLineContent.length) {
            // pc没有建立成功 或者开启新的共享，用户拒绝或者延时
            let rspCode
            let rspMsg
            if (type === "rejectScreen") {
                rspCode = grpDialingApi.CODE_TYPE.rejectScreen.codeType
                rspMsg = grpDialingApi.CODE_TYPE.rejectScreen.message
                grpDialingApi.deleteScreenLine(grpDialingApi.currentShareContent.lineId)
            } else if (type === "sharePopupTimeOut") {
                rspCode =  grpDialingApi.CODE_TYPE.timeOut.codeType
                rspMsg = grpDialingApi.CODE_TYPE.timeOut.message
            }
            let data = {
                createMediaSessionRet:{
                    line: message.localLineId || grpDialingApi.peerInfoMessage.localLineId,
                    reqId: message.reqId || grpDialingApi.peerInfoMessage.reqId,
                    action: message.action || grpDialingApi.peerInfoMessage.action,
                    shareType: message.shareType || grpDialingApi.peerInfoMessage.shareType,
                    rspInfo: {
                        rspCode: rspCode,
                        rspMsg:rspMsg
                    }
                },
                local_line: message.localLineId || grpDialingApi.peerInfoMessage.localLineId
            }
            // 清除接受共享端的相关内容
            if(grpDialingApi.currentShareContent?.lineId){
                grpDialingApi.deleteScreenLine(grpDialingApi.currentShareContent.lineId)
                grpDialingApi.clearPeerInfoMessage(true);
            }
            grpDialingApi.socket && grpDialingApi.socket.sendMessage(data)

        } else {
            console.log("Determine whether there is an update currently ? ", !!grpDialingApi.peerInfoMessage?.updateMessage);

            // pc建立成功，用户拒绝或者延时
            if ( grpDialingApi.peerInfoMessage && grpDialingApi.peerInfoMessage.updateMessage ) {
                if ( grpDialingApi.peerInfoMessage.updateMessage.hasOwnProperty( "updateMediaSession" ) ) {
                    if (type === "rejectScreen") {
                        grpDialingApi.peerInfoMessage.updateMessage.updateMediaSession.rspInfo =
                            {
                                rspCode: grpDialingApi.CODE_TYPE.rejectScreen.codeType,
                                rspMsg: grpDialingApi.CODE_TYPE.rejectScreen.message,
                            };
                    } else if (type === "sharePopupTimeOut") {
                        grpDialingApi.peerInfoMessage.updateMessage.updateMediaSession.rspInfo =
                            {
                                rspCode: grpDialingApi.CODE_TYPE.timeOut.codeType,
                                rspMsg: grpDialingApi.CODE_TYPE.timeOut.message,
                            };
                    }
                }
            }

            if(grpDialingApi.shareScreenPopupPort){
                grpDialingApi.sendMessage2ShareScreen({
                    cmd: "updateScreen",
                    data: grpDialingApi.peerInfoMessage,
                });
            }
            grpDialingApi.clearPeerInfoMessage();
        }
    },

    /**
     * 收到popup发送的消息
     */
    revPopupMessage: function (request, port) {
        if (!request) {
            return
        }

        console.log('receive popup message cmd:', request.cmd)
        switch (request.cmd) {
            case "popupOnOpen":
                grpDialingApi.handlePopupOpen(request)
                break
            case "permissionCheckRefuse":
                grpDialingApi.permissionCheckRefuse = true
                break
            case 'enableClickToDial':
                grpDialingApi.apiConfigUpdate({
                    callback: function (enable) {
                        grpDialingApi.clickToDialActionCheckCallback(enable, request.data)
                    }
                })
                break
            case "popupAccountChange":
            case 'popupUpdateLoginInfo':
                if (request.data && request.data.url) {
                    request.data.url = grpDialingApi.checkUrlFormat(request.data.url)
                }

                // 登录或更新登录信息
                grpDialingApi.updateCallCfg(request.data)
                break
            case "popupMakeCall":
                console.info("extension make call data:", request.data)
                grpDialingApi.extMakeCall(request.data)
                break
            case 'setSelectedAccount':
                if (request.data && request.data.accountId) {
                    console.log('set selected account ', request.data.accountId)
                    grpDialingApi.loginData.selectedAccountId = request.data.accountId

                    grpDialingApi.extensionNamespace.storage.local.set({ 'selectedAccount': request.data.accountId }, function () {
                        console.log('set selected account success')
                    });
                    grpDialingApi.getAccountDialPlan()
                }
                break
            case 'popupHangupLine':
                /**
                 * 话机部分通话相关操作接口
                 * extend/endcall/holdcall/unhold/acceptcall/rejectcall/cancel
                 * grpDialingApi.gsApi.phoneOperation
                 */
                console.info('hangup line ', request.lineId)
                if (!request.lineId) {
                    return;
                }
                grpDialingApi.gsApi.phoneOperation({
                    arg: request.lineId,
                    cmd: 'endcall',
                    sid: grpDialingApi.sid,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
                break
            case 'popupAcceptLine':
                console.info('accept line ', request.lineId)
                if (!request.lineId) {
                    return;
                }
                grpDialingApi.gsApi.phoneOperation({
                    arg: request.lineId,
                    cmd: 'acceptcall',
                    sid: grpDialingApi.sid,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
                break
            case 'popupRejectLine':
                console.info('reject line ', request.lineId)
                if (!request.lineId) {
                    return;
                }
                grpDialingApi.gsApi.phoneOperation({
                    arg: request.lineId,
                    cmd: 'rejectcall',
                    sid: grpDialingApi.sid,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
                break
            case 'popupHoldLine':
                console.info('hold line ', request.lineId)
                if (!request.lineId) {
                    return;
                }
                grpDialingApi.gsApi.phoneOperation({
                    arg: request.lineId,
                    cmd: 'holdcall',
                    sid: grpDialingApi.sid,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
                break
            case 'popupUnHoldLine':
                console.info('un hold line ', request.lineId)
                if (!request.lineId) {
                    return;
                }
                grpDialingApi.gsApi.phoneOperation({
                    arg: request.lineId,
                    cmd: 'unhold',
                    sid: grpDialingApi.sid,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
                break
            case 'popupCancelLine':
                console.info('cancel line ', request.lineId)
                if (!request.lineId) {
                    return;
                }
                grpDialingApi.gsApi.phoneOperation({
                    arg: request.lineId,
                    cmd: 'cancel',
                    sid: grpDialingApi.sid,
                    onerror: grpDialingApi.onErrorCatchHandler
                })
                break
            case 'accountLogout':
                console.log('[EXT] account logout.')
                grpDialingApi.logoutProcess()
                break
            case 'userDataControl':
                // 是否保留用户配置及ldap信息
                console.log('request.data.keep:', request.data)
                grpDialingApi.keepUserInfo = request.data.keep

                grpDialingApi.extensionNamespace.storage.local.set({ 'keepUserInfo': request.data.keep }, function () {
                    console.log('set keep user info ' + request.data.keep);
                });
                break
            case 'setWordDialing':  // 取词呼叫设置
                console.log('enabeld word dialing ?', request.data.wordDialing)
                grpDialingApi.wordDialingEnabled = request.data.wordDialing
                break
            case 'setContactSearch': // 联系人搜索源设置
                console.log('set contact search source: ', JSON.stringify(request.data, '    '))
                grpDialingApi.contactSearchFrom = request.data
                break
            /***********************************共享的相关逻辑(建立以及挂断)*************************************/
            case "localShareScreenRequest":
                // 1.在popup页面点击共享按钮时，popup发送 message 给背景页，标识当前是本地共享还是远端共享

                grpDialingApi.handleShareScreenRequest({
                    cmd: 'sendLocalShareScreenRequest',
                    data: request.data
                })
                break
            case 'isReceiveScreen':
                if(request.message){
                    if(request.message.isReceive){
                        // 表示接受演示或共享文件
                        grpDialingApi.receiveScreen("popup");
                    }else{
                        // 表示拒绝演示或共享文件
                        if(request.message?.shareType === 'shareFile'){
                            grpDialingApi.rejectScreen("rejectScreen", request.message);
                        }else {
                            grpDialingApi.rejectScreen("rejectScreen")
                        }
                    }
                    grpDialingApi.clearNotification(grpDialingApi.notificationsId);
                }
                break
            case 'sharePopupTimeOut':
                if(request.message?.shareType === 'shareFile'){
                    grpDialingApi.rejectScreen("sharePopupTimeOut", request.message);
                }else {
                    grpDialingApi.rejectScreen("sharePopupTimeOut")
                }
                break
            case "closePrePeerConnection":
                console.info('closePrePeerConnection line ', request.lineId)
                if(request.lineId){
                    grpDialingApi.closePrePeerConnection({lineId:request.lineId})
                }
                break
            case 'quicallLocalOfferSdp':
                console.log("quicallLocalOfferSdp_request:", request.data)
                grpDialingApi.handleLocalOfferSdp(request.data, 'quicall')
                break
            case 'quicallLocalAnswerSdp':
                grpDialingApi.handleLocalAnswerSdp(request.data, 'quicall')
                break
            case 'quicallSendFile':
                grpDialingApi.openPopup('../shareScreen/shareScreen.html', 'shareScreen')
                grpDialingApi.sendMessage2ShareScreen({ type: 'quicallSendFile' })
                break
            case 'cancelRequest':
                grpDialingApi.socket.sendMessage(JSON.parse(request.data))
                break
            default:
                break
        }
    },
    /*****************************************************************************************************************/
    /*************************************************插件收发演示******************************************************/
    /*****************************************************************************************************************/
    /**
     * 处理共享页面打开事件
     */
    handleShareScreenOpen: function (){
        console.log('screen share page on open, is localShare: ', grpDialingApi.localShare, " currentShareLineId is： ", grpDialingApi.currentShareContent.lineId)
        // 3.收发演示的页面打开后发送消息给背景页，背景页再发送SDP到演示页面进行处理
        if (grpDialingApi.localShare) {
            // 插件端处理开启共享逻辑
            let remoteName = grpDialingApi.currentShareContent.remoteCallInfo.remoteName || grpDialingApi.currentShareContent.remoteCallInfo.remotenumber
            let message = {
                cmd: 'localScreenShare',
                localShare: grpDialingApi.localShare,
                localAccountLists: grpDialingApi.loginData.accountLists,
                data: {
                    localLineId: grpDialingApi.currentShareContent.lineId,
                    shareType: grpDialingApi.currentShareContent.shareType,
                    remoteName: remoteName,
                }
            }
            grpDialingApi.sendMessage2ShareScreen(message)
        } else {
            console.log("Is it currently shared?" + grpDialingApi.currentShareContent.isEstablishSuccessPc)
            // 6. 收到消息，对端处理setRemote、doAnswer内容
            let message = {
                cmd: 'remoteScreenShare',
                localShare: grpDialingApi.localShare,
                localAccountLists: grpDialingApi.loginData.accountLists,
                data: grpDialingApi.saveShareLineContent[0]
            }
            console.log("grpDialingApi.saveShareLineContent:", grpDialingApi.saveShareLineContent)
            grpDialingApi.sendMessage2ShareScreen(message)
        }

        if(grpDialingApi.lineData){
            console.log('Send route information to shared window')
            grpDialingApi.sendMessage2ShareScreen({type: 'setLineStatus', lines: grpDialingApi.lineData})
        }
        grpDialingApi.sendMessage2Popup({ cmd: 'shareScreenOnOpen' })
    },

    /**
     * 处理本端offer sdp（本端开启桌面共享时生成的offer SDP）
     * 页面发送消息体给背景页，背景页通过websocket发送消息体出去，page代表需要发送消息的页面
     * @param requestData
     * @param page
     */
    handleLocalOfferSdp: function (requestData, page){
        console.log('handleLocalOfferSdp: ' + page)
        if (requestData && grpDialingApi.socket) {
            let data = JSON.parse(requestData)
            let actionObj = grpDialingApi.socket.parseMessageBody(data)
            let action = actionObj.type
            data[action].actionType = 'localOfferSdp'
            grpDialingApi.socket.sendMessage(data)
        } else {
            console.log(page + ' local offer sdp is not offer!')
        }
    },

    /**
     * 处理本端answer sdp （接收对端开启桌面共享请求时生成的answer sdp）page代表需要处理的页面
     * @param requestData
     * @param page
     */
    handleLocalAnswerSdp: function (requestData, page){
        console.log('handleLocalAnswerSdp: ' + page)
        if (requestData && grpDialingApi.socket) {
            // 插件端answer sdp 处理
            let data = JSON.parse(requestData)
            let actionObj = grpDialingApi.socket.parseMessageBody(requestData)
            let action = actionObj.type
            if(page === 'shareScreen'){
                let rspInfo = actionObj.message && actionObj.message.rspInfo
                if(rspInfo && rspInfo.rspCode === 200){
                    grpDialingApi.saveShareLineContent[0].isEstablishSuccessPc = true
                    grpDialingApi.sendMessage2Popup({ cmd: 'isSharingTurnedOn', shareState: 'open', content: grpDialingApi.saveShareLineContent[0] , changeIconState: 'start'})
                }
            }
            data[action].actionType = 'localAnswerSdp'
            grpDialingApi.socket.sendMessage(data)
        } else {
            console.log(page + ' local answer sdp is not offer!')
        }
    },

    /**
     * 更新本端offer SDP
     * @param requestData
     */
    updateLocalOfferSdp: function (requestData){
        if(!requestData){
            return
        }

        let actionObj = grpDialingApi.socket.parseMessageBody(requestData)
        console.log("handleOfferUpdateSdp:", actionObj)
        grpDialingApi.peerInfoMessage.sdp = actionObj.message.sdp
        grpDialingApi.peerInfoMessage.reqId = actionObj.message.reqId
        grpDialingApi.peerInfoMessage.localLineId = actionObj.message.line
        grpDialingApi.peerInfoMessage.remoteLineId = null
        grpDialingApi.peerInfoMessage.action = actionObj.message.action
        grpDialingApi.peerInfoMessage.shareType = actionObj.message.shareType
        grpDialingApi.peerInfoMessage.localShare = false;
        grpDialingApi.localShare = grpDialingApi.peerInfoMessage.localShare
        grpDialingApi.peerInfoMessage.updateMessage = requestData
        if (actionObj.message.action === 'shareScreen') {
            let title = grpDialingApi.notifyEvent.shareScreen.title.replace("{0}", remoteName)
            let message = grpDialingApi.notifyEvent.shareScreen.message
            grpDialingApi.createDesktopNotification({title: title, message: message})
            grpDialingApi.sendMessage2Popup({
                cmd: "isIncomingCall",
                message: {
                    lineId: requestData.local_line,
                    receiveSharePopupNum: grpDialingApi.saveShareLineContent.length,
                    currentShareContent: grpDialingApi.currentShareContent
                }
            })
        }
        console.log("grpDialingApi.peerInfoMessage:", grpDialingApi.peerInfoMessage)
    },

    /**
     * 更新本端answer sdp
     * @param requestData
     */
    updateLocalAnswerSdp: function (requestData){
        if(!requestData){
            return
        }

        let actionObj = grpDialingApi.socket.parseMessageBody(requestData)
        console.log("handleOfferUpdateSdp:", actionObj)
        grpDialingApi.peerInfoMessage.sdp = actionObj.message.sdp
        grpDialingApi.peerInfoMessage.reqId = actionObj.message.reqId
        grpDialingApi.peerInfoMessage.localLineId = actionObj.message.line
        grpDialingApi.peerInfoMessage.remoteLineId = null
        grpDialingApi.peerInfoMessage.action = actionObj.message.action
        grpDialingApi.peerInfoMessage.shareType = actionObj.message.shareType
        grpDialingApi.peerInfoMessage.localShare = actionObj.message.action === 'shareScreen';
        grpDialingApi.peerInfoMessage.updateMessage = requestData
        grpDialingApi.localShare = grpDialingApi.peerInfoMessage.localShare
        grpDialingApi.peerInfoMessage.rspInfo = actionObj.message.rspInfo;
        grpDialingApi.sendMessage2ShareScreen({ cmd: 'updateScreenRet', data: grpDialingApi.peerInfoMessage })
    },

    /**
     * 本端或者对端结束共享
     * @param request
     */
    stopScreenShare: function (request){
        if (request.data && grpDialingApi.socket) {
            let data = JSON.parse(request.data)
            let actionObj = grpDialingApi.socket.parseMessageBody(request.data)
            let action = actionObj.type
            data[action].actionType = request.cmd
            grpDialingApi.socket.sendMessage(data)
        } else {
            console.log("local offer is not hangup")
        }
    },

    /**
     * 给shareScreen发送消息
     * @param data
     */
    sendMessage2ShareScreen: function (data) {
        if (grpDialingApi.shareScreenPopupPort) {
            data = JSON.stringify(data)         // 不转换为字符串格式，firefox无法成功发送消息
            grpDialingApi.shareScreenPopupPort.postMessage(data)
        } else {
            console.log('screen share port not found:', data)
        }
    },

    /**
     *  收到演示收发页面发送的消息
     *  收发演示流处理流程
     */
    receiveShareScreenMessage: function (request) {
        if (!request) {
            return
        }
        console.log('receive screen share message cmd:', request.cmd)

        switch (request.cmd) {
            case "shareScreenOnOpen":
                grpDialingApi.handleShareScreenOpen()
                break
            case 'handleLocalOfferSdp':
                console.log("handleLocalOfferSdp_request:", request.data)
                grpDialingApi.handleLocalOfferSdp(request.data, 'shareScreen')
                break
            case 'handleLocalAnswerSdp':
                // 7. share 页面完成doAnswer流程，背景页收到生成的sdp，通过websocket发送出去
                grpDialingApi.handleLocalAnswerSdp(request.data, 'shareScreen')
                break
            case 'updateLocalOfferSdp':
                if (request.data) {
                    grpDialingApi.updateLocalOfferSdp(request.data)
                }
                break
            case "updateLocalAnswerSdp":
                if (request.data) {
                    grpDialingApi.updateLocalAnswerSdp(request.data)
                }
                break
            case 'handleLocalHangup':
            case 'handleRemoteHangup':
                grpDialingApi.stopScreenShare(request)
                break;
            case 'closeScreenTab':
                if (request.data && grpDialingApi.socket) {
                    grpDialingApi.socket.sendMessage(request.data)
                }
                grpDialingApi.localShare = false
                grpDialingApi.clearShareContent({lineId: request.lineId})
                grpDialingApi.sendMessage2Popup({cmd: 'closeShareInformForPopup'})
                break
            case 'userClickCloseShare':
                if (request.data && grpDialingApi.socket) {
                    grpDialingApi.closePc({lineId: request.data.lineId})
                    grpDialingApi.sendMessage2Popup({cmd: 'clearShareContentForPop'})
                }
                break
            default:
                break
        }
    },

    /*****************************************************************************************************************/
    /**
     * 获取接收共享桌面端的线路信息
     * @param lineId
     * @returns {null}
     */
    getSharedLine: function (lineId){
        let line = null
        for(let i in grpDialingApi.lineData){
            if(grpDialingApi.lineData[i].state !== 'idle' && grpDialingApi.lineData[i].line == lineId){
                line = grpDialingApi.lineData[i]
            }
        }
        return line
    },

    /**
     * 2. 点击开启演示端,背景页 主动开启新的tab页面
     * 发送本端开启桌面共享的请求
     * @param request
     */
    sendShareScreenRequest: function (request){
        let openShareWindow = function(){
            if(typeof request.data.localLineId !== 'number'){
                request.data.localLineId = Number(request.data.localLineId)
            }
            console.log('start openShare, currentShareLineId is:', request.data.localLineId)
            grpDialingApi.currentShareContent.remoteCallInfo = grpDialingApi.getSharedLine( request.data.localLineId)
            grpDialingApi.currentShareContent.lineId = request.data.localLineId
            grpDialingApi.currentShareContent.shareType = request.data.shareType

            grpDialingApi.saveShareLineContent.push(grpDialingApi.currentShareContent)
            grpDialingApi.localShare = request.data.localShare
            grpDialingApi.openPopup('../shareScreen/shareScreen.html', 'shareScreen')
        }

        if(grpDialingApi.localShare){
            // 演示者
            if(!grpDialingApi.currentShareContent.isEstablishSuccessPc){
                grpDialingApi.sendMessage2Popup({ cmd: 'isSharingTurnedOn' })
            }else {
                if(request.data.localLineId !== grpDialingApi.currentShareContent.lineId){  // 表示当前线路不一致，需要关闭之前的线路和pc
                    console.log("grpDialingApi.currentShareContent.lineId:",grpDialingApi.currentShareContent)
                    grpDialingApi.sendMessage2ShareScreen({type: 'closeShareWindow'})
                    setTimeout(function(){
                        openShareWindow()
                    },2000)

                }else{
                    if(request.data.shareType !== grpDialingApi.currentShareContent.shareType){   // 表示当前需要打开共享页面（共享文件或者共享桌面）
                        console.log("current share type change, type is " + request.data.shareType)
                        grpDialingApi.sendMessage2ShareScreen({type: 'shareContent', data:request.data})
                    }else {
                        grpDialingApi.sendMessage2Popup({ cmd: 'isSharingTurnedOn'})
                    }
                }
            }
        }else{
            if(grpDialingApi.currentShareContent.isEstablishSuccessPc){            // 已经存在pc,需要先关闭之前的pc，再创建新的pc
                grpDialingApi.sendMessage2ShareScreen({type: 'closeShareWindow' })
                setTimeout(function(){
                    openShareWindow()
                },2000)
            }else{
                openShareWindow()
            }
        }
    },

    /**
     * 处理收到其他人共享的请求
     */
    revShareScreenRequest: function (request, page){
        console.log('revShareScreenRequest: ' + page)
        if(!request.content || !grpDialingApi.socket){
            return
        }

        let actionObj = grpDialingApi.socket.parseMessageBody(request.content)
        let remoteCallInfo = grpDialingApi.getSharedLine(request.content.local_line)
        let msg
        if(page === 'quicall'){
            console.log("quicallReceiveShareFileRequest:", actionObj)
            msg = {
                lineId: request.content.local_line,
                data: {
                    sdp: actionObj.message.sdp,
                    reqId: actionObj.message.reqId,
                    localLineId: request.content.local_line,
                    remoteLineId: actionObj.message.line,
                    action: actionObj.message.action,
                    shareType: actionObj.message.shareType,
                    remoteCallInfo: remoteCallInfo,
                    fileInfo: actionObj.message.fileInfo
                }
            }
        }else{
            console.log("shareScreenRequest:", actionObj)
            grpDialingApi.currentShareContent.sdp = actionObj.message.sdp
            grpDialingApi.currentShareContent.reqId = actionObj.message.reqId
            grpDialingApi.currentShareContent.lineId = request.content.local_line
            grpDialingApi.currentShareContent.localLineId = request.content.local_line
            grpDialingApi.currentShareContent.remoteLineId = actionObj.message.line
            grpDialingApi.currentShareContent.shareType = actionObj.message.shareType
            grpDialingApi.currentShareContent.action = actionObj.message.action
            grpDialingApi.currentShareContent.localShare = request.localShare || false
            grpDialingApi.saveShareLineContent.push(grpDialingApi.currentShareContent)

            grpDialingApi.peerInfoMessage.sdp = actionObj.message.sdp
            grpDialingApi.peerInfoMessage.reqId = actionObj.message.reqId
            grpDialingApi.peerInfoMessage.localLineId = request.content.local_line
            grpDialingApi.peerInfoMessage.remoteLineId = actionObj.message.line
            grpDialingApi.peerInfoMessage.action = actionObj.message.action
            grpDialingApi.peerInfoMessage.shareType = actionObj.message.shareType
            grpDialingApi.peerInfoMessage.localShare = request.localShare || false

            let title = grpDialingApi.notifyEvent.shareScreen.title.replace("{0}", remoteCallInfo.remotename || remoteCallInfo.remotenumber)
            let message = grpDialingApi.notifyEvent.shareScreen.message
            grpDialingApi.currentShareContent.remoteCallInfo = remoteCallInfo
            grpDialingApi.createDesktopNotification({title: title, message: message})
            msg = {
                lineId: request.content.local_line,
                receiveSharePopupNum: grpDialingApi.saveShareLineContent.length,
                currentShareContent: grpDialingApi.currentShareContent
            }
        }
        // 提示框： 显示用户接受还是拒绝
        /***告知popup页面共享来电**/
        grpDialingApi.sendMessage2Popup({
            cmd: "isIncomingCall",
            message: msg
        });
    },

    /**
     * 收到对端停止桌面共享的请求
     * @param request
     */
    revRemoteStopScreenRequest: function (request){
        if (!request.content || !grpDialingApi.socket) {
            return
        }

        console.log("handle remote destroyMediaSession content")
        let actionObj = grpDialingApi.socket.parseMessageBody(request.content)
        let message = {
            destroyMediaSessionRet: {
                line: actionObj.message.line,
                reqId: actionObj.message.reqId,
                rspInfo: {
                    rspCode: 200,
                    rspMsg: 'action success'
                }
            },
            local_line: request.content.local_line,
        }
        if (grpDialingApi.socket) {          // 恢复对应的 request  ---> response
            grpDialingApi.socket.sendMessage(message)
        }
        if(grpDialingApi.shareScreenPopupPort){                           // 针对存在共享窗口对其进行销毁相关内容
            grpDialingApi.sendMessage2ShareScreen({ type: 'clearSession', data: {lineId: request.content.local_line} })
        }

        grpDialingApi.sendMessage2Popup({cmd: 'closeShareInformForPopup'})    // 关闭共享通知窗口
        grpDialingApi.clearShareContent({lineId: request.content.local_line})
    },

    /**
     * 本端停止共享
     */
    revLocalStopScreenRequest: function (request){
        if (!request.content || !grpDialingApi.socket) {
            return
        }

        grpDialingApi.clearShareContent({lineId: request.content.local_line})

        if(grpDialingApi.shareScreenPopupPort){                           // 针对存在共享窗口对其进行销毁相关内容
            grpDialingApi.sendMessage2ShareScreen({ type: 'clearSession', data: {lineId: request.content.local_line} })
        }
    },

    /**
     * 处理收到的远端SDP
     * @param request
     * @param page
     */
    handleRemoteAnswerSdp: function (request, page){
        console.log('handleRemoteAnswerSdp: ' + page)
        if(!request.content || !grpDialingApi.socket){
            return
        }

        console.log('handle remote answer sdp')
        let actionObj = grpDialingApi.socket.parseMessageBody(request.content)
        let getInfoMsg = actionObj.message && actionObj.message.rspInfo;
        if(page === 'quicall'){
            console.log("quicallRemoteAnswerSdp:", actionObj)
            grpDialingApi.sendMessage2Popup({
                cmd: request.cmd,
                data: {
                    localLineId: request.content.local_line,
                    rspInfo: getInfoMsg,
                    sdp: actionObj.message.sdp,
                    remoteLineId: actionObj.message.remoteLineId
                }
            })
        }else{
            console.log("remoteAnswerSdp:", actionObj)
            grpDialingApi.peerInfoMessage.sdp = actionObj.message.sdp
            grpDialingApi.peerInfoMessage.reqId = actionObj.message.reqId
            grpDialingApi.peerInfoMessage.localLineId = request.content.local_line
            grpDialingApi.peerInfoMessage.remoteLineId = actionObj.message.line
            grpDialingApi.peerInfoMessage.localShare = request.localShare || false
            grpDialingApi.currentShareContent.remoteLineId = actionObj.message.line

            grpDialingApi.peerInfoMessage.action = actionObj.action
            grpDialingApi.peerInfoMessage.rspInfo = getInfoMsg;

            if (getInfoMsg && getInfoMsg.rspCode === 200) {
                console.log("current get codeType is " + getInfoMsg.rspCode);
                grpDialingApi.currentShareContent.isEstablishSuccessPc = true
                grpDialingApi.sendMessage2Popup({ cmd: 'isSharingTurnedOn', shareState: 'open', content: grpDialingApi.currentShareContent, changeIconState: 'start'})
            } else {
                console.log( "current get codeType is " + getInfoMsg.rspCode, "cause: " + getInfoMsg.rspMsg   );
            }
            grpDialingApi.sendMessage2ShareScreen({ cmd: request.cmd, data: grpDialingApi.peerInfoMessage })
            grpDialingApi.clearPeerInfoMessage();
        }
    },

    /**
     * 设置线路状态
     * @param request
     */
    setLineStatus: function (request){
        grpDialingApi.lineData = request.lines
        for (let i = 0; i < request.lines.length; i++) {
            let line = request.lines[i]
            // 处理桌面共享
            if (grpDialingApi.currentShareContent.isEstablishSuccessPc && grpDialingApi.saveShareLineContent.length) {
                console.log("share exist")
                for(let i in grpDialingApi.saveShareLineContent){
                    let currentShare = grpDialingApi.saveShareLineContent[i]
                    switch(line.state){
                        case 'idle':
                            if(currentShare.lineId === line.line){
                                console.log("current lineId hangup, need stop shareScreen and close peerConnection"+ line.line)
                                grpDialingApi.sendMessage2ShareScreen({ type: 'closeWindow', data: { localLineId: line.line } })
                                grpDialingApi.clearShareContent({lineId: line.line})
                            }
                            break
                        case 'onhold':
                            if(currentShare.lineId === line.line){
                                console.log("Currently in the hold state" )
                                grpDialingApi.sendMessage2ShareScreen({type: 'holdLine', data: {lineId: line.line}})
                            }
                            break
                        case 'connected':
                            if(currentShare.lineId === line.line){
                                console.log("Currently in the unhold state" )
                                grpDialingApi.sendMessage2ShareScreen({type: 'unHoldLine', data: {lineId: line.line}})
                            }
                            break
                        default:
                            break
                    }
                }
            }
        }
    },

    /**
     * 判断对端的webSocket是否建立成功
     * **/
    isSuccessforRemoteWs(data){
        // 情况一： 当前未开始进行共享，获取对端是否连接webSocket
        // 情况二： 当前已经在共享，线路状态发生改变
        let This = this
        for (let line of data.lines) {
            if(line.state === 'connected' && grpDialingApi.socket && grpDialingApi.socket.wsIsConnected()){
                let getReqId = This.getRandomReqId({action: 'detectMediaSession'})
                console.log("get reqId:", getReqId)
                let data = {
                    detectMediaSession:{
                        action:"detect_remote_connection_state",
                        line: line.line,
                        reqId: getReqId,
                    },
                    local_line: line.line,
                }
                grpDialingApi.socket.sendMessage(data)
            }
        }
    },

    /**
     * 获取对应的ReqId
     * ***/
    getRandomReqId: function(data){
        console.log("handle current action:",data.action)
        let This = this
        let reqId

        do{
            reqId =  parseInt(Math.round(Math.random() * 101))
        } while( This.randomReqIdArray.some(item=> item.reqId === reqId ))

        This.randomReqIdArray.push({
            action: data.action,
            reqId: reqId
        })

        return reqId
    },

    deleteRandomReqId: function(data){
        let This = this
        for(let index in This.randomReqIdArray){
            let content = This.randomReqIdArray[index]
            if(content?.reqId === Number(data.reqId)){
                console.log("delete reqId is:", data.reqId)
                This.randomReqIdArray.splice(index, 1);
                break
            }
        }
    },

    /** 清除保存内容
     * */
    clearPeerInfoMessage: function (isClearCurrentShareContent = false) {
        console.log("isClearCurrentShareContent is : " + isClearCurrentShareContent)
        if(isClearCurrentShareContent){
            grpDialingApi.currentShareContent = {
                lineId: '',
                remoteLineId:'',
                shareType: '',
                remoteCallInfo:'',
                isEstablishSuccessPc: false
            }
        }

        grpDialingApi.peerInfoMessage = {
            action: '',
            reqId: '',
            localLineId: '',
            sdp: '',
            remoteLineId: '',
            updateMessage: '',
            infoMsg: '',
            rspInfo: ''
        }
    },

    /**
     * 清除共享内容的相关内容
     * @param data
     */
    clearShareContent: function(data){
        console.log("clear current share content, lineId: " + data.lineId)
        grpDialingApi.closeShareScreenTab()
        grpDialingApi.deleteScreenLine(data.lineId)
        grpDialingApi.clearPeerInfoMessage(true)
        grpDialingApi.localShare = false
    },

    /**
     * 关闭pc
     * @param data
     * @param isLocal
     */
    closePrePeerConnection: function(data, isLocal = false){
        let deleteLine = function(lineId,i){
            console.log("destroy lineId:" + lineId)
            grpDialingApi.saveShareLineContent.splice(i, 1);
            if(grpDialingApi.currentShareContent.isEstablishSuccessPc){
                grpDialingApi.closePc({lineId: lineId})
            }else{
                grpDialingApi.closeShareScreenTab(false)
            }
        }
        for (let index = 0; index < grpDialingApi.saveShareLineContent.length; index++) {
            let currentShareContent = grpDialingApi.saveShareLineContent[index]
            if(!isLocal){
                if (currentShareContent.lineId !== data.lineId) {
                    deleteLine(currentShareContent.lineId, index)
                }
            }else{
                if (currentShareContent.lineId === data.lineId) {
                    deleteLine(data.lineId,index)
                }
            }
        }
    },
    /**
     * 发送 关闭pc 消息
     * @param data
     */
    closePc: function(data){
        let param = {
            destroyMediaSession: {
                reqId: parseInt(Math.round(Math.random() * 100)),
                actionType: 'handleLocalHangup'
            },
            local_line: data.lineId
        }
        grpDialingApi.localShare = false
        grpDialingApi.socket.sendMessage(param)
    },

    /**
     * 删除对应的共享线路
     */
    deleteScreenLine: function (lineId) {
        if (!lineId) {
            return
        }
        for (let index = 0; index < grpDialingApi.saveShareLineContent.length; index++) {
            let currentShareContent = grpDialingApi.saveShareLineContent[index]
            if (currentShareContent.lineId === lineId) {
                console.log("current line hangup:" + lineId)
                currentShareContent.value = 'false'
                grpDialingApi.sendMessage2Popup({ cmd: 'isSharingTurnedOn', shareState: 'close', content: currentShareContent, changeIconState: 'end'})
                currentShareContent.lineId = null
                currentShareContent.shareType = null
                delete currentShareContent.value
                grpDialingApi.saveShareLineContent.splice(index, 1);
                break
            }
        }
    },

    /**
     * 关闭共享窗口
     **/
    closeShareScreenTab: function (isClearPopupContent = true) {
        if(isClearPopupContent){
            grpDialingApi.sendMessage2Popup({cmd: 'clearShareContentForPop'})
        }
        let tabId = grpDialingApi.shareScreenPopupPort ? grpDialingApi.shareScreenPopupPort.sender.tab.id : null
        console.log('close tab id: ', tabId)
        if (tabId) {
            let tabs = grpDialingApi.extensionNamespace.tabs
            if (tabs && tabs.remove) {
                tabs.remove(tabId, function () {
                    console.log('close shareScreen success ')
                })
            }
        }
    },

    /**
     * 处理本端或对端桌面共享请求
     * @param request
     */
    handleShareScreenRequest: function (request) {
        if (!request) {
            return
        }
        if (typeof request === 'string') {
            request = JSON.parse(request)
        }
        let page

        console.info('handle share screen request: ', request)
        switch (request.cmd) {
            case "sendLocalShareScreenRequest":
                // 2. 点击开启演示端,背景页 主动开启新的tab页面
                console.log('local screen share, ', request.data.localShare)
                grpDialingApi.sendShareScreenRequest(request)
                break
            case 'receiveShareScreenRequest':
            case 'quicallReceiveShareFileRequest':
                // 5. websocket 接受到消息体内容，开启消息通知；确定后，对端打开share页面，处理answer逻辑。
                page = request.cmd === 'receiveShareScreenRequest' ? 'shareScreen' : 'quicall'
                // 如果page是quicall通话窗口共享文件的处理
                grpDialingApi.revShareScreenRequest(request, page)
                break
            case 'remoteAnswerSdp':
            case 'quicallRemoteAnswerSdp':
                // 8. 本端收到对端通过websocket 发送的消息，背景页告知share页面，需要本端setRemote
                page = request.cmd === 'remoteAnswerSdp' ? 'shareScreen' : 'quicall'
                // 如果page是quicall通话窗口共享文件的处理
                grpDialingApi.handleRemoteAnswerSdp(request, page)
                break
            case "receiveScreenHangupRequest":
                // （1）关闭桌面通知； （2）恢复popup页面关于共享的状态重置
                grpDialingApi.revRemoteStopScreenRequest(request)
                break
            case "localShareScreenHangup":
                grpDialingApi.revLocalStopScreenRequest(request)
                break
            case 'setLineStatus':
                if (request.lines) {
                    grpDialingApi.checkNotification(request)
                    grpDialingApi.setLineStatus(request)
                    grpDialingApi.isSuccessforRemoteWs(request)
                }
                break
            case 'cancelRequest':
                if(!request.content){
                    return
                }
                let data = {
                    cancelRequestRet:{
                        reqId: request.content.cancelRequest?.reqId,
                        line: request.content.cancelRequest?.line,
                        rspInfo: {
                            rspCode: 200,
                            rspMsg: 'Cancel success'
                        }
                    },
                    local_line: request.content.local_line
                }
                grpDialingApi.socket && grpDialingApi.socket.sendMessage(data)
                grpDialingApi.sendMessage2Popup({cmd: request.cmd})
                break
            case 'cancelRequestRet':
                if(!request.content){
                    return
                }
                grpDialingApi.sendMessage2Popup({cmd: request.cmd, data: request.content.cancelRequestRet})
                break
            default:
                console.log("current no find， type："+ request.cmd)
                break
        }
    },
    handleDetectMediaSession: function(data){
        if (!data) {
            return
        }
        if (typeof data === 'string') {
            data = JSON.parse(data)
        }
        console.info('handle detect mediaSession: ', data)
        let content = grpDialingApi.socket.parseMessageBody(data.content)
        switch (content.type) {
            case 'detectMediaSession':
                 if(content?.message) {                    // background 回复，表示websocket 建立成功 并处理request ---> response
                     //告知popup页面shareScreen按钮取消置灰
                     let param = {
                         detectMediaSessionRet: {
                             action: "detect_remote_connection_state",
                             line: content.message?.line,
                             reqId: content.message?.reqId,
                             rspInfo: {
                                 rspCode: 200,
                                 rspMsg: 'action success'
                             }
                         },
                         local_line: content.message?.line,

                     }
                     grpDialingApi.socket.sendMessage(param)
                     grpDialingApi.sendMessage2Popup({
                         cmd: 'changeShareScreenIcon',
                         data: {state: 'recovery', lineId: Number(data?.content?.local_line)}
                     })
                 }
                break;
            case 'detectMediaSessionRet':
                if(content?.message){
                    console.log("current get detect remote webSocket code:", content.message?.rspInfo?.rspCode)
                    if(content.message?.rspInfo?.rspCode === 200){     // 表示成功
                        //告知popup页面shareScreen按钮取消置灰
                        grpDialingApi.sendMessage2Popup({cmd: 'changeShareScreenIcon', data:{state: 'recovery', lineId: Number(data?.content?.local_line)}})
                    }else{                                    // 表示失败
                        //告知popup页面shareScreen按钮要置灰
                        grpDialingApi.sendMessage2Popup({cmd: 'changeShareScreenIcon', data:{state: 'interrupt', lineId: Number(data?.content?.local_line)}})
                    }
                    grpDialingApi.deleteRandomReqId({reqId: content.message?.reqId})
                }else{
                    console.log("Waiting for detectMediaSessionRet reply...")
                }

                break;
            default:
                console.log("handleDetectMediaSession: get type is:",request.cmd)
                break;
        }

    },

    /*******************************************************桌面通知*****************************************************/
    /**
     * 线路状态变化时，检查是否已添加桌面通知
     * @param request
     */
    checkNotification: function (request){
        if(!request || !request.lines){
            return
        }

        for (let i = 0; i < request.lines.length; i++) {
            let line = request.lines[i]
            // 来电时显示桌面通知
            let tag = 'incomingCallNotification' + line.line
            let tagIndex = grpDialingApi.incomingCallNotificationQueue.indexOf(tag)
            if (line.state === 'ringing' && tagIndex < 0) {
                grpDialingApi.incomingCallNotificationQueue.push(tag)
                let message
                if(grpDialingApi.language.language === 'zh-CN'){
                    message = `${line.remotename} (${line.remotenumber}) ${grpDialingApi.language['L149']}`
                }else {
                    message = `${grpDialingApi.language['L149']} ${line.remotename} (${line.remotenumber})`
                }
                let options = {
                    id: tag,
                    title: 'GRP Click2Dial',
                    message: message,
                    action: 'ringing'
                }
                if(grpDialingApi.getBrowserDetail().browser !== 'firefox'){
                    options.buttons = [{title: grpDialingApi.language['L21']}]   // Property "buttons" is unsupported by Firefox
                }
                grpDialingApi.createDesktopNotification(options)
            }
            if (line.state !== 'ringing' && tagIndex >= 0) {
                grpDialingApi.clearNotification(tag)
            }
        }
    },

    /**
     * 添加桌面通知
     * @param data
     */
    createDesktopNotification: function (data) {
        if (grpDialingApi.extensionNamespace && grpDialingApi.extensionNamespace.notifications) {
            console.log('notifications.create')
            // Firefox 目前：仅支持 type 、 title 、 message 和 iconUrl 属性；并且 type 唯一支持的值是 'basic'
            // Chrome 目前type支持的有：basic, image, list, progress，且必须存在type
            // chrome 设置类型为image 不会打印对应的id
            let notificationId = data.id || null
            let notificationOptions = {
                type: 'basic',
                iconUrl: '../quicall/assets/logo.png',
                title: data.title,
                message: data.message
            }
            if(data.buttons){
                notificationOptions.buttons = data.buttons   // Property "buttons" is unsupported by Firefox
            }
            grpDialingApi.extensionNamespace.notifications.create(notificationId, notificationOptions, (id) => {
                if(data.action && data.action === 'ringing'){
                }else {
                    grpDialingApi.notificationsId = id;
                    console.log("current notifications id:", id)
                }
            })
        }
    },

    /** 清除桌面消息通知
     * */
    clearNotification: function (notificationId) {
        console.log('clearNotification: ', notificationId)
        if (notificationId) {
            if(grpDialingApi.getBrowserDetail().browser === 'firefox'){
                grpDialingApi.extensionNamespace.notifications.clear(notificationId).then(() => {
                    console.log(`Notification ${notificationId} cleared successfully.`);
                });
                grpDialingApi.extensionNamespace.notifications.onClicked.removeListener(grpDialingApi.handleNotificationClick); // 针对firefox
            }else {
                grpDialingApi.extensionNamespace.notifications.onButtonClicked.removeListener(grpDialingApi.handleNotificationButtonClicked); // 针对chrome
                grpDialingApi.extensionNamespace.notifications.clear(notificationId);
            }

            let index = grpDialingApi.incomingCallNotificationQueue.indexOf(notificationId)
            if(index >= 0){
                let tag = parseInt(notificationId.split('incomingCallNotification')[1])
                let tagIndex = grpDialingApi.incomingCallNotificationQueue.indexOf(tag)
                grpDialingApi.incomingCallNotificationQueue.splice(tagIndex, 1)
            }
        }else {
            console.log('no notificationsId to clear')
        }
    },

    /**
     * 捕获用户点击通知的事件
     * 使用者点击通知中的非按钮区域，回调中帶入notification id，存在冒泡通知
     * @param notificationId
     */
    handleNotificationClick: function (notificationId){
        console.log('onClicked event trigger, notificationId: ', notificationId)
        grpDialingApi.openPopup("../quicall/quicall.html")
    },

    /**
     * 捕获用户点击通知中按钮的事件
     * @param notificationId
     * @param byUser: 是否由使用者关闭
     */
    handleNotificationButtonClicked: function (notificationId, byUser){
        // 什么情况下触发？？？ 显示通知后点击X或者转到通知设置中关闭通知时，未触发onClosed事件。。。
        console.log(`notifications onButtonClicked notificationId: ${notificationId}, is byUser: ${byUser}`)
        grpDialingApi.clearNotification(notificationId)
    },

    /**
     * 当用户手动关闭通知或通知超时后，这个事件将被触发。
     * @param notificationId
     * @param byUser
     */
    handleNotificationOnClosed: function (notificationId, byUser){
        console.log(`notifications onClosed notificationId: ${notificationId}, is byUser: ${byUser}`)
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

    /*****************************************************************************************************************/
    /*****************************************屏幕取词*****************************************************************/
    /*****************************************************************************************************************/
    /**
     * 打开chrome扩展弹出窗口
     * @param callInfo
     */
    openPopup: function (route, type = 'popup', callInfo) {
        if (!route) {
            console.log("current no route")
            return
        }

        console.log("current popup type:" + type)
        let This = this
        let url = This.extensionNamespace.runtime.getURL(route)
        console.log('openPopup url:', url)
        let setTemporaryCallInfo = function (win) {
            if (win) {
                This.openerPopupId = win && win.id
                if (!callInfo || !callInfo.number) {
                    console.log('no number to call')
                    return
                }
                console.log('set temporary call number: ', callInfo.number)
                This.extensionNamespace.storage.local.set({ 'temporaryCallInfo': callInfo }, function () {
                    console.log('set number success.');
                });
            } else {
                console.log('window maybe open failed!')
            }
        }

        let createShareWindowCallBack = function (win) {
            if (win) {
                This.openShareScreenTabId = win && win.id
                console.log('current shareScreen window id : ', This.openShareScreenTabId)
            } else {
                console.log('current shareScreen window maybe open failed!')
            }
        }


        let customWidth = 440
        let customHeight = 540
        let iTop = 200
        let iLeft = 600
        let screenWidth
        let screenHeight
        let screenTop
        let screenLeft
        if (This.extensionNamespace.runtime.getManifest().manifest_version === 2) {
            iTop = (window.screen.height - 30 - customHeight) / 2; //获得窗口的垂直位置;
            iLeft = (window.screen.width - 10 - customWidth) / 2; //获得窗口的水平位置;
            screenWidth = parseInt(Number(window.screen.width) * 0.8)
            screenHeight = parseInt(Number(window.screen.height) * 0.8)
            screenTop = parseInt((window.screen.height - 50 - screenHeight) / 2);
            screenLeft = parseInt((window.screen.width - screenWidth) / 2);
        } else if (grpDialingApi.screen.width && grpDialingApi.screen.height) {
            iTop = (grpDialingApi.screen.height - 30 - customHeight) / 2;
            iLeft = (grpDialingApi.screen.width - 10 - customWidth) / 2;
            screenWidth = parseInt(Number(grpDialingApi.screen.width) * 0.8)
            screenHeight = parseInt(Number(grpDialingApi.screen.height)  * 0.8)
            screenTop = parseInt((grpDialingApi.screen.height - 50 - screenHeight) / 2);
            screenLeft = parseInt((grpDialingApi.screen.width - screenWidth) / 2);
        } else {
            // use default position
        }

        if (type === 'popup') {
            if (This.openerPopupId > 0) {
                This.extensionNamespace.windows.get(This.openerPopupId, {}, function (win) {
                    if (win) {
                        // 更新窗口
                        console.log('update window')
                        This.extensionNamespace.windows.update(win.id, {
                            focused: true,
                            left: iLeft,
                            top: iTop
                        }, setTemporaryCallInfo)
                    } else {
                        This.extensionNamespace.windows.create({
                            url: url,
                            type: "popup",
                            height: customHeight,
                            width: customWidth,
                            left: iLeft,
                            top: iTop
                        }, setTemporaryCallInfo);
                    }
                })
            } else {
                This.extensionNamespace.windows.create({
                    url: url,
                    type: "popup",
                    height: customHeight,
                    width: customWidth,
                    left: iLeft,
                    top: iTop,
                }, setTemporaryCallInfo);
            }
        } else if (type === 'shareScreen') {
            if (This.openShareScreenTabId > 0) {
                This.extensionNamespace.windows.get(This.openShareScreenTabId, {}, function (win) {
                    if (win) {
                        // 更新窗口
                        console.log('update window')
                        This.extensionNamespace.windows.update(win.id, {
                            focused: true,
                            left: screenLeft || 0,
                            top: screenTop || 0
                        },createShareWindowCallBack)
                    } else {
                        This.extensionNamespace.windows.create({
                            url: url,
                            type: "popup",
                            height: screenHeight || customHeight,
                            width: screenWidth || customWidth,
                            left: screenLeft || 0,
                            top: screenTop || 0
                        },createShareWindowCallBack);
                    }
                })
            } else {
                console.log('open shareScreen page')
                This.extensionNamespace.windows.create({
                    url: url,
                    type: "popup",
                    height: screenHeight || customHeight,
                    width: screenWidth || customWidth,
                    left: screenLeft || 0,
                    top: screenTop || 0
                },createShareWindowCallBack);
            }
        }
    },

    /**
     * 右键自定义菜单触发的呼叫
     * @param info
     * @param tab
     */
    handleMenusClick2DialNumber: function (info, tab) {
        let selectionText = info.selectionText
        console.log('handle menus click to dial number info：', selectionText)
        grpDialingApi.openPopup('../quicall/quicall.html', 'popup', {
            number: selectionText,
            email: ''
        })
    },

    /**
     * 点击带有自定义标签的节点时触发的呼叫
     * @param data
     */
    handleClick2DialNumber: function (data) {
        if (!data || !data.number) {
            // console.log('no number dial')
            return
        }
        console.log('handle click 2 dial number:',)
        grpDialingApi.openPopup('../quicall/quicall.html', 'popup', data)
    },

    /*****************************************************************************************************************/
    /*************************************************获取登录信息******************************************************/
    /*****************************************************************************************************************/
    /**
     * 背景页加载完成后获取已保存的登录信息
     */
    getLoginInfo: function () {
        grpDialingApi.extensionNamespace.storage.local.get('XNewestData', function (obj) {
            if (obj && obj['XNewestData']) {
                grpDialingApi.loginData = obj['XNewestData']
                console.log('get login data form storage:', grpDialingApi.loginData)

                let loginDatas = grpDialingApi.loginData
                if (loginDatas && loginDatas.url && loginDatas.username && loginDatas.password) {
                    // 登录信息都存在的话，自动登录成功后，创建webSocket连接
                    grpDialingApi.permissionCheck(loginDatas.url, grpDialingApi.accountLogin, 'loginStatus')
                }
            }
        });
        grpDialingApi.extensionNamespace.storage.local.get('keepUserInfo', function (obj) {
            console.log('keep user info value:', obj)
            let keepUserInfo = obj['keepUserInfo']
            if (keepUserInfo === 'false' || keepUserInfo === 'true') {
                grpDialingApi.keepUserInfo = keepUserInfo
            } else {
                console.log('keep user info for default.')
                grpDialingApi.keepUserInfo = true
                grpDialingApi.extensionNamespace.storage.local.set({ 'keepUserInfo': true }, function () {
                    console.log('set keep user info default value:' + true);
                });
            }
        })

        grpDialingApi.extensionNamespace.storage.local.get('selectedAccount', function (obj) {
            console.log('selectedAccount value:', obj)
            grpDialingApi.loginData.selectedAccountId = obj['selectedAccount']
        });

        console.log('open db!!')
        grpDialingApi.phoneBookDB?.openDB();
    },

    /**
     * 设置popup 颜色，图标，文字等信息
     * @param config.color badge的背景颜色。
     * @param config.version 设置browser action的badge文字，badge 显示在图标上面。
     * @param config.iconPath 设置browser action的图标
     */
    setBrowserAction: function (config) {
        // TODO: Error at property 'text': Invalid type: expected string, found integer.
        let manifestVersion = config.version
        if (manifestVersion) {
            manifestVersion = manifestVersion.toString()
        }

        let color = config.color
        let iconPath = config.iconPath
        if (grpDialingApi.extensionNamespace.browserAction && grpDialingApi.extensionNamespace.browserAction.setBadgeText) {
            if (iconPath) {
                grpDialingApi.extensionNamespace.browserAction.setIcon({ path: iconPath })
            }
            if (color) {
                grpDialingApi.extensionNamespace.browserAction.setBadgeBackgroundColor({ color: color })
            }
            if (manifestVersion) {
                grpDialingApi.extensionNamespace.browserAction.setBadgeText({ text: manifestVersion })
            }
        } else if (grpDialingApi.extensionNamespace.action && grpDialingApi.extensionNamespace.action.setBadgeText) {
            if (iconPath) {
                grpDialingApi.extensionNamespace.action.setIcon({ path: iconPath })
            }
            if (color) {
                grpDialingApi.extensionNamespace.action.setBadgeBackgroundColor({ color: color })
            }
            if (manifestVersion) {
                grpDialingApi.extensionNamespace.action.setBadgeText({ text: manifestVersion })
            }
        }
    },
}

/*******************************************************************************************************************/

if (chrome) {  // chrome
    grpDialingApi.extensionNamespace = chrome
} else if (browser) {  // firefox
    grpDialingApi.extensionNamespace = browser
}

/******************************************Browser Actions*******************************************************/
/**
 * 当browser action 图标被点击的时候触发，当browser action是一个popup的时候，这个事件将不会被触发。
 */
if (grpDialingApi.extensionNamespace.browserAction) {  // V2
    grpDialingApi.extensionNamespace.browserAction.onClicked.addListener(function (tab) {
        console.log('action onClicked')
        grpDialingApi.openPopup('../quicall/quicall.html')
    })
} else if (grpDialingApi.extensionNamespace.action) {  // V3
    grpDialingApi.extensionNamespace.action.onClicked.addListener(function (tab) {
        console.log('action onClicked')
        grpDialingApi.openPopup('../quicall/quicall.html')
    })
}

/******************************************windows 窗口*******************************************************/
/**
 * 监听窗口创建
 */
grpDialingApi.extensionNamespace.windows.onCreated.addListener(function () {
    console.log('windows onCreated')
})

/**
 * 监听window关闭
 */
grpDialingApi.extensionNamespace.windows.onRemoved.addListener(function (windowId) {
    console.log('windows onRemoved, windowId: ', windowId)
    if(grpDialingApi.openerPopupId === windowId){
        console.log('popup window is closed.')
        grpDialingApi.openerPopupId = null
    }
})

/**
 * 当前获得焦点窗口改变时触发。
 */
grpDialingApi.extensionNamespace.windows.onFocusChanged.addListener(function (windowId) {
    // console.log('windows on focus changed, windowId ', windowId)
})

/******************************************消息监听*******************************************************/
/**
 * 接收content-script的消息
 */
grpDialingApi.extensionNamespace.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('runtime onMessage')
    if (request && request.requestType === 'contentMessage2Background') {
        grpDialingApi.chromeRuntimeOnMessage(request, sendResponse)
    }
});

/**
 * 长连接监听 popup 传递来的消息
 */
grpDialingApi.extensionNamespace.runtime.onConnect.addListener(function (port) {
    console.log('runtime onConnect')
    grpDialingApi.runTimeOnConnect(port)
})

if(grpDialingApi.extensionNamespace.management) {
    /**
     * 当应用或扩展被禁用时触发。
     */
    grpDialingApi.extensionNamespace.management.onDisabled.addListener(function (info) {
        console.log('onDisabled')
        grpDialingApi.extensionNamespace.contextMenus.update('GRP Click2Dial', {
            visible: false
        });
    })

    /**
     * 当应用或扩展被启用时触发。
     */
    grpDialingApi.extensionNamespace.management.onEnabled.addListener(function (info) {
        console.log('onEnabled')
    })

    /**
     * 当应用或扩展被安装时触发。
     */
    grpDialingApi.extensionNamespace.management.onInstalled.addListener(function (info) {
        console.log('onInstalled')
    })

    /**
     * 当应用或扩展被卸载时触发。
     * @param id 被卸载的扩展或应用的id。
     */
    grpDialingApi.extensionNamespace.management.onUninstalled.addListener(function (id) {
        console.log('onUninstalled')

        console.log('all contextMenus removed')
        grpDialingApi.extensionNamespace.contextMenus.removeAll()
    })
}

/**
 * 安装、升级、重载时触发
 */
grpDialingApi.extensionNamespace.runtime.onInstalled.addListener(function (details) {
    console.log('runtime onInstalled')
    grpDialingApi.extensionNamespace.storage.local.get('screen', function (obj) {
        if (obj && obj['screen']) {
            grpDialingApi.screen = obj['screen']
            console.log('get screen data form storage:', grpDialingApi.screen)
        }
    })
})

/**
 * 创建右键菜单
 **/
grpDialingApi.extensionNamespace.contextMenus.create({
    id: 'GRP Click2Dial',
    title: `${grpDialingApi.language['call'] || 'Call'}: %s`,
    contexts: ['selection'],  // 选中文本时显示右键菜单,
    // visible: false, // 控制菜单是否可见,
    // Extensions using event pages or Service Workers cannot pass an onclick parameter to chrome.contextMenus.create. Instead, use the chrome.contextMenus.onClicked event.
    // onclick: grpDialingApi.handleMenusClick2DialNumber
},function () {
    if (grpDialingApi.extensionNamespace.runtime.lastError) {
        console.log('Got expected error: ' + grpDialingApi.extensionNamespace.runtime.lastError.message);
    }
})

/**
 * 右键菜单点击事件
 * **/
grpDialingApi.extensionNamespace.contextMenus.onClicked.addListener(grpDialingApi.handleMenusClick2DialNumber);

/************************************************************************************************/
/**
 * 背景页加载完成，获取登录信息
 */
grpDialingApi.getLoginInfo()

// for debug
if (self) {
    self.grpDialingApi = grpDialingApi
}

if (grpDialingApi && grpDialingApi.extensionNamespace && grpDialingApi.extensionNamespace.notifications) {
    grpDialingApi.extensionNamespace.notifications.onClicked.addListener(grpDialingApi.handleNotificationClick)
    grpDialingApi.extensionNamespace.notifications.onClosed.addListener(grpDialingApi.handleNotificationOnClosed)
    grpDialingApi.extensionNamespace.notifications.onButtonClicked.addListener(grpDialingApi.handleNotificationButtonClicked)
}
