let selectRecordType = document.getElementsByClassName("recordType")[0]
let normalRecordContainer = document.getElementsByClassName("normalRecordContainer")[0]
let advancedRecordContainer = document.getElementsByClassName("advancedRecordContainer")[0]
let normalRecord = document.getElementsByClassName("normalRecord")[0]
let advancedRecord = document.getElementsByClassName("advancedRecord")[0]
let recordButton = document.getElementsByClassName("recordButton")[0]
let video = document.getElementsByClassName("recordVideo")[0]

let recordOptions = selectRecordType.value    // 默认情况下得到的录制选项
let currentRecordType = normalRecord.value     // 默认情况下得到的录制类型


/**
 * select 获取当前录制选项
 * */
selectRecordType.onchange= function(){
    recordOptions = selectRecordType.value
    console.warn("selectRecordType:",recordOptions)
    if(recordOptions === 'NR'){
        console.warn("AR AR AR")
        normalRecordContainer.style.display = 'block'
        advancedRecordContainer.style.display = "none"
        currentRecordType = normalRecord.value          // 获取标准录制下默认的录制类型（如：音频录制）
    }else if(recordOptions === 'AR'){
        console.warn("NR NR NR")
        advancedRecordContainer.style.display = "block"
        normalRecordContainer.style.display = 'none'
        currentRecordType = advancedRecord.value         // 获取高级录制下默认的录制类型（如：视频+演示录制）
    }
};

/**
 *  获取标准录制的的类型
 * */
normalRecord.onchange = function(){
    currentRecordType = normalRecord.value
}

/**
 *  获取高级录制的的类型
 * */
advancedRecord.onchange= function(){
    currentRecordType = advancedRecord.value
}


/**
 * 点击录制
 * */
// recordButton.onclick = initRecord()
recordButton.addEventListener('click', initRecord)


/*******************************录制相关内容*********************************/
let type                          // 类型
let recorder                      // 录制
let mixStreamContext              // 混流
let file                          // 流文件
let streamArray = []              // 流数组
let localStreams = {
    audio:  '',
    main:   '',
    slides: ''
}

/**
*  开始录制
 **/
