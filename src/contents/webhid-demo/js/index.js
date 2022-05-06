/* Log Debug Start */
let log = {}
log.debug = window.debug('webHid:DEBUG')
log.log = window.debug('webHid:LOG')
log.info = window.debug('webHid:INFO')
log.warn = window.debug('webHid:WARN')
log.error = window.debug('webHid:ERROR')
/* Log Debug End */

let audioInputSelect = document.querySelector('select#audioSource');
let audioOutputSelect = document.querySelector('select#audioOutput');
let videoSelect = document.querySelector('select#videoSource');
let selectors = [audioInputSelect, audioOutputSelect, videoSelect];
// let startBtn = document.getElementById('startButton');
// let stopBtn = document.getElementById('stopButton');
let currentLocalDevices,currentVendorId;
let audioStream, audioStream2;
let devices = {
    cameras: [],
    microphones:[],
    speakers: []
}

let webHid
let hookSwitchInput = document.getElementById('hook-switch')
let phoneMuteInput = document.getElementById('phone-mute')
let incomingCallBtn = document.getElementById('btnIncomingCall')

const startButton = document.querySelector('button#deviceStart');
const stopButton = document.querySelector('button#deviceStop');
let localStream;
const startButton2 = document.querySelector('button#deviceStart2');
const stopButton2 = document.querySelector('button#deviceStop2');
let localStream2;

let logElement = document.getElementById('logs');
function showLog(msg) {
	console.log(msg);
	let line = document.createElement('div');
	line.textContent = msg;
	logElement.appendChild(line);
}
function mousedown(target) {
	target.classList.remove('mousedown')
	target.classList.add('mouseup')
}

function mouseup(target) {
	target.classList.remove('mouseup')
	target.classList.add('mousedown')
}

/**************************************************按钮操作*****************************************************/
let ledOffHook = document.getElementById('led-off-hook')
let ledMute = document.getElementById('led-mute')
let ledIncomingCall = document.getElementById('led-incomingcall')
let ledHold = document.getElementById('led-hold')

function Answer() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}
	ledOffHook.checked = true;
	showLog('OUTPUT : off-hook-led on');
	webHid.sendDeviceReport({ command: 'offHook' })
    // webHid.sendDeviceReport({ command: 'muteOn' })
	incomingCallBtn.disabled = false;
	hookSwitchInput.checked = true
}

function Hangup() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}
	ledOffHook.checked = false;
	webHid.sendDeviceReport({ command: 'onHook' })
	incomingCallBtn.disabled = false;
	hookSwitchInput.checked = false
}

function MuteOn() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}
	ledMute.checked = true;
	webHid.sendDeviceReport({ command: 'muteOn' })
	phoneMuteInput.checked = true
}

function MuteOff() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}
	ledMute.checked = false;
	webHid.sendDeviceReport({ command: 'muteOff' })
	phoneMuteInput.checked = false
}

/**
 * 亮灯闪烁提示来电，这个功能怎么测出来的？？ 厂家提供的信息
 */
function IncomingCall() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}
	ledIncomingCall.checked = true

	webHid.sendDeviceReport({ command: 'onRing' })
}

function OutcomingCall() {
    if (!webHid.device || !webHid.device.opened) {
        showLog('Connect first!');
        return;
    }
    ledIncomingCall.checked = false

    webHid.sendDeviceReport({ command: 'offRing' })
}

function HoldOn() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}
	ledHold.checked = true

	webHid.sendDeviceReport({ command: 'onHold' })
}

function HoldOff() {
    if (!webHid.device || !webHid.device.opened) {
        showLog('Connect first!');
        return;
    }
    ledHold.checked = false

    webHid.sendDeviceReport({ command: 'offHold' })
}

function buttonsEnabled(id){
	let target = document.getElementById(id)
	let outputButtons = target.getElementsByTagName('button')
	if (outputButtons && outputButtons.length) {
		for (let i = 0; i < outputButtons.length; i++) {
			let btn = outputButtons[i]
			btn.disabled = false
			btn.classList.remove('button-disabled')
		}
	}
}

