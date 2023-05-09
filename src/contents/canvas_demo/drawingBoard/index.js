let showPosition = document.getElementsByClassName("showPosition")[0]
let textBox = document.getElementById("textBox");
let canvas = document.getElementsByClassName("canvas")[0]
let ctx = canvas.getContext("2d")
let canvasPos = canvas.getBoundingClientRect()
canvas.width = canvasPos.width
canvas.height = canvasPos.height

let showInputFlag = false;  // 标记是否要绘制
let points = [];            // 存储坐标点
let textContext = ''        // 文字内容

/** textarea 内容及样式处理
 * **/
function makeExpandingArea(el){
    var setStyle = function(el,isAddCols = false){
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';

        if(!isAddCols && textBox.cols < 30){
            textBox.cols  = textBox.cols + 1
        }
    }
    var delayedResize = function(el) {
        window.setTimeout(function(){
            setStyle(el, true)
        }, 0);
    }

    if(el.addEventListener){
        el.addEventListener('keyup',function(event){
            let getKeyCode = event && event.keyCode
            let isAddCols = getKeyCode === 13 ? true: false
            setStyle(el, isAddCols)
        },false)
    }else if(el.attachEvent){
        el.attachEvent('onpropertychange',function(event){
            let getKeyCode = event && event.keyCode
            let isAddCols = getKeyCode === 13 ? true: false
            setStyle(el, isAddCols)
        })
        setStyle(el)
    }
    if(window.VBArray && window.addEventListener) { //IE9
        el.attachEvent("onkeydown", function() {
            var key = window.event.keyCode;
            if(key == 8 || key == 46) delayedResize(el);

        });
        el.attachEvent("oncut", function(){
            delayedResize(el);
        });//处理粘贴
    }
}

/** canvas 绘制表格
 * **/
canvas.drawTable = function(context){
    let gridSize = 50
    let row = parseInt(canvas.height / gridSize);
    let col = parseInt(canvas.width / gridSize);
    for(let i=0;i < row;i++)
    {
        context.beginPath();
        context.moveTo(0,i * gridSize - 0.5);
        context.lineTo(canvas.width,i * gridSize - 0.5);
        context.strokeStyle = "#ccc";
        context.stroke();
    }
    for(let i=0;i < col;i++)
    {
        context.beginPath();
        context.moveTo(i * gridSize - 0.5,0);
        context.lineTo(i * gridSize - 0.5,canvas.height);
        context.strokeStyle="#ccc";
        context.stroke();
    }
}


canvas.loadImage = function () {
    let self = this;
    let img = new Image();
    img.src = self.lastImage;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

canvas.initCanvas = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.loadImage();
}

