## 说明

### 转换格式与限制

.ogg 转换要求：

- Format: Opus
- Channel(s) : 1 channel (单声道)
- Sampling rate : 16000 Hz (16KHz 采样率)
- 编码器：OPUS
- 输出文件后缀为 .ogg

.bin转换要求：(GRP自定义私有音频格式)

- Format : PCM
- Channel(s) : 1 channel  (单声道)
- Sampling rate : 8 000 Hz  (8KHz 采样率)
- Bit depth : 16 bits (位深)
- 编码器 u-Law (G.711u)
- 添加特定文件头，包含 file_size、check_sum、version、time、ring.bin 信息
- 输出文件后缀为 .bin
- 输出文件尺寸不超过192KB（GRP话机限制）

## LICENSE

- [opus-recorder](https://github.com/chris-rudmin/opus-recorder/blob/master/LICENSE.md)
- [alawmulaw](https://github.com/rochars/alawmulaw/blob/master/LICENSE)
