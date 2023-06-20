## 2023-4-7
- 反馈问题
 - 1. 控制台报错：failed to execute 'fetch' on 'WorkerGlobalScope': Request cannot be constructed from a URL that includes credentials:
   - 定位发现问题场景：采用非标准的url 转换ogg格式，一直存在循环问题，3cx需要采用此方式进行访问：http://admin:admin123@192.168.131.28:4000/direct-login。
   - 原因：上述的url不是标准的，fetch不能请求访问，导致存在报错： Request cannot be constructed from a URL that includes credentials
   - 解决方案： 获取url的方式修改为：self.location.origin + self.location.pathname


## 2022-12-30

- 反馈问题处理
  - 1.Convert your files to ogg or bin format with this free, fast online converter. May be change it to “Convert audio files to ogg or bin format with this free and fast online converter”.
  - 2.Instead of another drag and drop section, maybe add a “Start over” button. (or Restart) This way users will not think that we can convert multiple files at the same time.
  - 3.File does not get restriction until you actually trying to convert it. I think it might be better if we do restriction first. For example, when I upload a picture, it will still upload but prompt “Only audio is supported!” when hit convert. 

## 2022-12-12

- 调整LOGO样式，添加底部Copyright 
- 转换完成后显示上传文件按钮，避免转换完成后需刷新页面才能重新转换问题 
- 添加Recording duration设置项描述

## 2022-12-9

- 解决转换后的gsbin文件时长不正确问题，原因是之前处理爆破音时缩短了buffer的长度，转换size的计算未同步修改
- 设置select禁用样式
- 解决转换ogg请求worker、wasm文件时间较长时，前面的数据会丢失一部分问题
- 修复音频前部分存在留白问题：原因是readAsArrayBuffer onload 触发需要一秒多的时间，但是getHeaderPages在readAsArrayBuffer之前已经开始获取了
- GRANDSTREAM 水印字体同步为公司使用字体
- 页面添加GRANDSTREAM LOGO
- 去除页面console显示

## 2022-12-8

- 调试转换ogg时页面崩溃问题：chrome降级到101版本后本地测试正常
- 添加GRP model选择
- 修复转gsbin格式时 Offset is outside the bounds of the DataView 报错： getInt16 超出buffer范围
- 设置gsbin 默认Duration 为15秒

## 2022-12-7

- .wasm格式问题修正后转换ogg还是失败问题
    - 原因：与oggOpusEncoderWorker.js与oggOpusEncoderWorker.wasm 请求时间有关，worker还没ready时，文件已经在处理。建议服务器对请求文件进行gzip压缩，减少流量消耗
    - 处理：添加wasmFetchError失败通知和文件预加载处理

- 添加template_index.ejs默认配置模板

## 2022-12-1

- 添加 LICENSE

## 2022-11-18

- 调整音频渐弱比例为25%

## 2022-11-17

- 优化encoder参数
- 文件夹 toWave 重命名为 toBin
- 解决bin文件生成后结尾存在爆破音问题

## 2022-11-16

- 添加alawmulaw.js文件，实现线性16-bit PCM编码为8-bit mulaw功能
- 添加bitdepth.js和audio测试文件
- 生成的.bi文件n尺寸超过 196608 Byte(192KB)时的提示