function initRecord(){
    if(currentRecordType === 'normal-audio-record' || currentRecordType === 'advanced-audio-mp3-record'){
        type = "audio/webm"
    }else {
        type = "video/webm"
    }

    if(recordButton.innerHTML === '停止录制') {
        recordButton.disabled = true;
        recordButton.disableStateWaiting = true;
        setTimeout(function() {
            recordButton.disabled = false;
            recordButton.disableStateWaiting = false;
        }, 2000);

        recordButton.innerHTML = '开始录制';
        recorder.stopRecording(stopRecordingCallback)
        return;
    }
    if(!event) return;
    recordButton.disabled = true;
    // This.$refs.downLoadBtn.style.display = "none"
    recordButton.mediaCapturedCallback = function(streamArray) {
        recordButton.innerHTML = '停止录制';
        recordButton.disabled = false;
        let options = {
            mimeType: type,
            timeSlice: 1000,
            type: type.split("/")[0],
        };
        if(streamArray instanceof Array){
            options.previewStream = function(s) {
                video.muted = true;
                video.srcObject = s;
                video.play()
                // This.video.controls = true
            }
        }

        recorder = RecordRTC(streamArray, options);

        recorder.startRecording()
    }

    let commonConfig = {
        onMediaCaptured: function(streamArray) {
            if(streamArray instanceof Array){
                recordButton.stream = streamArray[0]
               console.warn("get others stream")
            }else{
                recordButton.stream  = streamArray;
                video.src = video.srcObject = null;
                if(currentRecordType === 'normal-audio-record'){
                    var audioPreview = document.createElement('audio');
                    audioPreview.controls = true;
                    audioPreview.autoplay = true;
                    audioPreview.srcObject = streamArray
                    audioPreview.className = 'recordAudio'
                    video.replaceWith(audioPreview);
                    video = audioPreview;

                }else{
                    let audio = document.getElementsByClassName("recordAudio")[0]
                    if(audio){
                        audio.src = audio.srcObject = null
                        let videoPreview = document.createElement('video');
                        videoPreview.controls = true;
                        videoPreview.autoplay = true;
                        videoPreview.className = 'recordVideo'
                        audio.replaceWith(videoPreview);
                        video = videoPreview
                    }
                    let {width, height} = streamArray.getVideoTracks()[0].getConstraints()
                    console.warn("getContraints :",width , height )

                    video.srcObject = streamArray
                    video.muted= true

                    video.oncanplay = function(){
                        video.play()
                    }
                    video.onloadedmetadata = async function () {
                        await video.play()
                        video.muted = true
                        if(width && (width.max > 1280 ||width.exact > 1280)){
                            video.style.width = width &&(width.max ||width.exact) / 3 + 'px'
                            video.style.height = height && (height.max || height.exact) / 3 + 'px'
                        }else if(width && (width.max === 1280 || width.exact === 1280)){
                            video.style.width = width &&(width.max ||width.exact) / 2 + 'px'
                            video.style.height = height && (height.max || height.exact) / 2 + 'px'
                        }else if(width && (width.max === 640 || width.exact === 640)){
                            video.style.width = (width.max || width.exact) + 'px'
                            video.style.height = (height.max || height.exact) + 'px'
                        }else{
                            video.style.width =  '640px'
                            video.style.height = '360px'
                        }
                    }
                }
            }


            if(recordButton.mediaCapturedCallback) {
                recordButton.mediaCapturedCallback(streamArray);
            }

            // chkFixSeeking.parentNode.style.display = 'none';
        },
        onMediaStopped: function() {
            console.warn("stop stop stream")
            recordButton.innerHTML = '开始录制';
            if(!recordButton.disableStateWaiting) {
                recordButton.disabled = false;
            }
            if(recordButton.stream){
                recorder.stopRecording(stopRecordingCallback)
            }

            // chkFixSeeking.parentNode.style.display = 'inline-block';
        },
        onMediaCapturingFailed: function(error) {
            console.error('onMediaCapturingFailed:', error);
            alert('onMediaCapturingFailed:', error)

            if(error.toString().indexOf('no audio or video tracks available') !== -1) {
                alert('RecordRTC failed to start because there are no audio or video tracks available.');
            }
            commonConfig.onMediaStopped();
        }
    };
    if(currentRecordType === 'normal-audio-record'){
        captureCurrentStream(commonConfig, {audio:true})
    }else if(currentRecordType === 'normal-video-record'){
        captureCurrentStream(commonConfig, {audio:true, video: true})
    }else if(currentRecordType === 'normal-screen-record'){
        commonConfig.shareScreenType = 'shareScreen'
        captureCurrentStream(commonConfig, {audio: true, video: true})
    }else if(currentRecordType === 'normal-audio-screen-record'){
        commonConfig.shareScreenType = 'audio_shareScreen'
        captureCurrentStream(commonConfig, {audio: true, video: true})
    }else if(currentRecordType === 'advanced-audio-mp3-record'){
        captureCurrentStream(commonConfig, {audio:true})
    }else if(currentRecordType === 'advanced-video-screen-record'){
        commonConfig.shareScreenType = 'audio_shareScreen'
        captureCurrentStream(commonConfig, {audio:true, video: true})
    }else if(currentRecordType === 'advanced-audio-mp3-record'){
        captureCurrentStream(commonConfig, {audio:true})
    }
}

/** captureCurrentStream    得到当前类型的流并进行处理
 * @param config            取流成功或者失败的逻辑处理
 * @param constraints       取流参数
 **/
