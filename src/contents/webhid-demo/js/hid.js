function WebHID(props){
    this.hidSupport = !(!window.navigator.hid || !window.navigator.hid.requestDevice)
    this.requestParams = (props && props.deviceFilter) || { filters: [ ]  }

    this.EVENTS = []
    this.device = null
    this.pairedDevices = []    // has previously granted the website access to.
    this.availableDevices = []
    this.isParseSuccess = false
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
    offHook: {usageId: 0x080017, usageName: 'Off Hook'},
    ring: {usageId: 0x080018, usageName: 'Ring'},
    // hold: {usageId: 0x080020, usageName: 'Hold'},

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
        log.info('devices:' + JSON.stringify(devices, null, '    '))
        devices.forEach(device => {
            log.log(`paired device HID: ${device.productName}`)
        })
        this.pairedDevices = devices
        return devices
    }catch (e){
        log.error(e)
    }
}

WebHID.prototype.requestHidDevices = async function(data) {
    if (!this.hidSupport) {
        log.warn('The WebHID API is NOT supported!')
        return false
    }
    if(this.device && this.device.opened){
        await this.close()
    }

    log.info('device request params: ' + JSON.stringify(this.requestParams, null, '    '))
    let devices = await navigator.hid.requestDevice(this.requestParams)

    if (!devices || !devices.length) {
        log.warn('No HID devices selected.')
        return false
    }else{
        data.callback(devices)
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
    try{
        this.outputEventGenerators = new Map();
        if (!(this.device && this.device.collections)) {
            log.error('Undefined device collection');
            return
        }

        let telephoneCollection = this.device.collections.find( collection => (collection.usagePage === 11));
        if (!telephoneCollection || Object.keys(telephoneCollection).length === 0) {
            log.error('No telephone collection');
            return
        }

        if (telephoneCollection.inputReports) {
            if(!this.parseInputReports(telephoneCollection.inputReports)){
                log.warn("parse inputReports failed")
                return false;
            }else{
                log.info("parse inputReports success")
            }
        }

        if (telephoneCollection.outputReports) {
            if(!this.parseOutputReports(telephoneCollection.outputReports)){
                log.warn("parse outputReports failed")
                return false
            }else{
                log.info("parse outputReports success")
                return true;
            }
        }
    }catch (e){
        log.error("parseDeviceDescriptors error:" + JSON.stringify(e, null, '    '))
    }
}

WebHID.prototype.parseInputReports = function (inputReports) {
    log.info("start parse inputReports")
    inputReports.forEach(report => {
        if (!report.items.length || report.reportId === undefined) {
            return;
        }

        let usageOffset = 0;

        report.items.forEach(item => {
            if (item.usages === undefined || item.reportSize === undefined || item.reportCount === undefined || item.isAbsolute === undefined ) {
                log.warn("parseInputReports invalid parameters!")
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

    if(this.deviceCommand.inputReport['phoneMute'].reportData === 0 || this.deviceCommand.inputReport['hookSwitch'] === 0) {
        return false
    }else{
        return true
    }
}

WebHID.prototype.parseOutputReports = function (outputReports) {
    log.info("start parse outputReports")
    outputReports.forEach(report => {
        if (!report.items.length || report.reportId === undefined) {
            return;
        }

        let usageOffset = 0;
        let usageOffsetMap = new Map();

        report.items.forEach(item => {
            if (item.usages === undefined || item.reportSize === undefined || item.reportCount === undefined) {
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
                    // case this.deviceUsage.hold.usageId:
                    //     this.deviceCommand.outputReport['hold'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize};
                    //     usageOffsetMap.set(usage, usageOffset + i * item.reportSize);
                    //     break;
                    default:
                        break;
                }
            });

            usageOffset += item.reportCount * item.reportSize;
        });

        let reportLength = usageOffset;
        for (let [usage, offset] of usageOffsetMap) {
            this.outputEventGenerators[usage] = (val) => {
                let reportData = new Uint8Array(reportLength / 8);

                if (offset >= 0 && val) {
                    let byteIndex = Math.trunc(offset / 8);
                    let bitPosition = offset % 8;
                    reportData[byteIndex] = 1 << bitPosition;
                }

                return reportData;
            };
        }
    });

    let mute, ring, hook;
    for(let item in this.outputEventGenerators){
        let newItem = this.getHexByte(item)
        newItem = "0x0" + newItem
        if(this.deviceUsage.mute.usageId === Number(newItem)){
            mute = this.outputEventGenerators[this.deviceUsage.mute.usageId]
        }else if(this.deviceUsage.offHook.usageId === Number(newItem)){
            hook = this.outputEventGenerators[this.deviceUsage.offHook.usageId]
        }else if(this.deviceUsage.ring.usageId === Number(newItem)){
            ring = this.outputEventGenerators[this.deviceUsage.ring.usageId]
        }
    }
    if(mute && ring && hook){
        return true;
    } else{
        return false;
    }
}

WebHID.prototype.open = async function (data){
    log.info("webHid open data:" +  JSON.stringify(data, null, '    '))
    try {
        let isExistDevice = false
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
            this.device = this.availableDevices.find(device =>{
                return device.containerId === data.containerId && device.collections &&
                    device.collections.find(collection => (collection.usagePage === 11))
            })
            if(this.device){
                isExistDevice = true
            }
            log.info('found HID device by containerId: ' + data.containerId)
        }
        if( !isExistDevice && data.label){
            this.device = this.availableDevices.find(device =>{
                return data.label.includes(device.productName) && device.collections &&
                    device.collections.find( collection => (collection.usagePage === 11))
            })
            log.info('found HID device by device label: ' + data.label)
        }
        if(!this.device){
            log.warn('no HID device found for ' + data.label)
            return
        }

        log.info('set current HID device: ' + this.device.productName)
        await this.device.open();

        if(!await this.parseDeviceDescriptors()) {
            this.isParseSuccess = false
            log.warn("Failed to parse webhid")
            return
        }else{
            this.isParseSuccess = true
        }

        if(this.isParseSuccess){
            //  listen for input reports by registering an oninputreport event listener
            this.device.oninputreport = await this.handleInputReport.bind(this)

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
        }
    }catch (e){
        log.error("error content:" + e)
    }
}

WebHID.prototype.close = async function (){
    try{
        log.info('close resetState');
        await this.resetState()
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
    this.device.ring = false;
    // this.device.hold = false;
    this.sendDeviceReport({command: 'onHook'})
    this.sendDeviceReport({command: 'muteOff'})
}

/**
 * host 向耳机发送指令
 * @param data.command
 */

WebHID.prototype.sendDeviceReport = async function (data) {
    log.warn("sendDeviceReport_data:"+ JSON.stringify(data, null, '    '))
    if (!data || !data.command || !this.device || !this.device.opened || !this.isParseSuccess) {
        log.info("There are currently non-compliant conditions")
        return;
    }

    let reportId = 0;
    let oldOffHook;
    let oldMuted;
    let oldRing;
    let oldHold;
    let newOffHook;
    let newMuted;
    let newRing;
    let newHold;
    let offHookReport;
    let muteReport;
    let ringReport;
    let holdReport;
    let reportData = null;
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
        case 'onRing':
        case 'offRing':
            reportId = this.deviceCommand.outputReport['ring'].reportId;
            break;
        // case 'onHold':
        // case 'offHold':
        //     reportId = this.deviceCommand.outputReport['hold'].reportId;
        //     break;
        default:
            log.info('Unknown command ' + data.command);
            return;
    }

    if (reportId == 0) {
        log.warn('Unsupported command ' + data.command);
        return;
    }

    /************************* keep old status ****************************/
    oldMuted  = this.device.muted;
    if (this.device.hookStatus === 'off') {
        oldOffHook = true;
    } else if (this.device.hookStatus === 'on') {
        oldOffHook = false;
    } else {
        log.warn('Invalid hook status');
        return;
    }
    oldRing = this.device.ring;
    // oldHold = this.device.hold;
    log.info('send device command: old_hook=' + oldOffHook + ', old_muted=' + oldMuted + ', old_ring=' + oldRing )

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
        case 'onRing':
            newRing = true;
            break;
        case 'offRing':
            newRing = false
            break;
        // case 'onHold':
        //     newHold = true;
        //     break;
        // case 'offHold':
        //     newHold = false
        //     break;
        default:
            log.info('Unknown command ' + data.command);
            return;
    }
    log.info('send device command: new_hook = ' + newOffHook + ', new_muted = ' + newMuted + ', new_ring = ' + newRing )

    if (newMuted === undefined) {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](oldMuted);
    } else {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](newMuted);
    }

    if (newOffHook === undefined) {
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](oldOffHook);
    } else {
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](newOffHook);
    }

    if (newRing === undefined) {
        ringReport =  this.outputEventGenerators[this.deviceUsage.ring.usageId](oldRing);
    } else {
        ringReport =  this.outputEventGenerators[this.deviceUsage.ring.usageId](newRing);
    }

    // if (newHold === undefined) {
    //     holdReport =  this.outputEventGenerators[this.deviceUsage.hold.usageId](oldHold);
    // } else {
    //     holdReport =  this.outputEventGenerators[this.deviceUsage.hold.usageId](newHold);
    // }

    if (reportId === this.deviceCommand.outputReport['mute'].reportId) {
        if (reportData === null) {
            reportData = new Uint8Array(muteReport);
        } else {
            for (const [i, data] of muteReport.entries()) {
                reportData[i] |= data;
            }
        }
    }

    if (reportId === this.deviceCommand.outputReport['offHook'].reportId) {
        if (reportData === null) {
            reportData = new Uint8Array(offHookReport);
        } else {
            for (const [i, data] of offHookReport.entries()) {
                reportData[i] |= data;
            }
        }
    }

    if (reportId === this.deviceCommand.outputReport['ring'].reportId) {
        if (reportData === null) {
            reportData = new Uint8Array(ringReport);
        } else {
            for (const [i, data] of ringReport.entries()) {
                reportData[i] |= data;
            }
        }
    }

    // if (reportId === this.deviceCommand.outputReport['hold'].reportId) {
    //     if (reportData === null) {
    //         reportData = new Uint8Array(holdReport);
    //     } else {
    //         for (const [i, data] of holdReport.entries()) {
    //             reportData[i] |= data;
    //         }
    //     }
    // }

    log.warn('send device command ' + data.command + ': reportId=' + reportId + ', reportData=' + reportData)
    log.warn('reportData is ' + JSON.stringify(reportData, null, '    '));
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
        case 'onRing':
            this.device.ring = true;
            break;
        case 'offRing':
            this.device.ring = false;
            break;
        // case 'onHold':
        //     this.device.hold = true;
        //     break;
        // case 'offHold':
        //     this.device.hold = false;
        //     break;
        default:
            log.info('Unknown command ' + data.command);
            break;
    }
    log.info('device status after send command: hook=' + this.device.hookStatus + ', muted=' + this.device.muted + ', ring=' + this.device.ring )
}

