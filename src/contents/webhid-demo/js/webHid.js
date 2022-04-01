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
	this.requestParams = (props && props.deviceFilter) || {
		filters: [
		]
	}
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

//+by xxlang@2022-03-14 {
// used to parse collections
WebHID.prototype.deviceUsage = {
	// outputReports
	mute: {usageId: 0x080009, usageName: 'Mute'},
	offHook: {usageId: 0x080017, usageName: 'Off-Hook'},
	
	// inputReports
	hookSwitch: {usageId: 0x0B0020, usageName: 'Hook Switch'},
	phoneMute: {usageId: 0x0B002F, usageName: 'Phone Mute'},
}

// used to send/recv report
WebHID.prototype.deviceCommand = {
	outputReport: {
		'mute': {reportId: 0, usageOffset: -1},
		'offHook': {reportId: 0, usageOffset: -1},
	},
	inputReport: {
		'hookSwitch': {reportId: 0, usageOffset: -1, isAbsolute: false},
		'phoneMute': {reportId: 0, usageOffset: -1, isAbsolute: false},
	}
}
//+by xxlang@2022-03-14 }

WebHID.prototype.deviceStatus = {
	onHook: 0x01,
	muteOnHook: 0x02,
	offHook: 0x03,
	muteOffHook: 0x04,
	onHookMute: 0x05,
	onHookUnmute: 0x06,
	offHookMute: 0x07,
	offHookUnmute: 0x08,
	onHookVolumeUp: 0x09,
	onHookVolumeDown: 0x0a,
	offHookVolumeUp: 0x0b,
	offHookMuteVolumeUp: 0x0c,
	offHookVolumeDown: 0x0d,
	offHookMuteVolumeDown: 0x0e,
}

/**
 *  Get all devices the user has previously granted the website access to.
 * @returns {Promise<*>}
 */
