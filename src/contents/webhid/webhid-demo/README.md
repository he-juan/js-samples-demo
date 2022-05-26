## 一、参考

  [webHid API](https://wicg.github.io/webhid/index.html)

 - 案例地址：https://github.com/google/libhidtelephony
    > 该demo是typeScript语言，需要直接安装TypeScript 环境，执行语句为`npm install -g typescript`;
    > 若将 `TypeScript `转换为 `JavaScript` 代码,执行语句： `tsc 文件名`（如 tsc app.ts）

##  二、 webHid相关内容

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

----------

##  三、teams 认证耳机 

 1. **线控耳机**

     > 1. 耳机设备之 `Jabra EVOLVE 30 II、Jabra SPEAK 410 USB`
        > (1) 需要先发送 `offHook ` 或者` hook按键` mute 功能才能触发和接收；
        > (2) 当hookSwitch 事件为`on`时， 表示`挂机`状态；若需要mute按键能使用，则按上述操作；
        > (3) 点击hook按键或者静音按键，需要`接受+应答`方式处理；
     
     > 2. 耳机设备之 `Grandstream GUV3000、Grandstream GUV3005`    
        >  (1) 发送hook事件，不需要应答
        >  (2) hook按鍵每点击一次都只触发一次事件，要么是挂机事件要么是摘机事件
      
     > 3. 耳机类型之`Logitech Stereo H650e、  Logitech H570e Stereo` 
        > (1) 点击`hook按键`触发事件，灯都不亮；点击`mute按键`起作用
        > (2) 通过事件发送的事件(`onHook、offHook、muteOn、muteOff、onRing、 offRing`)都能正常使用
        > (3) `设备Logitech H570e Stereo关于hook按键的说明`：处理的事件是关于muteon和muteOff的相关操作，并且会同时触发这两个事件的处理逻辑；
        > (4) `设备Logitech Stereo H650e 关于hook按键说明`：处理事件是关于onHook和 offHook的相关操作，并且会同时触发这两个事件的处理逻辑；
        > <font color=blue>说明： 已经和上述的连接测试过，按键也是灯不亮；</font>
        
     > 4. 耳机设备之`Plantronics Blackwire 5220 Series ` 、`Poly Blackwire 3320-M`
       > (1)此设备发送发`onRing 事件后闪烁`，需要通过`offRing 事件`去关闭闪烁状态，否则就一直处于闪烁状态；触发其他事件都不会关闭闪烁状态
    
     > 5. 耳机设备之 `Logitech-Zone Wireless` 即：`Zone Wired ` （`此设备在demo上测试状态如下所示`）
        > (1) 首先需要将耳麦放下来，即戴上能检测到说话；才能有效果
        > (2) 此设备的hook按键和mute按键，都会触发对应的事件，`但是指示灯都不会亮`； 此设备的发送onRing和offRing事件时，也是有效的且开启指示灯会有闪烁； 
        
     > 6. 耳机设备之`Jabra EVOLVE LINK`,即 Jabra-Evolve 80 MS
       > (1) 此设备发送hook事件会触发相关逻辑，指示灯也会亮；发送onRing和offRing事件也会触发相关逻辑，指示灯也会闪烁； 发送muteOn和muteOff事件也会触发相关逻辑

     > 7. 耳机设备之`Jabra Evolve2 40`
       > (1) 首先需要将耳麦放下来进行测试，说明设备比较智能。否则会出现发送offHook事件会触发mute事件等问题；

     > 8. 耳机设备之`Microsoft Modern USB Headset`
       > (1)点击hook按键或者静音按键，需要`接受+应答`模式处理；
       > (2)直接点击各按键事件，都是触发两次相同的事件；
       > (3)若是主动发送事件，都只触发一次；

 2. **无线耳机**
   
     > 1. 耳机设备之**无线耳机** `Jabra Link 380`， 即 Jabra-Evolve2 65 
       > (1) 此设备发送hook事件和点击hook按键指示灯会亮；静音按键指示灯不会亮且触发对应的按键事件可行； 发送onRing和offRing事件会触发，并且指示灯会闪烁；
       > (2) `按静音按键是不触发事件，指示灯不会亮`；

    > 2. 耳机设备之`Bose 700 UC `
      > (1) 此设备发送hook事件，发送Mute事件，发送Ring事件，都会触发，但`指示灯`都不亮；
      > (2) 此设备手动触摸发送事件，需要打开对应系统的耳机设备的界面；


----------


##  四、查看耳机触发事件的次数问题

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
 



##  五、wave上关于teams 耳机使用的问题

 1. Jabra EVOLVE 30 II:
     - 问题：在多线路的情况下，按住`hook按键`挂断一条线路后，需要`手动再次按hook键` , `mute按键`才能接收,从而此功能才能使用；
     - 解决方案： 延迟发送offHook,等待onHook两次触发处理完成
 
 2. Plantronics Blackwire 5220 Series 耳机`的onRing闪烁`问题：
     - 问题：此设备触发`onRing 事件后闪烁`，需要通过`offRing 事件`去关闭闪烁状态，否则就一直处于闪烁状态；触发其他事件都不会关闭闪烁状态；
     - 当电话超时、拒接和呼叫端主动挂断都需要通过触发offRing去关闭闪烁状态；

 3. Jabra SPEAK 410 USB 设备：
     - 问题：入会后和点对点都会直接触发`挂断操作`, 并且muteOn和muteOff触发都不起作用；
     - 解决方案：前者需要等待其他操作完成才能处理接下来的操作流程； 后者是`延迟发送此事件做处理`；

 4. Jabra SPEAK 410 USB 、Jabra EVOLVE 30 II、Jabra-Evolve2 40设备：
     - 问题：接收到第二路来电时，只闪烁一下；但是再次按hook按键是可以正常接起当前电话；第一路来电闪烁是正常的；
     - 原因： 重置状态时，发送hook事件时，会触发按键hook事件，但在触发hook事件为on时已经触发了闪烁事件，导致只闪烁了一次就不闪烁了；
     - 解决方案： 延迟发送闪烁事件的时间

 5. Poly  Voyager 6200 UC、Poly-Voyager Focus UC-M设备：
    - 问题： 对端呼叫快速取消,此设备一直闪烁；
    - 原因： 再针对`问题四`时，对发送闪烁事件做了延迟处理，从而导致此问题发生；
    - 解决方案：闪烁事件做延迟处理的过程中，判断当前是否收到`取消通话`事件；若存在则不发送闪烁事件。

 6. Microsoft Modern USB Headset  设备：
    - 问题： 按键hook指示灯不亮
    - 原因：按键hook需要做`接受+应答`处理。

 7. Yealink  UH36 Teams 设备：
    - 问题： 第二路挂断之后，取消hold；按静音键，hook指示灯和mute指示灯都不亮，且当前处于onhook状态；
    - 原因： 此耳机需要`接受+应答`的处理逻辑；
 8. Bose 700 UC 和 Logitech-Zone Wireless设备 ：
    - 问题：第二条线路不能接听成功，按hook键无反应；
    - 原因：前一条线路存在流 或者自动检测麦克风流导致；
    - `第二条线路可以先按静音键，然后再按hook键，第二路就可以接起来；`
    - 解决方案： 第二路来电是页面接听，耳机不可以接听。
        - 与PM沟通后，解决如下（参考Teams做法）：
            >（1）不允许第二路来电采用耳机接听（界面可以接听）。
            >（2）第二路来电期间，耳机控制的是第一路通话/会议，但不允许耳机挂断（界面可以挂断）。
            >（3）当前线路处于hold状态，不能采用耳机按键挂断;

      