async function requestDevice(target){
    let device
    let data = {
        callback: function(event){
            device = event[0]
            currentLocalDevices = devices.microphones.find(device =>{
                if(device.label.includes(event[0].productName)){
                    return device
                }

            })
            console.warn("event:",currentLocalDevices)
        }
    }

    await webHid.requestHidDevices(data)
	if(!webHid.availableDevices || !webHid.availableDevices.length){
		alert('no hid device found.')
		return
	}

    showLog('Select device: ' + device.productName);
    await webHid.open({label: device.productName})
	showLog('Connected to device: ' + webHid.device.productName);

	buttonsEnabled('output')
	target.disabled = true
	target.classList.add('button-disabled')

	console.log('Restore the default state of hook and mic LED')
	webHid.resetState()

	startButton.disabled = false;
	startButton.classList.remove('button-disabled');
	startButton2.disabled = false;
	startButton2.classList.remove('button-disabled');

    // startBtn.disabled = false;
    // startBtn.classList.remove('button-disabled');
}

function onAudioInactive() {
	startButton.disabled = false;
	startButton.classList.remove('button-disabled');
	stopButton.disabled = true;
	stopButton.classList.add('button-disabled');
}

function gotStreamSuccess(stream) {
    console.log('get stream success', stream)
    if(!audioStream){
        audioStream = stream
        audioStream.oninactive = onAudioInactive()
    }else{
        audioStream2 = stream
        audioStream2.oninactive = onAudioInactive()
    }
    startButton.disabled = true;
    startButton.classList.add('button-disabled');
    stopButton.disabled = false;
    stopButton.classList.remove('button-disabled');

}

function gotStreamError(error) {
  console.warn('gotStreamError: ', error);
}

function gotDevicesSuccess(deviceInfos) {
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    if (deviceInfo.kind === 'audioinput' && deviceInfo.containerId === webHid.device.containerId) {
      const constraints = {
        audio: {
          deviceId: {exact: deviceInfo.deviceId}
        },
        video: false
      };
      navigator.mediaDevices.getUserMedia(constraints).then(gotStreamSuccess).catch(gotStreamError);
    }
  }
}

function gotDevicesError(error) {
  console.log('gotDevicesError: ', error.message, error.name);
}

function startDevice() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}

	navigator.mediaDevices.enumerateDevices().then(gotDevicesSuccess).catch(gotDevicesError);
}

function stopDevice() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}

	localStream.getTracks().forEach(track => track.stop());
}

function onAudioInactive2() {
	startButton2.disabled = false;
	startButton2.classList.remove('button-disabled');
	stopButton2.disabled = true;
	stopButton2.classList.add('button-disabled');
}

function gotStreamSuccess2(stream) {
  localStream2 = stream;
  localStream2.oninactive = onAudioInactive2;

	startButton2.disabled = true;
	startButton2.classList.add('button-disabled');
	stopButton2.disabled = false;
	stopButton2.classList.remove('button-disabled');
}

function gotStreamError2(error) {
  console.warn('gotStreamError2: ', error);
}

function gotDevicesSuccess2(deviceInfos) {
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    if (deviceInfo.kind === 'audioinput' && deviceInfo.containerId === webHid.device.containerId) {
      const constraints = {
        audio: {
          deviceId: {exact: deviceInfo.deviceId}
        },
        video: false
      };
      navigator.mediaDevices.getUserMedia(constraints).then(gotStreamSuccess2).catch(gotStreamError2);
    }
  }
}

function gotDevicesError2(error) {
  console.log('gotDevicesError2: ', error.message, error.name);
}

function startDevice2() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}

	navigator.mediaDevices.enumerateDevices().then(gotDevicesSuccess2).catch(gotDevicesError2);
}

function stopDevice2() {
	if (!webHid.device || !webHid.device.opened) {
		showLog('Connect first!');
		return;
	}

	localStream2.getTracks().forEach(track => track.stop());
}