WebHID.prototype.getPairedDevices = async function (){
	try{
		let devices = await navigator.hid.getDevices()
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

//+by xxlang@2022-03-14 {
WebHID.prototype.parseDeviceDescriptors = function () {
	this.outputEventGenerators = new Map();

	if (this.device.collections === undefined) {
		log.error('Undefined device collection');
		throw new Error('Undefined device collection');
	}

	const telephonyCollection = this.device.collections.find(
		collection => (collection.usagePage === 11)
	);

	if (telephonyCollection === undefined) {
		log.error('No telephony collection');
		throw new Error('No telephony collection');
	}
	
	if (telephonyCollection.inputReports) {
		this.parseInputReports(telephonyCollection.inputReports);
	}

	if (telephonyCollection.outputReports) {
		this.parseOutputReports(telephonyCollection.outputReports);
	}
}

WebHID.prototype.parseInputReports = function (inputReports) {
	inputReports.forEach(report => {
		if (report.items === undefined || report.reportId === undefined) {
			return;
		}
	
		let usageOffset = 0;
	
		report.items.forEach(item => {
			if (
				item.usages === undefined ||
				item.reportSize === undefined ||
				item.reportCount === undefined ||
				item.isAbsolute === undefined
			) {
				return;
			}
		
			item.usages.forEach((usage, i) => {
				switch (usage) {
					case WebHID.prototype.deviceUsage.hookSwitch.usageId:
						this.deviceCommand.inputReport['hookSwitch'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize, isAbsolute: item.isAbsolute};
						break;
					case WebHID.prototype.deviceUsage.phoneMute.usageId:
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
	outputReports.forEach(report => {
		if (report.items === undefined || report.reportId === undefined) {
			return;
		}
	
		let usageOffset = 0;
		let usageOffsetMap = new Map();

		report.items.forEach(item => {
			if (
				item.usages === undefined ||
				item.reportSize === undefined ||
				item.reportCount === undefined
	      ) {
				return;
			}

			item.usages.forEach((usage, i) => {
				switch (usage) {
					case WebHID.prototype.deviceUsage.mute.usageId:
						this.deviceCommand.outputReport['mute'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize};
						usageOffsetMap.set(usage, usageOffset + i * item.reportSize);
						break;
					case WebHID.prototype.deviceUsage.offHook.usageId:
						this.deviceCommand.outputReport['offHook'] = {reportId: report.reportId, usageOffset: usageOffset + i * item.reportSize};
						usageOffsetMap.set(usage, usageOffset + i * item.reportSize);
						break;
					default:
						break;
				}
			});

			usageOffset += item.reportCount * item.reportSize;
		});

		const reportLength = usageOffset;
		for (let [usage, offset] of usageOffsetMap) {
			this.outputEventGenerators[usage] = (val) => {
				const reportData = new Uint8Array(reportLength / 8);
			
				if (offset >= 0 && val) {
					const byteIndex = Math.trunc(offset / 8);
					const bitPosition = offset % 8;
					reportData[byteIndex] = 1 << bitPosition;
				}
				
				return reportData;
			};
		}
	});
}
//+by xxlang@2022-03-14 }

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

		this.parseDeviceDescriptors(); //+by xxlang@2022-03-14

		//  listen for input reports by registering an oninputreport event listener
		this.device.oninputreport = this.handleInputReport.bind(this)

		// reset device status
//		log.info('open resetState');
//		this.resetState()

		// Synchronize the status of the current call line
		if(data.hookStatus === 'off'){
			log.warn('Synchronous off-hook status')
			this.sendDeviceReport({ command: 'offHook' })
		}
		if(data.muted === true){
			log.warn('Synchronous mute status')
			this.sendDeviceReport({ command: 'muteOn' })
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
//+by xxlang@2022-03-14 {
WebHID.prototype.sendOffHookMute = async function (offHook, mute) {
}

WebHID.prototype.sendDeviceReport = async function (data) {
	log.warn("data:",data)
	if (!data || !data.command || !this.device || !this.device.opened) {
		return;
	}

	// match report id
	let reportId = 0;
	switch (data.command) {
		case 'muteOn':
		case 'muteOff':
			reportId = this.deviceCommand.outputReport['mute'].reportId;
			break;
		case 'onHook':
		case 'offHook':
			reportId = this.deviceCommand.outputReport['offHook'].reportId;
			break;
		default:
			log.info('Unknown command ' + data.command);
			return;
	}
	
	if (reportId == 0) {
		log.warn('Unsupported command ' + data.command);
		return;
	}

	// keep old status
	let oldOffHook;
	if (this.device.hookStatus == 'off') {
		oldOffHook = true;
	} else if (this.device.hookStatus == 'on') {
		oldOffHook = false;
	} else {
		log.warn('Invalid hook status');
		return;
	}
	let oldMuted = this.device.muted;
	log.info('send device command: old_hook=' + oldOffHook + ', old_muted=' + oldMuted)

	// get new status
	let newOffHook;
	let newMuted;
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
		default:
			log.info('Unknown command ' + data.command);
			return;
	}
	log.info('send device command: new_hook=' + newOffHook + ', new_muted=' + newMuted)
	
	let reportData;
	if (this.deviceCommand.outputReport['mute'].reportId == this.deviceCommand.outputReport['offHook'].reportId) {
		let muteReport;
		if (newMuted == undefined) {
			muteReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.mute.usageId](oldMuted);
		} else {
			muteReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.mute.usageId](newMuted);
		}

		if (newOffHook == undefined) {
			offHookReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.offHook.usageId](oldOffHook);
		} else {
			offHookReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.offHook.usageId](newOffHook);
		}

		reportData = new Uint8Array(offHookReport);
		for (const [i, data] of muteReport.entries()) {
			reportData[i] |= data;
		}
	} else if (reportId == this.deviceCommand.outputReport['offHook'].reportId) {
		const offHookReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.offHook.usageId](newOffHook);
		reportData = new Uint8Array(offHookReport);
	} else if (reportId == this.deviceCommand.outputReport['mute'].reportId) {
		const muteReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.mute.usageId](newMuted);
		reportData = new Uint8Array(muteReport);
	}

	log.warn('send device command ' + data.command + ': reportId=' + reportId + ', reportData=' + reportData)
    log.warn('reportData is ' + JSON.stringify(reportData, null, '    '));
	await this.device.sendReport(reportId, reportData);

	// update new status
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
		default:
			log.info('Unknown command ' + data.command);
			break;
	}
	log.info('device status after send command: hook=' + this.device.hookStatus + ', muted=' + this.device.muted)
}

WebHID.prototype.sendReplyReport = async function (reportId, curOffHook, curMuted) {
	if (!this.device || !this.device.opened) {
		return;
	}
	
	if (reportId == 0 || curOffHook == undefined || curMuted == undefined) {
		return;
	}

	let reportData;
	if (this.deviceCommand.outputReport['offHook'].reportId == this.deviceCommand.outputReport['mute'].reportId) {
		let muteReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.mute.usageId](curMuted);
		let offHookReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.offHook.usageId](curOffHook);
		reportData = new Uint8Array(offHookReport);
		for (const [i, data] of muteReport.entries()) {
			reportData[i] |= data;
		}
	} else if (reportId == this.deviceCommand.outputReport['offHook'].reportId) {
		const offHookReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.offHook.usageId](curOffHook);
		reportData = new Uint8Array(offHookReport);
	} else if (reportId == this.deviceCommand.outputReport['mute'].reportId) {
		const muteReport = this.outputEventGenerators[WebHID.prototype.deviceUsage.mute.usageId](curMuted);
		reportData = new Uint8Array(muteReport);
	}

	log.warn('send device reply: reportId=' + reportId + ', reportData=' + reportData)
	log.info('reportData=' , reportData);
	await this.device.sendReport(reportId, reportData);
}

