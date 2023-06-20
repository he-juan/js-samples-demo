
## 参考

- [opus-recorder](https://github.com/chris-rudmin/opus-recorder)
- [RecorderToText](https://github.com/httggdt/RecorderToText)
- [如何实现前端录音功能](https://zhuanlan.zhihu.com/p/43710364)
- 采样位深、编码处理：
  - @see [https://github.com/rochars/wavefile](https://github.com/rochars/wavefile)
  - @see [https://github.com/rochars/alawmulaw](https://github.com/rochars/alawmulaw)
  - @see [https://github.com/rochars/bitdepth](https://github.com/rochars/bitdepth)

## 问题记录

### 1、bin 文件转换大小限制与音频渐弱处理说明

- 1.worker 收到buffer数据后保存并立即对数据进行扁平化和下采样处理
- 2.当处理后的数据剩余最大尺寸的 `25%` 时，通知 `recorder` 开始设置音频渐弱
- 3.当处理后的数据大于限制尺寸时，通知`recorder`停止转换，生成最终文件。超出尺寸限制的文件转换时长小于页面设置时长。
- 4.若转换的文件未超出尺寸限制，则根据转换时间设置音频渐弱时间。剩余转换时长小于`recordingDuration*0.25`时，设置渐弱。


### 2、录制时长不等于指定录制时长问题

- 原因：通话定时器计算处理时长，`start` 过后，并不一定会立即进入录音状态，最后的数据时长不一定和定时时间匹配
- 处理：`scriptProcessorNode.onaudioprocess` 以固定时间间隔触发，总触发次数不定。需要计算总次数*固定时间才是录制的时长






