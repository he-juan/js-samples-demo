## 一、参考

[webHid API](https://wicg.github.io/webhid/index.html)

 - 案例地址：https://github.com/google/libhidtelephony
    > 该demo是typeScript语言，需要直接安装TypeScript 环境，执行语句为`npm install -g typescript`;
    > 若将 `TypeScript `转换为 `JavaScript` 代码,执行语句： `tsc 文件名`（如 tsc app.ts）

## 二、 webHid相关内容

 1. getDevices()： `获取所有HIDDevice`

    ```
    navigator.hid.getDevices()
    ```
    
 2. requestDevice() : `获取需要的HIDDevice`
     
    ```
    await navigator.hid.requestDevice({filters: [ ] })
    ```
       

 3. open()和close() 方法是对webHid的开始和关闭操作；
    - sendReport()：发送事件方法。

        ```
        this.device.sendReport(reportId, reportData);
        ```
 4. 功能事件：
      - inputReport：
         - hookSwitch 表示`onhook` 和 `offhook` 之间切换; (`onHook`表示摘机；`offHook`表示挂机)
         - phoneMute 表示`muteOn` 和 `muteOff`之间切换；(`muteOn`表示静音；`muteOff`表示非静音);
    
      - outputReport :
         - `offHook`:  待机灯亮； `onHook`: hook按键熄灭 
         - `mute`:   静音灯亮；  非静音灯灭
         - `ring`: 来电闪烁

## 三、teams 认证耳机 

 > 1. 耳机类型之 `Jabra EVOLVE 30 II：`
    > (1) 需要先发送 `offHook ` 或者` hook按键` mute 功能才能触发和接收；
    > (2) 当hookSwitch 事件为`on`时， 表示`挂机`状态；若需要mute按键能使用，则按上述操作；
    > (3) 发送 offHook事件，需要`接受+应答`
    
    
    
 > 2. 耳机类型之 `Grandstream GUV3000、Grandstream GUV3005`    
    >  (1) 发送hook事件，不需要应答


   

 1. Grandstream GUV3000、Grandstream GUV3005
    - `mute按键` : 触发两次事件。通过` on  -->   off `事件转变；
     
    - `hook按键` ： 触发一次事件。可通过`recv hookSwitch `查看当前状态是否一致
      - onHook : 摘机
      - offHook: 挂机
 2. Jabra EVOLVE 30 II
    - `mute按键` : 触发两次事件。通过` on  -->   off `事件转变；
     
    - `hook按键` ： 触发两次事件。可通过`recv hookSwitch `查看当前状态是否一致
      - onHook : 摘机
      - offHook: 挂机
    
## 四、wave上关于teams 耳机使用的问题

 1. Jabra EVOLVE 30 II:
    - 在多线路的情况下，按住`hook按键`挂断一条线路后，需要`手动再次按hook键` , `mute按键`才能接收,从而此功能才能使用；

    
