/*
 * only support:
 * 1.GUV 3000 {productId: 35, vendorId: 11179}
 * 2.GUV 3005 {productId: 36,vendorId: 11179}
 */

if (!('hid' in navigator)) {
    log.warn('WebHID is not available yet.')
}

function WebHID(props){
    this.hidSupport = !(!window.navigator.hid || !window.navigator.hid.requestDevice)
    this.requestParams = (props && props.deviceFilter) || { filters: [ ]  }
    this.EVENTS = []
    this.device = null
    this.pairedDevices = []    // has previously granted the website access to.
    this.availableDevices = []
    this.inputReportRetFunc = props && props.callback
    log.info('hid device load')
    this.load()
}

WebHID.prototype.load = async function(){
    await this.getPairedDevices()
    if(window.ipcRenderer){
        log.info('request hid devices')
        await this.requestHidDevices()
    }
}

/** used to parse HIDDevice UsageId collections
 ** outputReports 存在 mute 和 offHook
 ** inputReports  存在 hookSwitch 和 phoneMute
 **/
WebHID.prototype.deviceUsage = {
    /********** outputReports *************/
    mute: {usageId: 0x080009, usageName: 'Mute'},
    offHook: {usageId: 0x080017, usageName: 'Off-Hook'},
    ring: {usageId: 0x080018, usageName: 'Ring'},

    /********** inputReports ************/
    hookSwitch: {usageId: 0x0B0020, usageName: 'Hook Switch'},
    phoneMute: {usageId: 0x0B002F, usageName: 'Phone Mute'},
}

/** used to send/recv reportId
 **/
WebHID.prototype.deviceCommand = {
    outputReport: {
        'mute': {reportId: 0, usageOffset: -1},
        'offHook': {reportId: 0, usageOffset: -1},
        'ring': {reportId: 0, itemIndex: -1},
    },
    inputReport: {
        'hookSwitch': {reportId: 0, usageOffset: -1, isAbsolute: false},
        'phoneMute': {reportId: 0, usageOffset: -1, isAbsolute: false},
    }
}

/**
 *  Get all devices the user has previously granted the website access to.
 * @returns {Promise<*>}
 */
WebHID.prototype.getPairedDevices = async function (){
    try{
        let devices = await navigator.hid.getDevices()
        log.info('devices:', devices)
        devices.forEach(device => {
            log.log(`paired device HID: ${device.productName}`)
        })
        this.pairedDevices = devices
        return devices
    }catch (e){
        log.error(e)
    }
}

WebHID.prototype.requestHidDevices = async function (){
    if (!this.hidSupport) {
        log.warn('The WebHID API is NOT supported!')
        return false
    }
    if(this.device && this.device.opened){
        this.close()
    }

    log.info('device request params: ' + JSON.stringify(this.requestParams, null, '    '))
    let devices = await navigator.hid.requestDevice(this.requestParams)
    if (!devices || !devices.length) {
        log.warn('No HID devices selected.')
        return false
    }
    devices.forEach(device => {
        log.info(`request device HID: ${device.productName}`)
    })
    this.availableDevices = devices
    // await this.getPairedDevices()
    return true
}

/**
 * 获取十六进制字节
 * @param data
 * @returns {string}
 */
WebHID.prototype.getHexByte = function (data){
    let hex = Number(data).toString(16)
    while (hex.length < 2)
        hex = '0' + hex
    return hex
}

/**
 * data 转换为十六进制字节的字符串
 * @param data
 * @returns {string}
 */
WebHID.prototype.getHexByteStr = function (data){
    let string = ''
    for (let i = 0; i < data.byteLength; ++i){
        string += this.getHexByte(data.getUint8(i)) + ' '
    }
    return string
}


/**  parse HIDDevice about inputeReports and outputReports
 **/
WebHID.prototype.parseDeviceDescriptors = function () {
    this.outputEventGenerators = new Map();

    if (this.device.collections === undefined) {
        log.error('Undefined device collection');
        throw new Error('Undefined device collection');
    }

    let telephoneCollection = this.device.collections.find( collection => (collection.usagePage === 11));
    if (telephoneCollection === undefined) {
        log.error('No telephone collection');
        throw new Error('No telephone collection');
    }

    if (telephoneCollection.inputReports) {
        this.parseInputReports(telephoneCollection.inputReports);
    }

    if (telephoneCollection.outputReports) {
        this.parseOutputReports(telephoneCollection.outputReports);
    }
}