function captureCurrentStream(config, constraints){

    if(currentRecordType === 'normal-audio-screen-record'){
        captureUserMedia(config, constraints, async function(shareStream) {
            // let navigator = navigator || navigator.mediaDevices
            // if(!navigator){
            //     alert('Unable to make getUserMedia request. Please check browser console logs.');
            //     return
            // }
            navigator.mediaDevices.getUserMedia({audio:true}).then(function(audioStream) {
                streamArray.push(audioStream)
                let stream
                let mixStream = []
                if(shareStream.getAudioTracks().length > 0){
                    let audioTrack = mixingStream(shareStream, audioStream).getAudioTracks()[0]
                    mixStream.push(audioTrack)
                    mixStream.push(shareStream.getVideoTracks()[0])
                    stream = new MediaStream(mixStream)
                }else{
                    mixStream.push(audioStream.getAudioTracks()[0])
                    mixStream.push(shareStream.getVideoTracks()[0])
                    stream = new MediaStream(mixStream)
                }
                config.onMediaCaptured(stream);
                if([stream] instanceof Array) {
                    [stream, shareStream, audioStream].forEach(function(stream) {
                        addStreamStopListener(stream, function() {
                            config.onMediaStopped();
                        });
                    });
                    return;
                }
                addStreamStopListener([stream, shareStream, audioStream], function() {
                    config.onMediaStopped();
                });
            }).catch(function(error) {
                onGetStreamFailed (error)
            });
        }, function(error) {
            config.onMediaCapturingFailed(error);
        });
    }else if(currentRecordType.includes('normal') ){
        captureUserMedia(config, constraints, async function(stream) {
            await config.onMediaCaptured(stream);
            if(stream instanceof Array) {
                stream.forEach(function(stream) {
                    addStreamStopListener(stream, function() {
                        config.onMediaStopped();
                    });
                });
                return;
            }
            await addStreamStopListener(stream, function() {
                config.onMediaStopped();
            });
        }, function(error) {
            config.onMediaCapturingFailed(error);
        });
    }else if(currentRecordType === 'advanced-video-screen-record'){
        captureUserMedia(config, constraints, function(screen) {
            // let navigator = navigator || navigator.mediaDevices
            // if(!navigator){
            //     alert('Unable to make getUserMedia request. Please check browser console logs.');
            //     return
            // }

            keepStreamActive(screen);

            navigator.mediaDevices.getUserMedia({audio:true,video:true}).then(function(camera) {
                streamArray.push(camera)
                keepStreamActive(camera);
                screen.width = window.screen.width;
                screen.height = window.screen.height;
                screen.fullcanvas = true;
                console.warn("screen.width :", screen.width + "  * " + screen.height)

                camera.width = 320;
                camera.height = 240;
                camera.top = screen.height - camera.height ;
                camera.left = screen.width - camera.width ;

                config.onMediaCaptured([screen, camera]);
                if([screen,camera] instanceof Array) {
                    [screen,camera].forEach(function(stream) {
                        addStreamStopListener(stream, function() {
                            config.onMediaStopped();
                        });
                    });
                    return;
                }
                addStreamStopListener(screen, function() {
                    config.onMediaStopped();
                });
            }).catch(function(error) {
                onGetStreamFailed (error)
            });
        }, function(error) {
            config.onMediaCapturingFailed(error);
        });
    }else if(currentRecordType === 'advanced-audio-mp3-record'){
        getMp3Stream(function(mp3Stream) {
            streamArray.push(mp3Stream)
            captureUserMedia(config, constraints, async function(audioStream) {
                let mixer = new MultiStreamsMixer([audioStream, mp3Stream]);
                // mixer.useGainNode = false;
                var audioPreview = document.createElement('audio');
                audioPreview.controls = true;
                audioPreview.autoplay = true;
                audioPreview.srcObject = mixer.getMixedStream();
                video.replaceWith(audioPreview);
                video = audioPreview;

                await config.onMediaCaptured(mixer.getMixedStream());
                if([mp3Stream,audioStream]instanceof Array) {
                    [mp3Stream,audioStream].forEach(function(stream) {
                        addStreamStopListener(stream, function() {
                            config.onMediaStopped();
                        });
                    });
                    return;
                }
                await addStreamStopListener(mixer.getMixedStream(), function() {
                    config.onMediaStopped();
                });
            }, function(error) {
                config.onMediaCapturingFailed(error);
            });
        });
    }

}

/** mixingStream   混流
 * @param stream1
 * @param stream2
 */
function mixingStream (stream1, stream2) {
    console.info('mixing audio stream')
    if(!stream1 || !stream2){
        console.info("invalid parameters to mixStream")
        return
    }
    // 混音参数
    window.AudioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)

    if (window.AudioContext) {
        if(mixStreamContext){
            mixStreamContext.close()
            mixStreamContext = null
        }
        mixStreamContext = new window.AudioContext()
    } else {
        console.error('not support web audio api')
    }

    // 混音
    let destinationParticipant1 = mixStreamContext.createMediaStreamDestination()
    if (stream1) {
        let source1 = mixStreamContext.createMediaStreamSource(stream1)
        source1.connect(destinationParticipant1)
    }
    if (stream2) {
        let source2 = mixStreamContext.createMediaStreamSource(stream2)
        source2.connect(destinationParticipant1)
    }

    return destinationParticipant1.stream
}