WebHID.prototype.sendReplyReport = async function (inputReportId, curOffHook, curMuted) {
    let reportId = 0;
    if (this.deviceCommand.outputReport['offHook'].reportId === this.deviceCommand.outputReport['mute'].reportId) {
        reportId = this.deviceCommand.outputReport['offHook'].reportId;
    } else if (inputReportId === this.deviceCommand.inputReport['hookSwitch'].reportId) {
        reportId = this.deviceCommand.outputReport['offHook'].reportId;
    } else if (inputReportId === this.deviceCommand.inputReport['phoneMute'].reportId) {
        reportId = this.deviceCommand.outputReport['mute'].reportId;
    }
    log.info("reportId is " + reportId + " , curOffHook is "+ curOffHook + ", curMuted is " + curMuted)
    if (!this.device || !this.device.opened) {
        return;
    }

    if (reportId === 0 || curOffHook === undefined || curMuted === undefined) {
        return;
    }

    let reportData;
    let muteReport;
    let offHookReport;
    let ringReport;

    if (this.deviceCommand.outputReport['offHook'].reportId === this.deviceCommand.outputReport['mute'].reportId) {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](curOffHook);
        reportData = new Uint8Array(offHookReport);
        for (const [i, data] of muteReport.entries()) {
            reportData[i] |= data;
        }
    } else if (reportId === this.deviceCommand.outputReport['offHook'].reportId) {
        offHookReport = this.outputEventGenerators[this.deviceUsage.offHook.usageId](curOffHook);
        reportData = new Uint8Array(offHookReport);
    } else if (reportId === this.deviceCommand.outputReport['mute'].reportId) {
        muteReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        reportData = new Uint8Array(muteReport);
    }else if (reportId === this.deviceCommand.outputReport['ring'].reportId){
        ringReport = this.outputEventGenerators[this.deviceUsage.mute.usageId](curMuted);
        reportData = new Uint8Array(ringReport);
    }

    log.warn('send device reply: reportId=' + reportId + ', reportData=' + reportData)
    log.info('reportData=' , reportData);
    await this.device.sendReport(reportId, reportData);
}