WebHID.prototype.parseInputReports = function (inputReports) {
    log.info("start parse inputReports")
    inputReports.forEach(report => {
        if (report.items === undefined || report.reportId === undefined) {
            return;
        }

        let usageOffset = 0;

        report.items.forEach(item => {
            if (item.usages === undefined || item.reportSize === undefined || item.reportCount === undefined || item.isAbsolute === undefined ) {
                log.warn("parse InputReports invalid parameters!" )
                return;
            }

            item.usages.forEach((usage, i) => {
                switch (usage) {
                    case this.deviceUsage.hookSwitch.usageId:
                        this.deviceCommand.inputReport['hookSwitch'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize, isAbsolute: item.isAbsolute};
                        break;
                    case this.deviceUsage.phoneMute.usageId:
                        this.deviceCommand.inputReport['phoneMute'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize, isAbsolute: item.isAbsolute};
                        break;
                    default:
                        break;
                }
            });

            usageOffset += item.reportCount * item.reportSize;
        });
    });
}

WebHID.prototype.parseOutputReports = function (outputReports) {
    log.info("start parse outputReports")
    outputReports.forEach(report => {
        if (report.items === undefined || report.reportId === undefined) {
            return;
        }

        let usageOffset = 0;
        let usageOffsetMap = new Map();
        report.items.forEach(item => {
            if ( item.usages === undefined || item.reportSize === undefined ||  item.reportCount === undefined  ) {
                log.warn("parseOutputReports  invalid parameters!")
                return;
            }

            item.usages.forEach((usage, i) => {
                switch (usage) {
                    case this.deviceUsage.mute.usageId:
                        this.deviceCommand.outputReport['mute'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize};
                        usageOffsetMap.set(usage, usageOffset + i * item.reportSize);
                        break;
                    case this.deviceUsage.offHook.usageId:
                        this.deviceCommand.outputReport['offHook'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize};
                        usageOffsetMap.set(usage, usageOffset + i * item.reportSize);
                        break;
                    case this.deviceUsage.ring.usageId:
                        this.deviceCommand.outputReport['ring'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize};
                        usageOffsetMap.set(usage, usageOffset + i * item.reportSize);
                        break;
                    default:
                        break;
                }
            });

            usageOffset += item.reportCount * item.reportSize;
        });

        for (let [usage, offset] of usageOffsetMap) {
            this.outputEventGenerators[usage] = (val) => {
                let reportData = new Uint8Array(usageOffset / 8);
                if (offset >= 0 && val) {
                    let byteIndex = Math.trunc(offset / 8);
                    let bitPosition = offset % 8;
                    reportData[byteIndex] = 1 << bitPosition;
                }
                return reportData;
            };
        }
    });
}

WebHID.prototype.open = async function (data){
    try {
        if (!data) {
            log.warn('invalid parameter of device')
            return
        }
        if(window.ipcRenderer){
            // todo: Need to request the device list again after the device is unplugged
            await this.requestHidDevices()
        }
        if(!this.availableDevices || !this.availableDevices.length){
            log.info('No HID device to request')
            return
        }

        if(data.containerId){
            this.device = this.availableDevices.find(device =>{return device.containerId === data.containerId})
            log.info('found HID device by containerId: ' + data.containerId)
        }else if(data.label){
            this.device = this.availableDevices.find(device =>{return data.label.includes(device.productName)})
            log.info('found HID device by device label: ' + data.label)
        }
        if(!this.device){
            log.warn('no HID device found for ' + data.label)
        }

        log.info('set current HID device: ' + this.device.productName)
        await this.device.open();

        this.parseDeviceDescriptors();

        //  listen for input reports by registering an oninputreport event listener
        this.device.oninputreport = this.handleInputReport.bind(this)

        // reset device status
        log.info('open resetState');
        await this.resetState()

        // Synchronize the status of the current call line
        if(data.hookStatus === 'off'){
            log.warn('Synchronous off-hook status')
            await this.sendDeviceReport({ command: 'offHook' })
        }
        if(data.muted === true){
            log.warn('Synchronous mute status')
            await this.sendDeviceReport({ command: 'muteOn' })
        }
    }catch (e){
        log.error(e)
    }
}

