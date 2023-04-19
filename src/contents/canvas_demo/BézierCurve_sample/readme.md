## 关于贝塞尔曲线 bezier
 [bezier-js](https://www.npmjs.com/package/bezier-js?activeTab=code)
 
 [laser-pen](https://github.com/SilentTiger/laser-pen)

 [贝塞尔曲线 demo](https://silenttiger.online/laser-pen/)
 
 
 
 ## 关于canvas
 
 - canvas 是存在默认的宽高的， 若设置了100%，获取对应的宽高还是默认的宽高
 - canvas的宽高需要通过`getBoundingClientRect` 获取当前对应的宽高来设置
   - 示例：
   
   ```javascript
      let canvas = document.getElementsByClassName("canvas")[0]
      let canvasPos = canvas.getBoundingClientRect()
      let ctx = canvas.getContext("2d")
      canvas.width = canvasPos.width
      canvas.height = canvasPos.height
   ```