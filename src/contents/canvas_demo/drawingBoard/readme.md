 ## 解析
   - [使用鼠标实时绘制图形](http://www.jeremyjone.com/472/) 
   
   ### 使用鼠标实时绘制图形
   
    >  canvas需要实时的显示图片内容
    
    
   1. 加载图片和清空canvas。
   
       ```
       canvas.loadImage = function () {
           let self = this;
           let img = new Image();
           img.src = self.lastImage;  // 将最后保存的图片赋值给img
           context.drawImage(img, 0, 0, canvas.width, canvas.height);  // 将img展示在canvas中
       }
       
       canvas.initCanvas = function () {
           context.clearRect(0, 0, canvas.width, canvas.height);  // 清空canvas
           canvas.loadImage();  // 将最近的图片展示到canvas中
       }
       ```
   
   2. 获取鼠标事件。
   
       ```javascript
       canvas.onmousedown = function mouseDownAction(e) {
           let self = this;
           self.X1 = e.offsetX;  // 鼠标按下时保存当前位置，为起始位置
           self.Y1 = e.offsetY;
           self.isMouseDown = true;  // 将按下的flag表示为true，拖动鼠标时使用
           self.loadImage();
       };
       
       canvas.onmousemove = function mouseMoveAction(e) {
           let self = this;
           if (self.isMouseDown) {
               self.X2 = e.offsetX;
               self.Y2 = e.offsetY;
               self.drawing(self.X1, self.Y1, self.X2, self.Y2, e);
           }
       };
       
       canvas.onmouseup = function mouseUpAction(e) {
           let self = this;
           self.lastImage = canvas.toDataURL('image/png');
           self.isMouseDown = false;
       };
    
       ```
   3. **当鼠标按下时，获取事件**，保存鼠标当前位置为起始位置(x1, y1)，并且将一个按下的flag变为true，这样在移动鼠标时，可以判断是否应该绘图，同时加载背景图片。  
   4. **当鼠标按下且移动时**，调用自定义的绘图函数drawing，并且保存鼠标移动时的当前位置，该位置在移动时不停切换，作为绘图的结束位置(x2, y2)，图片会不停的绘制
   5. **当鼠标抬起时**，停止绘图，将移动flag变为false，同时保存最后一张图片，这样就获取到了我们需要的最后的图片，后续可以加载为背景
 
 ## 案例demo
  - [canvas小画板——（1）平滑曲线](https://www.cnblogs.com/fangsmile/p/13427794.html)
  - [canvas可视化效果之内阴影效果](https://www.cnblogs.com/flyfox1982/p/14171581.html)
  - [canvas 画板](https://github.com/xpyjs/javascript-canvas-paint-demo)
  - [fabric.js 中文教程](https://k21vin.gitee.io/fabric-js-doc/articles/)
  - [Fabric.js 从入门到精通](https://juejin.cn/post/7026941253845516324)
  - [canvas 各种demo](http://fabricjs.com/demos/)
  - [前端可视化内容_fabric.js](http://k21vin.gitee.io/front-end-data-visualization/#/fabric/fabric-basic/fabric-i-text)