WebHID.prototype.close = async function (){
    try{
        log.info('close resetState');
        this.resetState()
        if(this.availableDevices){
            log.info('clear available devices list')
            this.availableDevices = []
        }

        if(!this.device){
            return
        }
        log.info('hid device close')
        if (this.device && this.device.opened) {
            log.info('device is open, now close.')
            await this.device.close()
        }
        this.device.oninputreport = null
        this.device = null
    }catch (e){
        log.error(e)
    }
}

WebHID.prototype.resetState = function(){
    if(!this.device || !this.device.opened){
        return
    }
    log.info('state reset.')
    this.device.hookStatus = 'on';
    this.device.muted = false;
    this.sendDeviceReport({command: 'onHook'})
    this.sendDeviceReport({command: 'muteOff'})
}

/**
 * host 向耳机发送指令
 * @param data.command
 */

WebHID.prototype.sendDeviceReport = async function (data) {
    log.warn("sendDeviceReport_data:"+ JSON.stringify(data, null, '    '))
    if (!data || !data.command || !this.device || !this.device.opened) {
        return;
    }

    if(data.command === 'incomingCall'){
        console.warn(" incomingCall incomingCall incomingCall incomingCall  incomingCall ")
        data.command = "ring"
    }

    let reportId = 0;
    let oldOffHook;
    let oldMuted;
    let newOffHook;
    let newMuted;
    let newRing;
    let reportData;
    let offHookReport;
    let muteReport;
    let ringReport;

    /************************ match report id ************************/
    switch (data.command) {
        case 'muteOn':
        case 'muteOff':
            reportId = this.deviceCommand.outputReport['mute'].reportId;
            break;
        case 'onHook':
        case 'offHook':
            reportId = this.deviceCommand.outputReport['offHook'].reportId;
            break;
        case 'ring':
            reportId = this.deviceCommand.outputReport['ring'].reportId;
            break;
        case 'onRing':
        case 'offRing':
            reportId = this.deviceCommand.outputReport['ring'].reportId;
            break;
        default:
            log.info('Unknown command ' + data.command);
            return;
    }

    if (reportId == 0 )  {
        log.warn('Unsupported command ' + data.command);
        return;
    }

    /************************* keep old status ****************************/
    oldMuted  = this.device.muted;
    if (this.device.hookStatus == 'off') {
        oldOffHook = true;
    } else if (this.device.hookStatus == 'on') {
        oldOffHook = false;
    } else {
        log.warn('Invalid hook status');
        return;
    }
    log.info('send device command: old_hook=' + oldOffHook + ', old_muted=' + oldMuted)

    /*********************  get new status  *****************************/
    switch (data.command) {
        case 'muteOn':
            newMuted = true;
            break;
        case 'muteOff':
            newMuted = false;
            break;
        case 'onHook':
            newOffHook = false;
            break;
        case 'offHook':
            newOffHook = true;
            break;
        case 'ring':
            newRing = true;

        case 'onRing':
            newRing = true;
            break;
        case 'offRing':
            newRing = false
            break;
        default:
            log.info('Unknown command ' + data.command);
            return;
    }
    log.info('send device command: new_hook = ' + newOffHook + ', new_muted = ' + newMuted + ', new_ring = ' + newRing)


    if (this.deviceCommand.outputReport['mute'].reportId == this.deviceCommand.outputReport['offHook'].reportId) {
        log.info("reportId of mute and offhook  are same")

        if (!newMuted) {
            // muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](oldMuted);
            muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](newMuted);
        } else {
            muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](newMuted);
        }

        if (!newOffHook) {
            // offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](oldOffHook);
            offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](newOffHook);
        } else {
            offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](newOffHook);
        }

        // if(!newRing){
        //     ringReport =  this.outputEventGenerators[this.deviceUsage.ring.usageId](newRing);
        // }else{
        //     ringReport =  this.outputEventGenerators[this.deviceUsage.ring.usageId](newRing)
        // }
        reportData = new Uint8Array(offHookReport);
        for (const [i, data] of muteReport.entries()) {
            reportData[i] |= data;
        }
        // for(const [j, content] of ringReport.entries()){
        //     reportData[j] |= content;
        // }
    } else if (reportId == this.deviceCommand.outputReport['offHook'].reportId) {
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](newOffHook);
        reportData = new Uint8Array(offHookReport);
    } else if (reportId == this.deviceCommand.outputReport['mute'].reportId) {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](newMuted);
        reportData = new Uint8Array(muteReport);
        // if(!newMuted){
        //     // muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](newMuted);
        //     // reportData = new Uint8Array(muteReport);
        //     for(const [j, content] of muteReport.entries()){
        //         reportData[j] |= content;
        //     }
        // }else{
        //     // muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](newMuted);
        //     // reportData = new Uint8Array(muteReport);
        // }
    } else if(reportId == this.deviceCommand.outputReport['ring'].reportId){
        ringReport = this.outputEventGenerators[this.deviceUsage.ring.usageId](newRing);
        console.warn("ringReport:" + ringReport)
        reportData = new Uint8Array(ringReport);

        if(!newRing){
            console.warn("ring come in; ring  come in")
            for(const [j, content] of ringReport.entries()){
                reportData[j] |= content;
            }
        }
        console.warn("ringReport:" + ringReport)
        console.warn("reportData:" + reportData)
    }

    log.warn('send device command ' + data.command + ': reportId=' + reportId + ', reportData=' + reportData)
    await this.device.sendReport(reportId, reportData);

    /******************* update new status ***************************/
    switch (data.command) {
        case 'muteOn':
            this.device.muted = true;
            break;
        case 'muteOff':
            this.device.muted = false;
            break;
        case 'onHook':
            this.device.hookStatus = 'on';
            break;
        case 'offHook':
            this.device.hookStatus = 'off';
            break;
        case 'ring':
            this.device.ringStatus = 'incoming';
            break;
        case 'onRing':
            this.device.ringStatus = 'on';
            break;
        case 'offRing':
            this.device.ringStatus = 'off';
            break;
        default:
            log.info('Unknown command ' + data.command);
            break;
    }
    log.info('device status after send command: hook=' + this.device.hookStatus + ', muted=' + this.device.muted)
}