canvas.drawing = function(x1,y1,x2,y2,e){
    let self = this
    if(!ctx) return
    if(self.penFlag)return

    // 设置画笔的颜色和大小
    ctx.fillStyle = 'red'       // 填充颜色为红色
    ctx.strokeStyle = 'red'     // 画笔的颜色
    ctx.lineWidth = 10          // 指定描边线的宽度
    // ctx.globalAlpha = 0.8;      // 画笔透明度

    ctx.save()
    ctx.beginPath()

    if(self.rectFlag){
        self.initCanvas()
        if (e.shiftKey === true) {
            // 正方形
            let d = ((x2 - x1) < (y2 -y1)) ? (x2 - x1) : (y2 - y1);
            ctx.fillRect(x1, y1, d, d);
        } else {
            // 普通方形
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        }
    } else if (self.strokeRectFlag) {
        // console.log('画空心矩形')
        self.initCanvas();
        if (e.shiftKey === true) {
            // 正方形
            let d = ((x2 - x1) < (y2 -y1)) ? (x2 - x1) : (y2 - y1);
            ctx.strokeRect(x1, y1, d, d);
        } else {
            // 普通方形
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
    } else if (self.circleFlag) {
        // console.log('画圆形')
        self.initCanvas();
        let k = ((x2 - x1) / 0.55);
        let w = (x2 - x1) / 2;
        let h = (y2 - y1) / 2;

        if (e.shiftKey === true) {
            // circle
            let r = Math.sqrt(w * w + h * h);
            ctx.arc(w + x1, h + y1, r, 0, Math.PI * 2);
        } else {
            // ellipse
            // bezier double ellipse algorithm
            ctx.moveTo(x1, y1 + h);
            ctx.bezierCurveTo(x1, y1 + h * 3, x1 + w * 11 / 5, y1 + h * 3, x1 + w * 11 / 5, y1 + h);
            ctx.bezierCurveTo(x1 + w * 11 / 5, y1 - h, x1, y1 - h, x1, y1 + h);
        }
        ctx.fill();
    } else if (self.strokeCircelFlag) {
        // console.log('画空心圆形')
        self.initCanvas();
        let k = ((x2 - x1) / 0.55);
        let w = (x2 - x1) / 2;
        let h = (y2 - y1) / 2;

        if (e.shiftKey === true) {
            // circle
            let r = Math.sqrt(w * w + h * h);
            ctx.arc(w + x1, h + y1, r, 0, Math.PI * 2);
        } else {
            // ellipse
            // bezier double ellipse algorithm
            ctx.moveTo(x1, y1 + h);
            ctx.bezierCurveTo(x1, y1 + h * 3, x1 + w * 11 / 5, y1 + h * 3, x1 + w * 11 / 5, y1 + h);
            ctx.bezierCurveTo(x1 + w * 11 / 5, y1 - h, x1, y1 - h, x1, y1 + h);
        }
        ctx.stroke();
    } else if (self.lineFlag) {
        // console.log('画直线')
        self.initCanvas();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else if (self.arrowFlag) {
        // console.log('画箭头')
        self.initCanvas();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        let endRadians = Math.atan((y2 - y1) / (x2 - x1));
        endRadians += ((x2 >= x1) ? 90 : -90) * Math.PI / 180;
        ctx.translate(x2, y2);
        ctx.rotate(endRadians);
        ctx.moveTo(0,  -2 * ctx.lineWidth);
        ctx.lineTo(2 * ctx.lineWidth, 3 * ctx.lineWidth);
        ctx.lineTo(-2 * ctx.lineWidth, 3 * ctx.lineWidth);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();

    } else if (self.textFlag) {
        // console.log('画文字')
        // ctx.font = "28px orbitron";
        // ctx.fillText(textContent, parseInt(textBox.style.left), parseInt(textBox.style.top));

        ctx.font = '14px SFUIDisplay';
        ctx.textBaseline = 'top';     // "alphabetic" | "bottom" | "hanging" | "ideographic" | "middle" | "top";
        ctx.textAlign = 'left';       // "center" | "end" | "left" | "right" | "start"; 值不同，绘制的时候 fillText 的坐标也要修改
        console.warn("get textContent:",textContent)
        let allChars = textContent && textContent.split('')
        let lineText = '';   // 每行的内容
        let y = parseInt(textBox.style.top);

        let lineHeight = 20;   // 每行的高度
        for (let i = 0; i < allChars.length; i++) {
            // measureText 可计算绘制内容的宽度
            let metric = ctx.measureText(lineText + allChars[i]);
            if (metric.width < 225 /*ctx.canvas.width / dpr*/) {
                lineText += allChars[i];
                if (i === allChars.length - 1) {
                    // 绘制结束的文本
                    // ctx.fillText(lineText, 0, y);
                    ctx.fillText(lineText, parseInt(textBox.style.left), y);
                }else if(allChars[i] === '\n'){
                    // 绘制整行内容
                    ctx.fillText(lineText, parseInt(textBox.style.left), y);
                    lineText = '';
                    y = y + lineHeight;
                }
            } else {
                // 绘制整行内容
                // ctx.fillText(lineText, 0, y);
                ctx.fillText(lineText, parseInt(textBox.style.left), y);
                lineText = allChars[i];
                y =  y + lineHeight;
            }
        }
    } else if (self.eraserFlag) {
        // 橡皮擦
        ctx.arc(x1, y1, 10, 0, 2 * Math.PI);
        ctx.clip();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        self.startX = self.currentX;
        self.startY = self.currentY;
    } else{
        // ctx.moveTo(x1, y1);
        // ctx.lineTo(x2, y2);
        // ctx.stroke();
        // self.startX = self.currentX;
        // self.startY = self.currentY;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        points.push({ x: x2, y: y2 });
        // ctx.globalCompositeOperation = "xor";//使用异或操作对源图像与目标图像进行组合。
        ctx.beginPath();
        let x = (points[points.length - 2].x + points[points.length - 1].x) / 2,
            y = (points[points.length - 2].y + points[points.length - 1].y) / 2;
        if (points.length == 2) {
            ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
            ctx.lineTo(x, y);
        } else {
            let lastX = (points[points.length - 3].x + points[points.length - 2].x) / 2,
                lastY = (points[points.length - 3].y + points[points.length - 2].y) / 2;
            ctx.moveTo(lastX, lastY);
            ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, x, y);
        }
        ctx.stroke();
        points.slice(0, 1);
    }
    ctx.restore();
    ctx.closePath();
}
canvas.onmousedown = function (event) {
    let self = this
    // self.startX = event.offsetX
    // self.startY = event.offsetY
    self.startX = event.clientX - canvasPos.x
    self.startY = event.clientY - canvasPos.y
    if (canvas.textFlag) {

        /**** 显示输入框 */
        textBox.style.display = "block"
        textBox.style.height = "19px"

        /** 每次点击恢复原本大小**/
        textBox.cols = 1;
        textBox.rows = 1;
        textBox.style.height = '19px';
        textContent = textBox.value;
        showInputFlag = false;
        // textBox.style['z-index'] = 1;
        textBox.value = "";
        this.drawing(this.startX, this.startY);

        /** 绘图后将文本框恢复到原点***/
        //  textBox.style.left = '30px';
        // textBox.style.top = '30px';

        textBox.style.display ="block"
        textBox.style.left = this.startX + 'px';
        textBox.style.top = this.startY + 'px';
        textBox.style['z-index'] = 100000;
    }else{
        self.isMouseDown = true
        self.loadImage();
        points.push({ x: self.startX, y: self.startY });
    }
}

canvas.onmousemove = function(event){
    let self = this
    if(self.isMouseDown){
        self.drawing(self.startX,self.startY, self.currentX,self.currentY,event)

    }
    // self.currentX = event.offsetX
    // self.currentY = event.offsetY
    self.currentX = event.clientX - canvasPos.x
    self.currentY = event.clientY - canvasPos.y

    // 坐标显示
    showPosition.style.left = self.currentX + 5 + 'px'
    showPosition.style.top =  self.currentY + 5 + 'px'
    showPosition.style.display = "block";
    showPosition.textContent = `x: ${self.currentX}, y:${self.currentY}`
}

canvas.onmouseup = function(e){
    let self = this
    self.lastImage = canvas.toDataURL('image/png');
    self.isMouseDown = false

    self.endX = e.offsetX
    self.endY = e.offsetY
    textBox.value = ''

    points = []
    if(showInputFlag){
        showInputFlag = false
    }
}

canvas.onmouseleave = function(){
    showPosition.style.display = "none";
}


/** 初始默认设置
 * */
var initDraw = function (flag) {
    canvas.penFlag = false;
    canvas.rectFlag = false;
    canvas.strokeRectFlag = false;
    canvas.circleFlag = false;
    canvas.strokeCircelFlag = false;
    canvas.lineFlag = false;
    canvas.arrowFlag = false;
    canvas.textFlag = false;
    canvas.eraserFlag = false;

    canvas[flag] = true;

    // 默认背景色
    defaultBtn.style.background = "#fff";
    penBtn.style.background = "#fff"
    lineBtn.style.background = "#fff";
    arrowBtn.style.background = "#fff";
    rectBtn.style.background = "#fff";
    strokeRectBtn.style.background = "#fff";
    circleBtn.style.background = "#fff";
    strokeCircleBtn.style.background = "#fff";
    textBtn.style.background = "#fff";
    eraserBtn.style.background = "#fff";
    clearBtn.style.background = "#fff";
    fullBtn.style.background = "#fff";

    // 默认文字色
    defaultBtn.style.color = "#000";
    penBtn.style.color = "#000";
    lineBtn.style.color = "#000";
    arrowBtn.style.color = "#000";
    rectBtn.style.color = "#000";
    strokeRectBtn.style.color = "#000";
    circleBtn.style.color = "#000";
    strokeCircleBtn.style.color = "#000";
    textBtn.style.color = "#000";
    eraserBtn.style.color = "#000";
    clearBtn.style.color = "#000";
    fullBtn.style.color = "#000";


    // 设置鼠标样式，默认画笔，如果
    // canvas.style.cursor = "url(./asset/paintbrush.png) 0 0, default";
    if (canvas.eraserFlag) {
        canvas.style.cursor = "url(./asset/eraser-20.png) 10 10, default";
    }

    /**** 显示输入框 */
    textBox.style.display = "none"
}

var drawDefault = function () {
    initDraw();
    defaultBtn.style.background = "#22A6F2";
    defaultBtn.style.color = "#eee";
};

/** 激光笔
 * */
var drawPen = function(){
    initDraw("penFlag");
    canvas.style.cursor = "url(./asset/logo_16x16.png) 10 10, default";
    penBtn.style.background = "#22A6F2";
    penBtn.style.color = "#eee";
}

var drawRect = function () {
    initDraw("rectFlag");
    rectBtn.style.background = "#22A6F2";
    rectBtn.style.color = "#eee";
};

var drawStrokeRect = function () {
    initDraw("strokeRectFlag");
    strokeRectBtn.style.background = "#22A6F2";
    strokeRectBtn.style.color = "#eee";
};

var drawCircle = function () {
    initDraw("circleFlag");
    circleBtn.style.background = "#22A6F2";
    circleBtn.style.color = "#eee";
};

var drawStrokeCircle = function () {
    initDraw("strokeCircelFlag");
    strokeCircleBtn.style.background = "#22A6F2";
    strokeCircleBtn.style.color = "#eee";
};

var drawLine = function () {
    initDraw("lineFlag");
    lineBtn.style.background = "#22A6F2";
    lineBtn.style.color = "#eee";
}

var drawArrow = function () {
    initDraw("arrowFlag");
    arrowBtn.style.background = "#22A6F2";
    arrowBtn.style.color = "#eee";
};

var drawText = function () {
    initDraw("textFlag");
    makeExpandingArea(textBox);
    textBtn.style.background = "#22A6F2";
    textBtn.style.color = "#eee";
};

var drawEraser = function () {
    initDraw("eraserFlag");
    eraserBtn.style.background = "#22A6F2";
    eraserBtn.style.color = "#eee";
};

var drawClear = function(){
    initDraw("clear")
    canvas.initCanvas()
    canvas.lastImage = null
    // 清除并隐藏输入框
    textBox.cols = 1
    textBox.rows = 1
    textBox.value =''
    textBox.style.display = "none"

    clearBtn.style.background = "#22A6F2";
    clearBtn.style.color = "#eee";
    // canvas.drawTable(ctx)
}

var fullOrExit = function(){
    initDraw("fullOrExit")
    toggleFullscreen()

    canvas.lastImage = canvas.toDataURL('image/png');
    canvas.loadImage()
    fullBtn.style.background = "#22A6F2";
    fullBtn.style.color = "#eee";
}

/***************************************************************全屏********************************************************************/
let presentVideo = document.getElementsByClassName("localVideo")[0]
let videoContainter = document.getElementsByClassName("presentVideoContainter")[0]
let fullBtn = document.getElementById("fullBtn")

/** 全屏监听事件
 * */
document.addEventListener("fullscreenchange", function( event ) {
    if (document.fullscreenElement) {
        console.log('Enter Full screen mode');
    } else {
        console.log('Exit Full Screen Mode');
    }
});

/** 离开画中画监听事件
 * */
presentVideo.addEventListener("leavepictureinpicture",  function(){
    console.log("Picture-in-Picture mode deactivated!");
}, false);

/** 进入画中画监听事件
 **/
presentVideo.addEventListener("enterpictureinpicture", function(){
    console.log("Picture-in-Picture mode activated!");
}, false);

/** 切换全屏模式
 * */
function toggleFullscreen(isStopScreen = null) {
    let isFullScreenEnabled = isFullscreenEnabled()
    if( !isFullScreenEnabled){
        console.warn("current browser do not support fullScreen")
        return
    }

    let isFullscreen = isFullScreen()
    let fullscreenElement = fullScreenElement()
    if (!isFullscreen && !fullscreenElement && !isStopScreen) {
        if (videoContainter.requestFullscreen) {
            videoContainter.requestFullscreen()
            // presentVideo.requestFullscreen()
        } else if (videoContainter.webkitRequestFullScreen) {
            videoContainter.webkitRequestFullScreen()
            presentVideo.webkitRequestFullScreen()
        } else if (videoContainter.mozRequestFullScreen) {
            videoContainter.mozRequestFullScreen()
            presentVideo.mozRequestFullScreen()
        }  else if (videoContainter.msRequestFullscreen) {
            videoContainter.msRequestFullscreen()
            presentVideo.msRequestFullscreen()
        }
        setFullscreenData(true);

        fullBtn.value= '退出'
    } else {
        if(fullscreenElement){
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
            setFullscreenData(false);
            fullBtn.value= '全屏'
        }
    }
}
/** 设置videoContainer 全屏状态
 * @param state: true 全屏  false：退出全屏
 * */
var setFullscreenData = function(state) {
    videoContainter.setAttribute('data-fullscreen', !!state);
}

/** 判断当前是否全屏
 * */
function isFullScreen() {
    return  !! (document.fullscreen ||document.mozFullScreen || document.webkitIsFullScreen || document.webkitFullScreen || document.msFullScreen );
}

/** 判断当前是否有全屏模式的element
 * */

function fullScreenElement() {
    return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement
}

/** 判断当前文档是否能切换到全屏，即当前浏览器是否支持全屏模式
 **/
function isFullscreenEnabled() {
    return  ( document.fullscreenEnabled || document.mozFullScreenEnabled ||
        document.webkitFullscreenEnabled || document.msFullscreenEnabled
    );
}

/** 切换画中画模式
 * */
function togglePictureInPicture(isStopScreen = null) {
    if(!isLoadingOfShareScreen){
        console.warn("current no exist shareScreen stream, pictureInPicture not supported")
        return
    }

    if(!document.pictureInPictureEnabled){
        console.warn("current browser do not support pictureInPicture")
        return
    }

    if (document.pictureInPictureElement) {
        document.exitPictureInPicture();
    } else {
        if(!isStopScreen){
            presentVideo.requestPictureInPicture();
        }
    }
}

/******************************************************************************监听 当前页面video宽高的变化 *************************************************************************************/
const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        if (entry.contentBoxSize) {
            canvas.width = entry.contentBoxSize[0].inlineSize
            canvas.height = entry.contentBoxSize[0].blockSize
        } else {
            canvas.width = entry.contentRect.width
            canvas.height = entry.contentRect.height
        }
    }
    canvasPos = canvas.getBoundingClientRect()

    canvas.lastImage = canvas.toDataURL('image/png');
    canvas.loadImage()
    console.log('Size changed',canvas.lastImage);
});

resizeObserver.observe(videoContainter);

window.onload = function(){
    canvas.drawTable(ctx)
}