/** captureUserMedia         获取当前类型的流
 *  @param mediaConstraints  获取取流参数
 *  @param successCallback   成功回调
 *  @param errorCallback     失败回调
 **/
function captureUserMedia(config, mediaConstraints, successCallback, errorCallback) {
    mediaConstraints = getVideoResolutions(mediaConstraints);
    // mediaConstraints = getFrameRates(mediaConstraints);
    console.log("mediaConstraints:" + JSON.stringify(mediaConstraints, null, '   '))

   if(config.shareScreenType === 'audio_shareScreen' || config.shareScreenType === 'shareScreen'){
        // let navigator = navigator|| navigator.mediaDevices
        // if(!navigator){
        //     alert('Unable to make getUserMedia request. Please check browser console logs.');
        //     return
        // }

        navigator.mediaDevices.getDisplayMedia(mediaConstraints).then(function(stream) {
            streamArray.push(stream)
            successCallback(stream);
        }).catch(function(error) {
            onGetStreamFailed (error)
            errorCallback(error);
        });
   } else if(!mediaConstraints.shareScreenType){
        // let navigator = navigator || navigator.mediaDevices
        // if(!navigator){
        //     alert('Unable to make getUserMedia request. Please check browser console logs.');
        //     return
        // }

        navigator.mediaDevices.getUserMedia(mediaConstraints).then(function(stream) {
            streamArray.push(stream)
            successCallback(stream);
        }).catch(function(error) {
            onGetStreamFailed (error)
            errorCallback(error);
        });

    }
}
/** getMp3Stream 获取本地音频流
 *
 * **/

function getMp3Stream(callback) {
    var selector = new FileSelector();
    selector.accept = '*.mp3'|| '*.wav';
    selector.selectSingleFile(function(mp3File) {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        var context = new AudioContext();
        var gainNode = context.createGain();
        gainNode.connect(context.destination);
        gainNode.gain.value = 0; // don't play for self

        var reader = new FileReader();
        reader.onload = (function(e) {
            // Import callback function
            // provides PCM audio data decoded as an audio buffer
            context.decodeAudioData(e.target.result, createSoundSource);
        });
        reader.readAsArrayBuffer(mp3File);

        function createSoundSource(buffer) {
            var soundSource = context.createBufferSource();
            soundSource.buffer = buffer;
            soundSource.start(0, 0 / 1000);
            soundSource.connect(gainNode);
            var destination = context.createMediaStreamDestination();
            soundSource.connect(destination);

            // durtion=second*1000 (milliseconds)
            callback(destination.stream, buffer.duration * 1000);
        }
    }, function() {
        document.querySelector('#btn-get-mixed-stream').disabled = false;
        alert('Please select mp3 file.');
    });
}

/**
 * onGetStreamFailed 取流失败的处理
 */
function onGetStreamFailed (error) {
    // console.warn('get stream failed: ' + JSON.stringify(constraints, null, '  '))
    console.warn('onGetStreamFailed error message: ' + error.message)
    console.warn('error name: ' + error.name)
    // console.warn('error constraint: ' + error.constraint)
    if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError' || error.name === 'Error') {
        // constraints can not be satisfied by avb.device
        console.info('constraints can not be satisfied by avb.device')
        alert('Your camera or browser does NOT supports selected resolutions or frame-rates. \n\nPlease select "default" resolutions.');
    } else {
        if (error.name === 'NotFoundError' || error.name === 'DeviceNotFoundError') {
            // require track is missing
            console.info('require track is missing')
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            // webcam or mic are already in use
            console.info('webcam or mic are already in use')
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' || error.name === 'PermissionDismissedError') {
            // permission denied in browser
            console.info('permission denied in browser')
        } else if (error.name === 'TypeError') {
            // empty constraints object
            console.info('empty constraints object')
        } else {
            // other errors
            console.info('other errors ' + error.name)
        }
        alert(error.message);
    }
}