WebHID.prototype.sendReplyReport = async function (reportId, curOffHook, curMuted) {
    log.info("reportId is " + reportId + " , curOffHook is "+ curOffHook + ", curMuted is " + curMuted)
    if (!this.device || !this.device.opened) {
        return;
    }

    if (reportId == 0 || curOffHook == undefined || curMuted == undefined) {
        return;
    }

    let reportData;
    let muteReport;
    let offHookReport;
    let ringReport;
    if (this.deviceCommand.outputReport['offHook'].reportId == this.deviceCommand.outputReport['mute'].reportId) {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](curOffHook);
        reportData = new Uint8Array(offHookReport);
        for (const [i, data] of muteReport.entries()) {
            reportData[i] |= data;
        }
        // ringReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        // for(const [j, content] of ringReport.entries()){
        //     reportData[j] |= content;
        // }

    } else if (reportId == this.deviceCommand.outputReport['offHook'].reportId) {
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](curOffHook);
        reportData = new Uint8Array(offHookReport);
    } else if (reportId == this.deviceCommand.outputReport['mute'].reportId) {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        reportData = new Uint8Array(muteReport);
    } else if (reportId == this.deviceCommand.outputReport['ring'].reportId){
        ringReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        reportData = new Uint8Array(ringReport);
    }

    log.warn('send device reply: reportId=' + reportId + ', reportData=' + reportData)
    await this.device.sendReport(reportId, reportData);
}

/** handle  key events
 * @param  event
 * **/
