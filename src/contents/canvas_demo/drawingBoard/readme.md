 ## 一、解析
   - [使用鼠标实时绘制图形](http://www.jeremyjone.com/472/) 
   - [参考 canvas 画板](https://github.com/xpyjs/javascript-canvas-paint-demo)
   
 ## 二、 使用鼠标实时绘制图形[demo](https://he-juan.github.io/js-samples-demo/src/contents/canvas_demo/drawingBoard/)
   
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
   3. canvas画布大小和真实大小 像素比例：
       ```javascript
        /** 转换canvas的像素坐标
         * @param x：鼠标当前移动相对于canvas的x 偏移量
         * @param y：鼠标当前移动相对于canvas的y 偏移量
         * */
        
        var changeCanvasPosition = function(x, y){
            // let cavasHtmlWidth = canvas.width
            // let canvasHtmlHeight = canvas.height
            // let {width:canvasStyleWidth, height: canvasStyleHeight} = canvas.getBoundingClientRect()
            // let nextX = x * cavasHtmlWidth / canvasStyleWidth
            // let nextY = y * canvasHtmlHeight / canvasStyleHeight
            let getRatio = getCanvasRatio()
            let nextX = x / getRatio.xRatio
            let nextY = y / getRatio.yRatio
        
            return {nextX, nextY}
        }
        /** 获取canvas画布大小和像素大小比例
         * @param canvas.width, canvas.height: canvas画布像素的大小
         * @param canvasStyleWidth, canvasStyleHeight: 肉眼可见的canvas大小
         * @return  xRatio = canvasStyleWidth / cavasHtmlWidth;
         * @return  yRatio  = canvasStyleHeight / canvasHtmlHeight
         ***/
        var getCanvasRatio = function(){
            let cavasHtmlWidth = canvas.width
            let canvasHtmlHeight = canvas.height
            let { width: canvasStyleWidth, height: canvasStyleHeight} = canvas.getBoundingClientRect()
            let xRatio = canvasStyleWidth / cavasHtmlWidth
            let yRatio  = canvasStyleHeight / canvasHtmlHeight
        
            return {xRatio, yRatio}
        }
       ```
   4. 绘制表格。
   
       ```javascript
        canvas.drawTable = function(context){
            let gridSize = 50
            let row = parseInt(canvasPos.height / gridSize) ;
            let col = parseInt(canvasPos.width / gridSize) ;      
            for(let i=0;i < row;i++)
            {
                context.beginPath();
                context.moveTo(0,i * gridSize - 0.5);
                context.lineTo(canvasPos.width,i * gridSize - 0.5);
                context.strokeStyle = "#ccc";
                context.stroke();
            }
            for(let i=0;i < col;i++)
            {
                context.beginPath();
                context.moveTo(i * gridSize - 0.5,0);
                context.lineTo(i * gridSize - 0.5,canvasPos.height);
                context.strokeStyle="#ccc";
                context.stroke();
            }
        }
       ```
       
   5. **当鼠标按下时，获取事件**，保存鼠标当前位置为起始位置(x1, y1)，并且将一个按下的flag变为true，这样在移动鼠标时，可以判断是否应该绘图，同时加载背景图片。  
   6. **当鼠标按下且移动时**，调用自定义的绘图函数drawing，并且保存鼠标移动时的当前位置，该位置在移动时不停切换，作为绘图的结束位置(x2, y2)，图片会不停的绘制
   7. **当鼠标抬起时**，停止绘图，将移动flag变为false，同时保存最后一张图片，这样就获取到了我们需要的最后的图片，后续可以加载为背景
 
 
 ## 三、canvas 绘制注意事项
 
  - 关于 canvas style width 和 canvas.width：
    - canvas style width：是canvas element style中设置的width属性的值；即通过内联样式、内部样式表或外部样式表设置，一般称为画板尺寸。
    - canvas width：就是给canvas html width设置的值；即画布真实的大小 且决定能看到画布的大小；一般称为画布尺寸。
    - 两者区别：style width决定在浏览器的大小表现。canvas html width决定canvas里面有多少个像素。
    - canvas真实大小时，默认按300*150处理，如果canvas.style也没提供，那么style.width为空，注意并不是300*150
    - [canvas style width和canvas.width 详细解释](https://www.jianshu.com/p/fcb541914a80)
 
    - [如何正确设置canvas尺寸，以及如何在高分辨率屏幕上清晰显示canvas图形](https://segmentfault.com/a/1190000020189168)
 
 
 ## 四、关于全屏放大缩小canvas和video位置一致问题：
 
     <video  class="fitWidth localVideo" ></video>
     <canvas class="canvas" width="1600px" height="1600px"></canvas>
     
     
  - 关于canvas 和 video显示画面起点一致问题：
    - 默认情况下，video和canvas的width和height都设置成100%；
   
        ```javascript
            width:100%;
            height:100%;
      
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%,-50%);
        ```   
    - 对video设置css样式：
    
        ```javascript
           .localVideo{
                height: auto;
                max-width: calc(100%);
            }
           .fitWidth {
               height: 100%;
               width: auto;
           }
        ```      
    - 当获取流成功，放在video中后,需要通过css样式去获取video的真实宽高,且给canvas的style.width 去设置对应的宽高； 即放大缩小都针对改变宽高值。
    
        ```javascript
        navigator.mediaDevices.getDisplayMedia({video:{width:1920, height: 1080}}).then(function(stream){
            presentVideo.srcObject = stream
        })
        
        presentVideo.onloadedmetadata = function(){
            presentVideo.play()
            let {width, height} = presentVideo.getBoundingClientRect()
            canvas.style.width  = width + 'px'
            canvas.style.height = height + 'px'
        }
        ```
 
 ## 五、案例demo
  - [canvas小画板——（1）平滑曲线](https://www.cnblogs.com/fangsmile/p/13427794.html)
  - [canvas可视化效果之内阴影效果](https://www.cnblogs.com/flyfox1982/p/14171581.html)
  - [canvas 画板](https://github.com/xpyjs/javascript-canvas-paint-demo)
  - [fabric.js 中文教程](https://k21vin.gitee.io/fabric-js-doc/articles/)
  - [Fabric.js 从入门到精通](https://juejin.cn/post/7026941253845516324)
  - [canvas 各种demo](http://fabricjs.com/demos/)
  - [前端可视化内容_fabric.js](http://k21vin.gitee.io/front-end-data-visualization/#/fabric/fabric-basic/fabric-i-text)
  - [canvas文字的绘制 与 textarea](https://juejin.cn/post/7129140994011824141)