/**
 *  getVideoResolutions      获取分辨率
 *  @param mediaConstraints  取流设置的相关参数
 * */
function getVideoResolutions(mediaConstraints) {
    let defaultWidth = 1280, defaultHeight = 720 ;
    if(mediaConstraints.video == true) {
        mediaConstraints.video = {};
    }
    // if(mediaConstraints.audio == true) {
    //     mediaConstraints.audio = {};
    // }

    // if(!mediaConstraints.audio.deviceId) {
    //     mediaConstraints.audio.deviceId = {};
    //     let audioDeviceId = this.$store.getters.getCurrentAudioSource
    //     mediaConstraints.audio.deviceId = {
    //         exact: audioDeviceId  ,
    //     }
    // }

    if(!mediaConstraints.video) {
        return mediaConstraints;
    }
    if(!mediaConstraints.video.width || !mediaConstraints.video.height) {
        mediaConstraints.video.width = {};
        mediaConstraints.video.height = {};
        // let camereDeviceId = this.$store.getters.getCurrentVideoSource
        // mediaConstraints.video.deviceId = {
        //     exact: camereDeviceId  ,
        // }
    }

    // let value = this.currentResolutions
    //
    // if(value == 'Default' || value == 'default' ) {
    //     defaultWidth = 640
    //     defaultHeight = 360
    // }else{
    //     value = value.split('x');
    //     defaultWidth = parseInt(value[0]);
    //     defaultHeight = parseInt(value[1]);
    // }

    var isScreen = currentRecordType.toString().toLowerCase().indexOf('screen') != -1;

    if(isScreen) {
        defaultWidth = 1920;
        defaultHeight = 1080;
        mediaConstraints.video.width = { max: defaultWidth};
        mediaConstraints.video.height = { max: defaultHeight};
    }
    else {
        mediaConstraints.video.width = { exact: defaultWidth};
        mediaConstraints.video.height = { exact: defaultHeight};
    }

    console.warn(" mediaConstraints:", mediaConstraints)
    return mediaConstraints;
}

/**
 * getFrameRates  获取分辨率
 * @param mediaConstraints  取流设置的相关参数
 **/
function getFrameRates(mediaConstraints) {
    if(!mediaConstraints.video) {
        return mediaConstraints;
    }

    // let value = this.currentFramerates
    //
    // if(value == 'default') {
    //     return mediaConstraints;
    // }
    // value = parseInt(value);

    if(!mediaConstraints.video.width || !mediaConstraints.video.height) {
        mediaConstraints.video.width = {};
        mediaConstraints.video.height = {};
    }

    var isScreen = currentRecordType.toString().toLowerCase().indexOf('screen') != -1;

    if(isScreen) {
        mediaConstraints.video.frameRate = { max: 15}
    }
    else {
        mediaConstraints.video.frameRate = { exact: 15};
    }
    return mediaConstraints;
}

/**  keepStreamActive: 对同时获取共享流和视频流创建video
 * @param stream
 **/
function keepStreamActive(stream) {
    var video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    video.style.display = 'none';
    video.style.zIndex ='1' ;
    (document.body || document.documentElement).appendChild(video);
}


/** 监听事件： 停止录制后关闭流
 **/
function addStreamStopListener(stream, callback) {
    stream.addEventListener('ended', function() {
        callback();
        callback = function() {};
    }, false);
    stream.addEventListener('inactive', function() {
        callback();
        callback = function() {};
    }, false);
    stream.getTracks().forEach(function(track) {
        track.addEventListener('ended', function() {
            callback();
            callback = function() {};
        }, false);
        track.addEventListener('inactive', function() {
            callback();
            callback = function() {};
        }, false);
    });
}

/** stopRecordingCallback 停止录制
 *
 */
function stopRecordingCallback() {
    file = recorder.getBlob()
    url = URL.createObjectURL(file)

    video.src = video.srcObject = null
    video.src = url
    video.muted = false
    video.controls = true;
    video.play()
    recorder.destroy()
    recorder = null

   streamArray.push(recordButton.stream)
   streamArray.forEach(function(stream) {
        if(stream){
            stream.getTracks().forEach(function(track) {
                track.stop();
            });
        }
    });
    recordButton.stream = null
}



window.onload = function(){
    advancedRecordContainer.style.display = "none"
}