WebHID.prototype.handleInputReport = function (event){
    let This = this
    console.warn("handle InputReport event:" , event)
    log.info("handle InputReport event:" + JSON.stringify(event, null, '    '))
    try {
        const {data, device, reportId} = event
        if (reportId == 0) {
            log.warn("handleInputReport: ignore invalid reportId")
            return;
        }

        let inputReport = This.deviceCommand.inputReport;
        log.info("current inputReport:" + JSON.stringify(inputReport, null, '    '))
        if (reportId != inputReport['hookSwitch'].reportId && reportId != inputReport['phoneMute'].reportId) {
            log.warn("handleInputReport:ignore unknown reportId")
            return;
        }

        let hookStatusChange = false;
        let muteStatusChange = false;
        let needReply = false;
        let canReply = false;

        let vendorId = device.vendorId;
        let reportData = new Uint8Array(data.buffer);
        if (vendorId == 2830) {                          // Jabra
            needReply = true;
        }
        log.warn('recv device event: reportId=' + reportId + ', reportData=' + reportData)

        if (reportId == inputReport['hookSwitch'].reportId) {
            let item = inputReport['hookSwitch'];
            let byteIndex = Math.trunc(item.usageOffset / 8);
            let bitPosition = item.usageOffset % 8;
            let usageOn = (data.getUint8(byteIndex) & (0x01 << bitPosition)) !== 0;
            console.warn("usageOn:",usageOn)
            log.info('recv hookSwitch ', usageOn ? 'off' : 'on')

            if (inputReport['hookSwitch'].isAbsolute) {
                if (This.device.hookStatus == 'on' && usageOn) {
                    This.device.hookStatus = 'off';
                    hookStatusChange = true;
                } else if (This.device.hookStatus == 'off' && !usageOn) {
                    This.device.hookStatus = 'on';
                    hookStatusChange = true;
                }
            } else if (usageOn) {
                if (This.device.hookStatus === 'off') {
                    This.device.hookStatus = 'on';
                } else {
                    This.device.hookStatus = 'off';
                }
                hookStatusChange = true;
            } else if (needReply) {
                log.warn('canReply');
                canReply = true;
            }
        }

        let oldMute = This.device.muted;
        if (reportId == inputReport['phoneMute'].reportId) {
            let item = inputReport['phoneMute'];
            let byteIndex = Math.trunc(item.usageOffset / 8);
            let bitPosition = item.usageOffset % 8;
            let usageOn = (data.getUint8(byteIndex) & (0x01 << bitPosition)) !== 0;
            log.info('recv phoneMute ', usageOn ? 'on' : 'off');
            if (inputReport['phoneMute'].isAbsolute) {
                if (This.device.muted != usageOn) {
                    This.device.muted = usageOn;
                    muteStatusChange = true;
                }
            } else if (usageOn) {
                This.device.muted = !This.device.muted;
                muteStatusChange = true;
            } else if (needReply) {
                log.warn('canReply');
                canReply = true;
            }
        }

        let inputReportData = {
            productName: device.productName,
            reportId: This.getHexByte(reportId),
            reportData: reportData,
        }

        if (hookStatusChange) {  // 接听键状态变化
            inputReportData.eventName = 'ondevicehookswitch';
            inputReportData.hookStatus = This.device.hookStatus;
            log.warn('hook status change: ' + This.device.hookStatus)
        }

        if (muteStatusChange) {   // 静音键状态变化
            inputReportData.eventName = 'ondevicemuteswitch';
            inputReportData.isMute = This.device.muted;
            log.warn('mute status change: ' + This.device.muted)
        }
        let newMute = This.device.muted;

        This.inputReportRetFunc && This.inputReportRetFunc(inputReportData)

        log.warn('hookStatusChange=' + hookStatusChange + ', muteStatusChange=' + muteStatusChange + ', canReply=' + canReply);
        if (needReply && (hookStatusChange || muteStatusChange || canReply)) {
            console.warn("needReply  needReply needReply needReply")
            let newOffHook;
            if (this.device.hookStatus == 'off') {
                newOffHook = true;
            } else if (this.device.hookStatus == 'on') {
                newOffHook = false;
            } else {
                log.warn('Invalid hook status');
                return;
            }

            This.sendReplyReport(reportId, newOffHook, newMute);
        }
    }catch (e){
        log.error(e)
    }
}
