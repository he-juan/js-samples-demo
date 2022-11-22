**此demo是chrome插件**
- 使用方法：
  - 访问`chrome://extensions`, 点击`加载已解压的扩展程序`，找到record-demo的文件夹，会显示对应的插件。
  
  




**[更多demo请点击此链接，以下都是简述流程](https://he-juan.github.io/record-demo/dist1/#/)**


### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


## **重点：关于此demo的相关功能**
  1. demo功能主要分为两类：标准录制和高级录制。
  2. 标准录制主要有：麦克风录制、音频+视频录制、共享录制、音频+共享录制；
  3. 高级录制主要有：音频+视频+共享录制、区域共享录制、音频+MP3录制、视频gif录制。
  4. 针对高级录制对音频可选择静音/非静音处理逻辑。
  
 
 ----------
 
 
## **重点：框架逻辑**
  1. 在 components 文件夹中的组件是webUI的相关处理流程。
    
     **components 文件下对应组件**
     
     - HomePage： webUI的页面显示处理流程。
     - AsideView：左边页面选择逻辑。
     - Record： 右边录制区域的显示逻辑。
  2. 在 views 文件夹中的组件主要是标准录制和高级录制的相关的组件。
   
     - 路径为：`views/recordType` 的文件夹主要是各录制组件的对应逻辑。
     
          - NormalRecord: 标准组件的页面处理逻辑。(标准录制的内容都在此组建中处理)
          - AdvanceRecord： 高级组件的页面处理逻辑。
          - GifRecord： 视频录制成gif格式。
          - MicrophoneAndMp3Record: 音频+ MP3 录制的处理内容。
          - RecordMutistream： 音频+视频+共享 录制的处理内容。
          - RecordRegionalScreen：音频+区域共享 录制的处理内容。
          
         
   
 
 ----------
 
 
## **一、关于录制的基本逻辑**
  1. 录制功能: 安装recordRTC来处理的.
  
     > npm install recordrtc
 
  2. 选择设备：
     - 采用store来管理状态、共享数据以及在各个组件之间进行共享数据。并且针对store的每个状态做了对应的处理。
   
  3. 通知事件：
     - 全局使用eventBus来通知事件，处理对应逻辑。
  
  4. 每个功能都存在一个组件，对应的逻辑都在组件内完成；各功能之间没有逻辑关系。
  
  5. 录制的基本使用：

 ```javascript
        let options = {
          mimeType: 'video/webm' || 'audio/webm',
          timeSlice: 1000,
          type: 'video',
        };
        let stream  // 单个流直接赋值，多个流则用数组方式，如[audioStream, cameraStream]
        recorder = RecordRTC( stream, options);
        recorder.startRecording()               // 表示开启录制
        recorder.stopRecording()                // 表示停止录制，一般使用方式为：recorder.stopRecording(stopRecordingCallback)
        recorder.getBlob()                      // 表示获取录制后的文件内容
        URL.createObjectURL(recorder.getBlob()) // 表示获取后的内容可以直接访问查看
```
 
## **二、 关于标准录制的处理逻辑**
 
 1. 针对标准录制的功能：**`麦克风录制、音频+视频录制、共享录制、音频+共享录制`**
 2. 标准录制功能都在`NormalRecord` 组件中：
    - 针对视频：可以设置对应的取流参数；像素可选择的有360p、480p、720p、1080p。
    
    ```javascript
     constraints = {
        audio: {
          deviceId: { exact: 'deviceId'}
        },       
        video: {
           width: {exact: 1280},
           height: {exact: 720},
           frameRate: {exact: 15},  
           deviceId: {exact: 'deviceId'}
        }    
     }
    ```
 3.     
 
 -----------------
 
## 三、关于高级录制的处理逻辑
 1. 针对高级录制的功能有：**`音频+视频+共享录制、区域共享录制、音频+MP3录制、视频gif录制`**
 2. 关于**`音频+MP3`**的处理逻辑：
    - 安装 `multistreamsmixer` : npm install multistreamsmixer
    - 使用：
   
     ```javascript
        const MultiStreamsMixer = require('multistreamsmixer');
        import MultiStreamsMixer from 'multistreamsmixer';
     ``` 
       
    - 作用：主要是用来处理混流逻辑流程的。[MultiStreamsMixer.js | LIVE DEMO](https://www.npmjs.com/package/multistreamsmixer)
 
    - 关于录制逻辑：

        ```javascript
         var mixer = new MultiStreamsMixer([microphone1, microphone2]);
        
         // record using MediaRecorder API
         var recorder = new MediaRecorder(mixer.getMixedStream(), options);
        
         // record using recordRTC
         var recorder = RecordRTC( mixer.getMixedStream(), options)
        ```  

 3. 关于 `区域共享` 的处理逻辑：
     - 对 `音频流` 和 `共享音频流` 做混流处理；目前使用的是接口`mixingStream`来处理混流。 后期可以使用 `multistreamsmixer` 来做混流处理。
        
     - 首先共享界面，然后对共享界面截取区域后，点击录制操作后就可以录制。
      
  
  
  -----
 