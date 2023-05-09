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
   
 ## 案例demo
  - [canvas小画板——（1）平滑曲线](https://www.cnblogs.com/fangsmile/p/13427794.html)
  - [canvas可视化效果之内阴影效果](https://www.cnblogs.com/flyfox1982/p/14171581.html)
  - [canvas 画板](https://github.com/xpyjs/javascript-canvas-paint-demo)
  - [fabric.js 中文教程](https://k21vin.gitee.io/fabric-js-doc/articles/)
  - [Fabric.js 从入门到精通](https://juejin.cn/post/7026941253845516324)
  - [canvas 各种demo](http://fabricjs.com/demos/)
  - [前端可视化内容_fabric.js](http://k21vin.gitee.io/front-end-data-visualization/#/fabric/fabric-basic/fabric-i-text)