function getAudioStream() {
    console.log('Requesting local stream');
    const constraints = {
        audio: {
            deviceId: {exact: currentLocalDevices['deviceId']}
        },
        video: false
    }

    console.warn('get audio stream constraints: \r\n', constraints)
    navigator.mediaDevices.getUserMedia(constraints).then(gotStreamSuccess).catch(handleError);
}
function stopStream(){
    if(audioStream){
        console.warn("关闭流")
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
}

function inputReportRetFunc(data){
	console.info('inputReportRetFunc: \r\n' + JSON.stringify(data, null, '    '))
	switch (data.eventName){
		case 'ondevicehookswitch':
			if(data.hookStatus === 'on'){
				log.warn('挂机')
				hookSwitchInput.checked = false
				ledOffHook.checked = false
				incomingCallBtn.disabled = false
			}else {
				log.warn('摘机')
				hookSwitchInput.checked = true
				ledOffHook.checked = true
				incomingCallBtn.disabled = false
			}
			break
		case 'ondevicemuteswitch':
			if(data.isMute){
				log.warn('Mic mute')
			}else {
				log.warn('Mic unmute')
			}
			phoneMuteInput.checked = data.isMute
			ledMute.checked = data.isMute
			break
		case 'ondevicevolumechange':
			if(data.volumeStatus === 'up'){
				log.warn('音量+')
			}else {
				log.warn('音量-')
			}
			break
		default:
			break
	}

//	deviceStatusPrint(data)
}

/**
 * 设备 Input 事件
 * @param event
 */
function deviceStatusPrint(event){
	let action = ''
	console.warn("event.deviceStatus:", event.deviceStatus)
	switch (event.deviceStatus){
		case 1:
			action = 'on-hook'
			break
		case 2:
			action = 'mute on-hook'
			break
		case 3:
			action = 'off-hook'
			break
		case 4:
			action = 'mute off-hook'
			break
		case 5:
			action = 'on-hook mute'
			break
		case 6:
			action = 'on-hook unmute'
			break
		case 7:
			action = 'off-hook mute'
			break
		case 8:
			action = 'off-hook unmute'
			break
		case 9:
			action = 'on-hook volume-up'
			break
		case 10:
			action = 'on-hook volume-down'
			break
		case 11:
			action = 'off-hook volume-up'
			break
		case 12:
			action = 'off-hook mute volume-up'
			break
		case 13:
			action = 'off-hook volume-down'
			break
		case 14:
			action = 'off-hook mute volume-down'
			break
		default:
			break
	}

	showLog('INPUT ' + event.reportId + ': ' + action + ' >>> ' + event.reportData)
}

/**
 * 获取设备列表
 * @param deviceInfos
 */
function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    let values = selectors.map(select => select.value);
    selectors.forEach(select => {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (let i = 0; i !== deviceInfos.length; ++i) {
        let deviceInfo = deviceInfos[i];
        let option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        // option.value = deviceInfo.containerId;
        if (deviceInfo.kind === 'audioinput' && deviceInfo.deviceId !== 'default' && deviceInfo.deviceId !== 'communications') {
            option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
            devices.microphones.push(deviceInfo)
        } else if (deviceInfo.kind === 'audiooutput' && deviceInfo.deviceId !== 'default' && deviceInfo.deviceId !== 'communications') {
            option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
            audioOutputSelect.appendChild(option);
            devices.speakers.push(deviceInfo)
        } else if (deviceInfo.kind === 'videoinput'){
            option.text = deviceInfo.label || `camera ${audioOutputSelect.length + 1}`;
            videoSelect.appendChild(option);
            devices.cameras.push(deviceInfo)
        } else {
            // console.log('Some other kind of source/device: ', deviceInfo);
        }
    }
    console.warn("audioInputSelect:",audioInputSelect)
    selectors.forEach( async function(select, selectorIndex){
        if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
            select.value = values[selectorIndex];
            console.warn("select.value:",select.value)
        }
    });

    getcurrentVendorId()
}

async function getcurrentVendorId(){
    currentLocalDevices = audioInputSelect.value;
    console.warn("currentLocalDevices:",currentLocalDevices)
    // let webHidDevice = await navigator.hid.getDevices()
    // console.warn("webHidDevice:",webHidDevice)
    // let getcurrentVendorId = webHidDevice.find(device =>(device.containerId === audioInputSelect.value ))
    // currentVendorId = getcurrentVendorId.vendorId
    //
	// console.warn("getcurrentVendorId:",getcurrentVendorId)
	// console.warn('currentVendorId:',currentVendorId)

}
function handleError(error) {
    console.error('error: ', error);
}
audioInputSelect.onchange = getcurrentVendorId

window.onload = async function (){
	console.log('windows onload...')
    await navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);
	webHid = new WebHID({
		callback: inputReportRetFunc.bind(this)
	})
}