WebHID.prototype.handleInputReport = function (event){
	try {
		let This = this
		const {data, device, reportId} = event
		let vendorId = device.vendorId;
		let reportData = new Uint8Array(data.buffer);
		log.warn('recv device event: reportId=' + reportId + ', reportData=' + reportData)
		log.info("handleInputReport _data:" , data);

		let inputReport = This.deviceCommand.inputReport;

		let hookStatusChange = false
		let muteStatusChange = false

		let needReply = false;
		if (vendorId == 2830) { // Jabra
			needReply = true;
		}
		let canReply = false;
		
		if (reportId == 0) {
				return; // ignore invalid reportId
		}

		if (reportId != inputReport['hookSwitch'].reportId && reportId != inputReport['phoneMute'].reportId) {
				return; // ignore unknown reportId
		}

		if (reportId == inputReport['hookSwitch'].reportId) {
			const item = inputReport['hookSwitch'];
			const byteIndex = Math.trunc(item.usageOffset / 8);
			const bitPosition = item.usageOffset % 8;
			const usageOn = (data.getUint8(byteIndex) & (0x01 << bitPosition)) !== 0;
			log.info('recv hookSwitch ', usageOn ? 'off' : 'on');
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
			const item = inputReport['phoneMute'];
			const byteIndex = Math.trunc(item.usageOffset / 8);
			const bitPosition = item.usageOffset % 8;
			const usageOn = (data.getUint8(byteIndex) & (0x01 << bitPosition)) !== 0;
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

		if (muteStatusChange) {  // 静音键状态变化
			inputReportData.eventName = 'ondevicemuteswitch';
			inputReportData.isMute = This.device.muted;
			log.warn('mute status change: ' + This.device.muted)
		}
		let newMute = This.device.muted;

		This.inputReportRetFunc && This.inputReportRetFunc(inputReportData)

		log.warn('hookStatusChange=' + hookStatusChange + ', muteStatusChange=' + muteStatusChange + ', canReply=' + canReply);
		if (needReply && (hookStatusChange || muteStatusChange || canReply)) {
			let newOffHook;
			if (this.device.hookStatus == 'off') {
				newOffHook = true;
			} else if (this.device.hookStatus == 'on') {
				newOffHook = false;
			} else {
				log.warn('Invalid hook status');
				return;
			}

			webHid.sendReplyReport(reportId, newOffHook, newMute);
		}
	}catch (e){
		log.error(e)
	}
}
//+by xxlang@2022-03-14 }