/** handle  key events
 * @param  event
 * **/
WebHID.prototype.handleInputReport = function (event){
    let This = this
    try {
        const {data, device, reportId} = event
        if (reportId === 0) {
            log.warn("handleInputReport: ignore invalid reportId")
            return;
        }else{
            log.info("handleInputReport_reportId:" + reportId)
        }

        let inputReport = This.deviceCommand.inputReport;
        log.info("current inputReport:" + JSON.stringify(inputReport, null, '    '))
        if (reportId !== inputReport['hookSwitch'].reportId && reportId !== inputReport['phoneMute'].reportId) {
            log.warn("handleInputReport:ignore unknown reportId")
            return;
        }

        let hookStatusChange = false;
        let muteStatusChange = false;

        let reportData = new Uint8Array(data.buffer);
        let needReply = true;

        log.warn('recv device event: reportId=' + reportId + ', reportData=' + reportData + ', needReply=' + needReply)

        if (reportId === inputReport['hookSwitch'].reportId) {
            let item = inputReport['hookSwitch'];
            let byteIndex = Math.trunc(item.usageOffset / 8);
            let bitPosition = item.usageOffset % 8;
            let usageOn = (data.getUint8(byteIndex) & (0x01 << bitPosition)) !== 0;
            log.info('recv hookSwitch ', usageOn ? 'off' : 'on');
            if (inputReport['hookSwitch'].isAbsolute) {
                if (This.device.hookStatus === 'on' && usageOn) {
                    This.device.hookStatus = 'off';
                    hookStatusChange = true;
                } else if (This.device.hookStatus === 'off' && !usageOn) {
                    This.device.hookStatus = 'on';
                    hookStatusChange = true;
                }
            } else if (usageOn) {
                This.device.hookStatus = This.device.hookStatus === 'off'?  'on': 'off';
                hookStatusChange = true;
            }
        }

        let oldMute = This.device.muted;
        if (reportId === inputReport['phoneMute'].reportId) {
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

        if (muteStatusChange) {  // 静音键状态变化
            inputReportData.eventName = 'ondevicemuteswitch';
            inputReportData.isMute = This.device.muted;
            log.warn('mute status change: ' + This.device.muted)
        }

        This.inputReportRetFunc && This.inputReportRetFunc(inputReportData)

        log.warn('hookStatusChange=' + hookStatusChange + ', muteStatusChange=' + muteStatusChange + ', needReply=' + needReply );
        if (needReply && (hookStatusChange || muteStatusChange)) {
            let newOffHook;
            if (this.device.hookStatus === 'off') {
                newOffHook = true;
            } else if (this.device.hookStatus === 'on') {
                newOffHook = false;
            } else {
                log.warn('Invalid hook status');
                return;
            }
            log.info("newOffHook:" + newOffHook)
            This.sendReplyReport(reportId, newOffHook, This.device.muted);
        }
    }catch (e){
        log.error(e)
    }
}
