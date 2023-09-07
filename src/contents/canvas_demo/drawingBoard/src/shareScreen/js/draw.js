/**********************canvas 绘制 ***********************/
class CanvasExample {
    isMouseDown = false            // 鼠标是否可以点击
    points = []                    // 点击获取的坐标
    startX = null                  // 开始点击的横坐标
    startY = null                  // 开始点击的纵坐标
    currentX = null                // 当前点击的横坐标
    currentY = null                // 当前点击的纵坐标
    root = document
    dpr = window.devicePixelRatio

    canvas = null
    ctx = null
    width = null
    height = null
    videoContainer = null
    canvasToolsBar = null
    fullScreenModel = null
    dragMoveModal = null

    /**对端 canvas 大小**/
    remoteCanvas = {
        width: null,
        height: null
    }

    /**编写文字输入框**/
    textBox = document.getElementsByClassName("textBox")[0]
    textContent = ''        // 输入的内容
    showInputFlag = false

    /**右侧工具栏**/
    rightTools = document.getElementsByClassName("rightTools")[0]
    scaleContent = document.getElementsByClassName("scaleContent")[0]
    toolsWrapper = document.getElementsByClassName("toolsWrapper")[0]

    /**跟随鼠标显示用户名**/
    showPosition = document.getElementsByClassName("showPosition")[0]

    /**框选区域的参数**/
    isCompleteSelectArea = false
    selectAreaElement = document.getElementsByClassName("selectionArea")[0]
    mouseX1 = 0
    mouseY1 = 0
    mouseX2 = 0
    mouseY2 = 0

    /***关于用户和评论显示问题**/
    isShowAccount = true
    isShowComment = true

    /**canvas 和 video的父元素**/
    area = document.getElementsByClassName("areaContent")[0]
    canvasArray = []


    /******************监听 当前页面video宽高的变化 ****/
    resizeObserver = new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
            if (!Array.isArray(entries) || !entries.length) {
                return;
            }

            for (const entry of entries) {
                if (entry.contentBoxSize) {
                    this.canvas.style.width = entry.contentBoxSize[0].inlineSize  + 'px'
                    this.canvas.style.height = entry.contentBoxSize[0].blockSize  + 'px'
                } else {
                    this.canvas.style.width = entry.contentRect.width  + 'px'
                    this.canvas.style.height = entry.contentRect.height + 'px'
                }
                this.setSize()
            }
            this.width = this.canvas.width
            this.height = this.canvas.height
            console.log('Size changed');
        });

    });


    constructor(config) {
        this.initConfig(config)
        this.initEvent()
        this.initObserver()
        this.scaleContent.textContent = currentLocale['L44']
    }

    initConfig(config){
        this.canvas = config.canvas
        this.ctx = config.canvas.getContext('2d')
        this.width =  config.canvas.width
        this.height =  config.canvas.height
        this.videoElement = config.videoElement
        this.videoContainer = config.toolParam?.targetEl
        this.videoWrapper = config.videoWrapper
        this.canvasToolsBar = new CanvasToolsBar()
        this.fullScreenModel = new toggleFullScreenModal(config.toolParam)
        this.dragMoveModal = new DragMoveModel(config.dragParam)
    }

    initCanvas(){
        this.ctx.clearRect(0, 0, this.width, this.height)
        this.loadImage(this.ctx);
    }

    /**监听video宽高的变化**/
    initObserver(){
        this.resizeObserver.observe(this.videoContainer)
    }

    // 初始化监听事件
    initEvent(){
        /***canvas事件监听***/
        this.canvas.addEventListener('mousedown',this.mousedownHandler)
        this.canvas.addEventListener('mousemove', this.mousemoveHandler)
        this.canvas.addEventListener('mouseup', this.mouseupHandler)
        this.canvas.addEventListener('mouseleave', this.mouseleaveHandler)

        /**全局监听***/
        this.root.addEventListener('keydown', this.keydownHandler)
        this.textBox.addEventListener('keyup',this.DrawTextHandler)
        this.videoElement.addEventListener('loadedmetadata',this.videoHandler)

        /**监听事件处理右侧工具栏**/
        this.scaleContent.addEventListener('click', this.changeContentHandler)
    }

    videoHandler = () =>{
        this.setSize()
    }

    setSize(){
        this.videoElement.parentNode.style.width = ""
        this.videoElement.parentNode.style.height = ""

        var containerWidth =  this.videoElement.parentNode.clientWidth ;
        var containerHeight = this.videoElement.parentNode.clientHeight ;

        var videoRatio = this.videoElement.videoWidth / this.videoElement.videoHeight;
        var containerRatio = containerWidth / containerHeight;

        if (videoRatio > containerRatio) {
            /***设置video大小***/
            this.videoElement.style.width = containerWidth + 'px';
            this.videoElement.style.height = containerWidth / videoRatio + 'px';

            /** 设置canvas大小 **/
            this.canvas.style.width  = containerWidth + 'px';
            this.canvas.style.height = containerWidth / videoRatio + 'px';

            /** 设置videoWrapper大小 **/
            this.videoWrapper.style.minWidth = containerWidth + 'px'
            this.videoWrapper.style.minHeight = containerWidth / videoRatio + 'px'

            /** 设置video parentNode 大小 **/
            this.videoElement.parentNode.style.width = containerWidth + 'px'
            this.videoElement.parentNode.style.height = containerWidth / videoRatio + 'px'
        } else {
            this.videoElement.style.width = containerHeight * videoRatio + 'px';
            this.videoElement.style.height = containerHeight + 'px';

            this.canvas.style.width  = containerHeight * videoRatio + 'px';
            this.canvas.style.height = containerHeight + 'px';

            /** 设置videoContainer 的大小 **/
            this.videoWrapper.style.minWidth = containerHeight * videoRatio + 'px'
            this.videoWrapper.style.minHeight = containerHeight + 'px'

            /** 设置video parentNode 大小 **/
            this.videoElement.parentNode.style.width = containerHeight * videoRatio + 'px'
            this.videoElement.parentNode.style.height = containerHeight + 'px'
        }

        /***设置其他canvas的大小****/
        if(this.canvasArray.length){
            for(let canvas of this.canvasArray){
                canvas.style.width = this.canvas.clientWidth + 'px'
                canvas.style.height = this.canvas.clientHeight + 'px'
            }
        }

        /**告知对端: 本端canvas大小**/
        let canvasPos = this.canvas.getBoundingClientRect()
        sendCurrentMousePosition({type: 'remotePosition',lineContent: this.getCurrentLine(), width:canvasPos.width, height:canvasPos.height})
    }

    /***创建canvas
     * @param config.name       :    canvas 的标志
     * @param config.brushColor :    canvas 本身笔尖的颜色
     * **/
    createCanvas (config){
        if(!config?.account?.id) return
        let canvas = document.createElement('canvas')
        canvas.width = 1600
        canvas.height = 1600
        canvas.points = []
        canvas.setAttribute('name',config.account?.name)
        canvas.setAttribute('nameId',config.account?.id)
        canvas.name = config.account?.name
        canvas.nameId = config.account?.id
        canvas.brushColor = config.brushColor
        canvas.style.width = this.area.clientWidth + 'px'
        canvas.style.height = this.area.clientHeight + 'px'
        canvas.classList.add('otherCanvas')
        this.canvasArray.push(canvas)
        this.area.append(canvas)
    }

    /**创建右侧工具栏***/
    createTools(data){
        let fragment = document.createDocumentFragment()

        /**首先创建li 节点***/
        let li = document.createElement('li').cloneNode(true)
        li.className = 'rightToolContent'
        li.setAttribute('name', data?.account?.name)
        li.setAttribute('nameId', data?.account?.id)
        li.setAttribute('color', data.brushColor)

        /**创建 color***/
        let color = document.createElement('div').cloneNode(true)
        color.className = `user-backgroundColor`
        color.setAttribute('name', data?.account?.name)
        color.setAttribute('nameId', data?.account?.id)
        color.setAttribute('title', data?.account?.name)
        color.setAttribute('color', data.brushColor)
        color.style.backgroundColor = data.brushColor
        li.appendChild(color)

        /**创建icon***/
        let icon = document.createElement('div').cloneNode(true)
        icon.className = `user-eye GRP-icon-eyes-open`
        icon.setAttribute('name', data?.account?.name)
        icon.setAttribute('nameId', data?.account?.id)
        icon.setAttribute('color', data.brushColor)
        icon.onclick = this.rightToolsHandler
        color.appendChild(icon)

        /**创建 name ***/
        let name = document.createElement('div').cloneNode(true)
        name.className = `user-name`
        name.setAttribute('name', data?.account?.name)
        name.setAttribute('nameId', data?.account?.id)
        name.setAttribute('color', data.brushColor)
        name.textContent = data?.account?.name ? this.truncateStringByByte(data?.account?.name, 2): ""
        color.appendChild(name)

        fragment.appendChild(li)
        this.toolsWrapper.appendChild(fragment)
    }
    /**
     * 按字节截取字符串
     * @param inputString
     * @param length
     * @returns {string}
     */
    truncateStringByByte (inputString, length){
        if (!inputString || length <= 0) {
            return '';
        }

        inputString = inputString.trim()
        let result = '';
        let byteCount = 0;

        for (let i = 0; i < inputString.length; i++) {
            const char = inputString[i];
            const charCode = char.charCodeAt(0);

            // 检查字符的UTF-16编码是否占据2个字节
            if (charCode <= 0xff && byteCount + 1 <= length) {
                result += char;
                byteCount += 1;
            } else if (charCode > 0xff && byteCount + 2 <= length) {
                result += char;
                byteCount += 2;
            } else {
                break;
            }
        }

        return result;
    }

    /***创建鼠标跟随样式（账户）***/
    createMouseAccount(config){
        if(!config?.account?.id) return
        let element = document.createElement('div')
        element.className = `showPosition otherShowPosition`
        element.setAttribute('name',config.account?.name)
        element.setAttribute('nameId',config.account?.id)
        element.name = config.account?.name
        element.nameId = config.account?.id
        element.textContext = `${config.account?.name || config.account?.id}`
        element.style.backgroundColor = config.brushColor
        this.area.appendChild(element)
    }

    /**更改右侧工具栏圆圈的颜色**/
    changeToolColor(data){
        let rightToolContent = document.getElementsByClassName("rightToolContent")
        let changeChild = function(parent){
            let child = parent?.children
            if(child.length){
                for(let note of child){
                    if(note.classList.contains('user-backgroundColor')){
                        note.style.backgroundColor = data.brushColor
                    }
                    note.setAttribute('color', data.brushColor)
                }
            }
        }
        if(rightToolContent.length){
            for(let tool of rightToolContent){
                let name = tool.getAttribute("nameId")
                if(name === data?.account?.id){
                    tool.setAttribute('color', data.brushColor)
                    changeChild(tool)
                    break
                }
            }
        }
    }

    /**更改显示位置div的背景颜色**/
    changeElementStyleForPosition(data){
        let This = this
        let otherShowPosition = document.getElementsByClassName('otherShowPosition')
        let displayPosition = function(ele){
            if(This.isShowAccount){
                ele.style.left = data.currentX + 5 + 'px'
                ele.style.top =  data.currentY + 5 + 'px'
                ele.style.backgroundColor = data.brushColor
                ele.style.display = 'block'
                ele.textContent = `${data.account.name || data.account.id}`
            }else{
                ele.style.display = 'none'
            }
        }
        if(otherShowPosition.length) {
            for(let element of otherShowPosition){
                if(element.getAttribute('nameId') === data.account.id){
                    displayPosition(element)
                    break
                }
            }
        }
    }

    /** canvas 绘制表格
     * **/
    drawTable(){
        let gridSize = 50
        let getRatio = this.getCanvasRatio()
        let row = parseInt(this.height / gridSize) / getRatio.xRatio;
        let col = parseInt(this.width / gridSize) / getRatio.yRatio;

        for(let i=0;i < row;i++)
        {
            this.ctx.beginPath();
            this.ctx.moveTo(0, (i * gridSize - 0.5) /getRatio.yRatio);
            this.ctx.lineTo(this.width/getRatio.xRatio, (i * gridSize - 0.5)/ getRatio.yRatio);
            this.ctx.strokeStyle = "#ccc";
            this.ctx.stroke();
        }
        for(let i=0;i < col;i++)
        {
            this.ctx.beginPath();
            this.ctx.moveTo((i * gridSize - 0.5) / getRatio.xRatio, 0);
            this.ctx.lineTo((i * gridSize - 0.5) / getRatio.xRatio, this.height/getRatio.yRatio);
            this.ctx.strokeStyle="#ccc";
            this.ctx.stroke();
        }
    }

    /***更改canvas 层级 ***/
    changeCanvasZindex(data){
        let zIndex = window.getComputedStyle(data.canvas).zIndex
        if(data.isLocal){
            if (zIndex === '999') {
                data.canvas.style.zIndex = 'auto'
            } else {
                data.canvas.style.zIndex = '999'
            }
        }else{
            if (zIndex === '998') {
                data.canvas.style.zIndex = 'auto'
            } else {
                data.canvas.style.zIndex = '998'
            }
        }

        /***修改当前li 的背景**/
        let rightToolContent = document.getElementsByClassName("rightToolContent")
        let parent = data?.target?.parentElement
        if(rightToolContent.length){
            for(let li of rightToolContent){
                if(li === parent){
                    if(zIndex === 'auto'){
                        li.style.backgroundColor = '#F7F5F1'
                    }else{
                        li.style.backgroundColor = '#E8E2D6'
                    }
                }
            }

        }
    }

    /**隐藏或者显示内容**/
    changeContentHandler = (e)=>{
        e.preventDefault()
        let target = e.target
        let This = this
        if(target.classList.contains('scaleContent')){
            let content = target.textContent
            if(content === currentLocale['L44']){
                target.textContent = currentLocale['L45']
                This.rightTools.style.width = 'auto'
                This.toolsWrapper.style.display = 'none'
            }else if(content === currentLocale['L45']){
                target.textContent = currentLocale['L44']
                This.rightTools.style.width = '130px'
                This.toolsWrapper.style.display = 'block'
            }
        }
    }

    rightToolsHandler = (e)=>{
        e.preventDefault()
        let target = e.target
        let This = this
        let nameId = target.getAttribute("nameId")
        let changeLocalCanvas = function(){
            This.changeCanvasZindex({ canvas: This.canvas, target: target, isLocal: true })
        }

        let changeOtherCanvas = function(){
            let isFind = false
            if(This.canvasArray.length){
                for(let canvas of This.canvasArray){
                    if(canvas.nameId === nameId){
                        isFind = true
                        This.changeCanvasZindex({ canvas: canvas, target: target, isLocal: false })
                        break
                    }
                }
            }

            if(!isFind && This.canvas.nameId == nameId){
                changeLocalCanvas()
            }
        }

        if(target && target.classList.contains('user-eye')){
            /** 更改样式**/
            if(target && target.classList.contains('GRP-icon-eyes-close')){
                target.classList.remove('GRP-icon-eyes-close')
                target.classList.add('GRP-icon-eyes-open')
            }else if(target && target.classList.contains('GRP-icon-eyes-open')){
                target.classList.remove('GRP-icon-eyes-open')
                target.classList.add('GRP-icon-eyes-close')
            }
            changeOtherCanvas()
        }
    }

    /**当前是否可以显示用户名**/
    setShowAccount = function(state){
        this.isShowAccount = state
    }

    setShowComment = function(state){
        this.isShowComment = state
    }

    //输入文字编写
    DrawTextHandler = (event)=>{
        let getKeyCode = event && event.keyCode
        let isAddCols = getKeyCode === 13 ? true: false
        this.makeExpandingArea(isAddCols)
    }

    // 监听delete按键 或者ESC 按键
    keydownHandler = (event)=>{
        let e = event || window.event /*|| arguments?.callee?.caller?.arguments[0]*/
        if(e.keyCode === 8 || e.keyCode === 46) {    // delete keyCode
            this.clearSelectArea()
        }
    }

    // 鼠标按下事件
    mousedownHandler = (event)=>{
        if(this.canvasToolsBar.areaDeleteFlag) return

        setDefaultToolBarChild()
        let {left, top} = this.canvas.getBoundingClientRect()
        let startX = event.clientX - left
        let startY = event.clientY - top

        let getRatio = this.getPostionRatio(true)
        startX = startX / getRatio.xRatio
        startY = startY / getRatio.yRatio
        this.canvasDown({startX,startY, event})

        window.addEventListener("mouseup", this.mouseupHandler)
        let param = {
            type: 'mousedown',
            lineContent: this.getCurrentLine(),
            account: localAccount,
            brushColor: this.canvasToolsBar.getBrushColor(),
            x: startX.toString(),
            y: startY.toString(),
            rect: this.canvas.getBoundingClientRect(),
            action: this.canvasToolsBar.getCurrentSelectedTool()
        }
        sendCurrentMousePosition(param)
    }

    // 鼠标移动事件
    mousemoveHandler = (event)=>{
        let {left, top} = this.canvas.getBoundingClientRect()
        let currentX = event.clientX - left
        let currentY = event.clientY - top

        /**鼠标样式**/
        changeMouseStyle(currentX, currentY)

        if(this.isMouseDown){
            let getRatio = this.getPostionRatio(true)
            currentX = currentX / getRatio.xRatio
            currentY = currentY / getRatio.yRatio
            this.canvasMove({currentX,currentY,event})

            let param = {
                type: 'mousemove',
                lineContent: this.getCurrentLine(),
                account: localAccount,
                brushColor: this.canvasToolsBar.getBrushColor(),
                x: currentX.toString(),
                y: currentY.toString(),
                rect: this.canvas.getBoundingClientRect(),
                action: this.canvasToolsBar.getCurrentSelectedTool(),
                e: event
            }
            sendCurrentMousePosition(param)
        }
    }

    // 鼠标松开事件
    mouseupHandler = (event)=>{
        this.canvasUp()
        window.removeEventListener("mouseup", this.mouseupHandler)
    }

    //鼠标划过、离开事件
    mouseleaveHandler = (event)=>{
        this.showPosition.style.display = "none";
        mouseStyle.style.display = "none"
        sendCurrentMousePosition({type: 'mouseleave', lineContent: this.getCurrentLine() })
    }

    /*** 鼠标监听点击事件处理
     * @param startX
     * @param startY
     */
    canvasDown (data){

        let getPosition = this.changeCanvasPosition(data.startX, data.startY)
        this.startX = getPosition.nextX
        this.startY = getPosition.nextY

        if (this.canvasToolsBar.textFlag) {
            if(this.showInputFlag){
                this.textContent = this.textBox.value
                this.textBox.style['z-index'] = 1
                this.textBox.value = ""
                this.showInputFlag = false
                this.drawing({x1:this.startX, y1:this.startY, event: data.event, target: data.target});

                /** 绘图后将文本框恢复到原点***/
                this.textBox.style.display = 'none'
                // this.textBox.style.left = '30px';
                // this.textBox.style.top = '30px';

            }else{
                this.showInputFlag = true

                /** 每次点击恢复原本大小 且在对应的位置显示输入框**/
                this.textBox.cols = 1;
                this.textBox.rows = 1;
                this.textBox.style.height = '19px'
                this.textBox.style.left = startX + 'px'
                this.textBox.style.top = startY + 'px'
                this.textBox.style.display = 'block'
                this.textBox.style['z-index'] = 999;

                this.textBox.style.color = this.canvasToolsBar.textColor
                this.textBox.style.fontSize = this.canvasToolsBar.textFontSize
            }

        }else{
            this.isMouseDown = true
            // this.loadImage();
            this.points.push({ x: this.startX, y: this.startY });
        }
    }
    /** canvas : mousemove
     * @param currentX
     * @param currentY
     * @param event
     */
    canvasMove(data){
        let This = this
        let displayPosition = function (position) {
            // 显示坐标
            if(This.isShowAccount){
                This.showPosition.style.left = position.currentX + 5 + 'px'
                This.showPosition.style.top =  position.currentY + 5 + 'px'
                This.showPosition.style.display = 'block'
                This.showPosition.textContent = `${localAccount?.name || localAccount?.id}`
            }else{
                This.showPosition.style.display = 'none'
            }
        }
        let drawing = function(position){
            if(This.isMouseDown || This.isShowComment){
                let getPosition = This.changeCanvasPosition(position.currentX,position.currentY)
                This.currentX = getPosition.nextX
                This.currentY = getPosition.nextY
                This.drawing({x1: This.startX, y1: This.startY, x2: This.currentX, y2: This.currentY, event:position.event, target: position.target})
            }
        }

        displayPosition(data)
        drawing(data)
    }

    /**canvas: mouseup  **/
    canvasUp() {
        this.lastImage = this.canvas.toDataURL('image/png');
        this.isMouseDown = false
        this.points = []

        this.textBox.value = ''
        this.showPosition.style.display = 'none'

        if(this.showInputFlag){
            this.showInputFlag = false
        }

        sendCurrentMousePosition({type: 'mouseup', lineContent: this.getCurrentLine(), account: localAccount})

    }

    otherCanvasDown(data){
        let getPosition = this.changeCanvasPosition(data.startX, data.startY)
        this.startX = getPosition.nextX
        this.startY = getPosition.nextY

        /**处理远端绘制内容**/
        if(data.target){
            data.target.points.push({ x: this.startX, y: this.startY })
            this.drawing({x1:this.startX, y1:this.startY, event: data.event, target: data.target, action: data.action});
        }
    }

    otherCanvasMove(data){
        let This = this

        /** 处理绘制内容 **/
        if(This.isMouseDown || This.isShowComment){
            let getPosition = This.changeCanvasPosition(data.currentX, data.currentY)
            This.currentX = getPosition.nextX
            This.currentY = getPosition.nextY
            This.drawing({x1: This.startX, y1: This.startY, x2: This.currentX, y2: This.currentY, event:data.event, target: data.target, action: data.action})
        }
    }

    otherCanvasUp(content){

        /**处理canvas位置***/
        let canvas = content.target
        canvas.points = []

        /***处理鼠标显示位置***/
        let otherShowPosition = document.getElementsByClassName('otherShowPosition')
        if(otherShowPosition.length){
            for(let index of otherShowPosition){
                let nameId = index.getAttribute('nameId')
                if(nameId === content?.account?.id){
                    index.style.display = "none";
                    break
                }
            }
        }
    }

    loadImage(ctx){
        let self = this;
        let img = new Image();
        img.src = self.lastImage;
        ctx.drawImage(img, 0, 0, self.width, self.height);
    }

    setDefaultTextBox(){
        this.textBox.cols = 1
        this.textBox.rows = 1
        this.textBox.value =''
        this.textBox.style.display = "none"
    }


    drawing (data) {
        let points = !data.target ? this.points : data.target.points
        let getCanvas = !data.target ? this.canvas : data.target
        let type
        let brushColor
        if(getCanvas === this.canvas){
            type = this.canvasToolsBar.getCurrentSelectedTool()
            brushColor = this.canvasToolsBar.getBrushColor()
        }else {
            type = data.action
            brushColor = getCanvas.brushColor
        }
        let param ={
            x1: data.x1,
            y1: data.y1,
            x2: data.x2,
            y2: data.y2,
            color: brushColor,
            canvas: getCanvas,
            points: points,
            action: type
        }
        this.startDraw(param)
    }


    /***根据类别进行绘制***/
    startDraw( content){
        let x1 = content.x1
        let y1 = content.y1
        let x2 = content.x2
        let y2 = content.y2

        let self = this
        let points = content?.canvas.points || content.points
        let ctx = content?.canvas.getContext('2d')
        if(!ctx) return

        ctx.strokeStyle = content.color                                    // 画笔的颜色
        ctx.fillStyle = self.canvasToolsBar.textColor                      // 填充颜色为红色
        ctx.lineWidth = self.canvasToolsBar.brushStrokeSize                // 指定描边线的宽度
        ctx.save()
        ctx.beginPath()

        switch(content.action){
            case 'rectFlag':
                self.initCanvas(ctx)
                if (e.shiftKey === true) {   // 正方形
                    let d = ((x2 - x1) < (y2 -y1)) ? (x2 - x1) : (y2 - y1);
                    ctx.fillRect(x1, y1, d, d);
                } else {                    // 普通方形
                    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                }
                break;
            case 'strokeRectFlag':
                self.initCanvas(ctx);
                if (e.shiftKey === true) {    // 正方形
                    let d = ((x2 - x1) < (y2 -y1)) ? (x2 - x1) : (y2 - y1);
                    ctx.strokeRect(x1, y1, d, d);
                } else {                      // 普通方形
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                }
                break;
            case 'circleFlag':
            case 'strokeCircelFlag':
                // 圆
                self.initCanvas(ctx);
                let k = ((x2 - x1) / 0.55);
                let w = (x2 - x1) / 2;
                let h = (y2 - y1) / 2;

                if (e.shiftKey === true) {     // circle
                    let r = Math.sqrt(w * w + h * h);
                    ctx.arc(w + x1, h + y1, r, 0, Math.PI * 2);
                } else {                        // ellipse
                    // bezier double ellipse algorithm
                    ctx.moveTo(x1, y1 + h);
                    ctx.bezierCurveTo(x1, y1 + h * 3, x1 + w * 11 / 5, y1 + h * 3, x1 + w * 11 / 5, y1 + h);
                    ctx.bezierCurveTo(x1 + w * 11 / 5, y1 - h, x1, y1 - h, x1, y1 + h);
                }

                if(content.type === 'circleFlag'){
                    ctx.fill();         // 实心
                }else if(content.type === 'strokeCircelFlag'){
                    ctx.stroke();       // 空心
                }
                break;
            case 'lineFlag':
                // 线条
                self.initCanvas(ctx);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                break;
            case  'arrowFlag':
                // 箭头
                self.initCanvas(ctx);
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
                break;
            case 'textFlag':
                // 写字
                ctx.font =  '16' * 1.5 +'px' +  " 'Open Sans', 'SimHei', sans-serif"
                ctx.font =  this.canvasToolsBar.textFontSize * 1.5 +'px' +  " 'Open Sans', 'SimHei', sans-serif"
                ctx.textBaseline = 'hanging';     // "alphabetic" | "bottom" | "hanging" | "ideographic" | "middle" | "top";
                ctx.textAlign = 'left';           // "center" | "end" | "left" | "right" | "start"; 值不同，绘制的时候 fillText 的坐标也要修改

                let allChars = self.textContent && self.textContent.split('')
                let lineText = '';    // 每行的内容
                let getRatio = self.getCanvasRatio()
                let px = parseInt(self.textBox.style.left) / getRatio.xRatio
                let py = parseInt(self.textBox.style.top) /getRatio.yRatio;

                let lineHeight = 20 / getRatio.yRatio;   // 每行的高度
                for (let i = 0; i < allChars.length; i++) {
                    // measureText 可计算绘制内容的宽度
                    let metric = ctx.measureText(lineText + allChars[i]);
                    if (metric.width < 261/ getRatio.xRatio) {
                        lineText = lineText + allChars[i];
                        if (i === allChars.length - 1) {
                            ctx.fillText(lineText, px, py);
                        }else if(allChars[i] === '\n'){
                            ctx.fillText(lineText, px, py);
                            lineText = '';
                            py = py + lineHeight;
                        }
                    } else {
                        ctx.fillText(lineText, px, py);
                        lineText = allChars[i];
                        py =  py + lineHeight;
                    }
                }
                break;
            case 'eraserFlag':
                // 橡皮擦
                let ratio = self.getCanvasRatio()
                let size = Number(self.canvasToolsBar.eraserSize)  / ratio.xRatio
                size = size * 10 / 2

                ctx.arc(x1, y1, size, 0, 2 * Math.PI);
                ctx.clip();
                ctx.clearRect(0, 0, self.width, self.height);

                self.startX = self.currentX;
                self.startY = self.currentY;
                break;
            case 'clearFlag':
                // 清空
                self.initCanvas()
                self.lastImage = null
                self.canvasToolsBar.changeToolBarStyle({ flag:'mouseFlag', type: 'defaultMouse' })

                // 清除并隐藏输入框
                self.setDefaultTextBox()
                break;
            default:
                // 任意画
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
                self.points.slice(0, 1);
                break;
        }
        ctx.restore();
        ctx.closePath();
    }

    /** 转换canvas的像素坐标
     * @param x：鼠标当前移动相对于canvas的x 偏移量
     * @param y：鼠标当前移动相对于canvas的y 偏移量
     * */
    changeCanvasPosition(x, y){
        let getRatio = this.getCanvasRatio()
        let nextX = x / getRatio.xRatio
        let nextY = y / getRatio.yRatio

        return {nextX, nextY}
    }

    /** 获取canvas画布大小和像素大小getCanvasRatio比例
     * @param canvas.width, canvas.height: canvas画布像素的大小
     * @param canvasStyleWidth, canvasStyleHeight: 肉眼可见的canvas大小
     * @return  xRatio = canvasStyleWidth / cavasHtmlWidth;
     * @return  yRatio  = canvasStyleHeight / canvasHtmlHeight
     ***/
    getCanvasRatio(){
        let canvasHtmlWidth = Number(this.canvas.width)
        let canvasHtmlHeight = Number(this.canvas.height)
        let { width: canvasStyleWidth, height: canvasStyleHeight} = this.canvas.getBoundingClientRect()
        let xRatio = canvasStyleWidth / canvasHtmlWidth
        let yRatio  = canvasStyleHeight / canvasHtmlHeight

        return {xRatio, yRatio}
    }

    getPostionRatio (isLocal){
        let { width: localWidth, height: localHeight} = this.canvas.getBoundingClientRect()
        let remoteWidth = this.remoteCanvas.width
        let remoteHeight = this.remoteCanvas.height
        let xRatio, yRatio;
        if(isLocal){
            xRatio = 1
            yRatio = 1
        }else{
            if(localWidth !== remoteWidth){
                xRatio = remoteWidth / localWidth
                yRatio = remoteHeight / localHeight
            }else{
                xRatio = 1
                yRatio = 1
            }
        }

        return { xRatio, yRatio }
    }

    /** 清空内容
     * **/
    clearCanvas(){
        this.initCanvas(this.ctx)
        this.lastImage = null

        // 清除并隐藏输入框
        this.setDefaultTextBox()
    }

    /**
     * textarea 内容及样式处理
     ***/
    makeExpandingArea(isAddCols = false){
        this.textBox.style.height = 'auto';
        this.textBox.style.height = this.textBox.scrollHeight + 'px';

        if(!isAddCols && textBox.cols < 30){
            textBox.cols  = textBox.cols + 1
        }
    }

    /**
     * 框选区域
     ***/
    handleSelectionArea(){
        this.isCompleteSelectArea = false
        this.selectAreaElement.style.cursor = 'url(./img/mouse_area.png) 0 0, default'
        let reCalculate = ()=>{
            let realX3 = Math.min(this.mouseX1, this.mouseX2)
            let realX4 = Math.max(this.mouseX1, this.mouseX2)
            let realY3 = Math.min(this.mouseY1, this.mouseY2)
            let realY4 = Math.max(this.mouseY1, this.mouseY2)
            this.selectAreaElement.style.left = realX3 + 'px'
            this.selectAreaElement.style.top =  realY3 + 'px'
            this.selectAreaElement.style.width = realX4 - realX3 + 'px';
            this.selectAreaElement.style.height = realY4 - realY3 + 'px';
        }

        onmousedown = (event)=>{
            event.preventDefault()
            if(this.canvasToolsBar.areaDeleteFlag){
                let {left, top} = this.canvas.parentNode?.getBoundingClientRect()
                let {left: containerLeft, top: containerTop} = this.canvas.getBoundingClientRect()
                this.mouseX1 = event.clientX - left - (containerLeft- left)
                this.mouseY1 = event.clientY - top - (containerTop - top)

                this.selectAreaElement.hidden = 0;
                this.isCompleteSelectArea = true
                reCalculate()

                this.canvas.onmousemove = onmousemove
            }
        }

        onmousemove = (event)=> {
            event.preventDefault()
            if(this.canvasToolsBar.areaDeleteFlag){
                let {left, top} = this.canvas.parentNode?.getBoundingClientRect()
                let {left: containerLeft, top: containerTop} = this.canvas.getBoundingClientRect()
                this.mouseX2 = event.clientX - left - (containerLeft- left)
                this.mouseY2 = event.clientY - top  - (containerTop - top)

                if(this.isCompleteSelectArea){
                    reCalculate();
                }
            }
        }

        onmouseup = (event)=> {
            if (this.canvasToolsBar.areaDeleteFlag) {
                this.isCompleteSelectArea = false
            }
        }
    }

    /**
     * 清除框选区域
     * **/
    clearSelectArea(){
        // if(this.selectAreaElement.hidden) return
        let x3 = Math.min(this.mouseX1, this.mouseX2)
        let y3 = Math.min(this.mouseY1, this.mouseY2)
        let { nextX: canvasPreX, nextY: canvasPreY } = this.changeCanvasPosition(x3, y3)
        let { width, height} = this.selectAreaElement.getBoundingClientRect()
        let { nextX: selectAreaWidth, nextY: selectAreaHeight } = this.changeCanvasPosition(width, height)
        if(!this.ctx) return

        this.ctx.clearRect(canvasPreX, canvasPreY, selectAreaWidth, selectAreaHeight)
        this.selectAreaElement.hidden = 1

        /*** 保存当前的画面 **/
        this.canvas.lastImage = this.canvas.toDataURL('image/png')
    }

    /**获取当前线路Id**/
    getCurrentLine(){
        if(!currentLocalLine || !currentRemoteLine ) return
        let lineContent = {
            local: null,
            remote: null
        }
        if( currentLocalLine && currentRemoteLine){
            lineContent.local = currentLocalLine
            lineContent.remote = currentRemoteLine
        }
        return lineContent
    }

}


/********************* 拖动模型*************************/
class DragMoveModel {
    startX = 0 // 按下的鼠标x值
    startY = 0 // 按下的鼠标y值
    moveInsX = 0 // 移动的x的值（从0开始累加）
    moveInsY = 0 // 移动的y的值（从0开始累加）
    isMousedown = false // 是否按下鼠标
    clickEl = null
    targetEl = null // 目标元素
    targetElTx = 0 // 目标元素的translate的x的值
    targetElTy = 0 // 目标元素的translate的y的值
    initTargetElTop = 0 // 目标元素的初始top值
    initTargetElLeft = 0 // 目标元素的初始left值
    limitMoveBorder = false // 限制移动边界
    moveMode = 'transform' // transform为transform-translate方式移动，position为top,left方式移动
    callback = null // 回调函数，用于获取鼠标移动距离
    h5 = false // 是否用于h5
    rootDom = document // 根文档

    constructor(config = {}, callback = () => {}) {
        this._initConfig(config)
        this._initEvent()
        this._initTragetElInfo()
        this.callback = callback
    }

    // 初始化配置
    _initConfig(config) {
        this.clickEl = config.clickEl
        this.targetEl = config.targetEl || document.body
        this.limitMoveBorder = !!config.limitMoveBorder
        this.moveMode = config.moveMode || 'transform'
        this.h5 = !!config.h5
        this.rootDom = config.rootDom || this.rootDom
    }

    // 初始化目标元素相关信息
    _initTragetElInfo() {
        if (this.clickEl) {
            const { top, left } = this.clickEl.getBoundingClientRect()
            this.initTargetElTop = top
            this.initTargetElLeft = left
            this.clickEl.style['will-change'] = this.moveMode === 'transform' ? 'transform' : 'left, top'
        }
    }

    // 获取style的transform的属性值translate
    _getStyleTransformProp(transform = '', prop = 'scale') {
        transform = transform.replaceAll(', ', ',').trim()
        let strArr = transform.split(' ')
        let res = ''
        strArr.forEach(str => {
            if (str.includes(prop)) {
                res = str
            }
        })
        return res
    }

    // 计算元素的translate的值
    _calcTargetTranlate = () => {
        if (this.targetEl) {
            let translate = this._getStyleTransformProp(this.targetEl.style.transform, 'translate3d')
            if (translate.includes('translate3d')) {
                let reg = /\((.*)\)/g
                let res = reg.exec(translate)
                if (res) {
                    translate = res[1].replaceAll(', ', ',')
                }
                let translateArr = translate.replace('(', '').replace(')', '').split(',')
                this.targetElTx = +translateArr[0].replace('px', '') || 0
                this.targetElTy = +translateArr[1].replace('px', '') || 0
            }
        }
    }

    // 设置transform属性
    _setTransformProp(transform = '', prop = '', value = '') {
        let reg = new RegExp(`${prop}\((.*)\)`, 'g')
        if(transform.includes(prop)) {
            let propList = transform.replaceAll(', ', ',').trim().split(' ')
            let newPropList = propList.map(item => item.replaceAll(reg, `${prop}(${value})`))
            transform = newPropList.join(' ')
        } else {
            transform = `${prop}(${value}) ` + transform
        }
        return transform
    }

    // translate移动元素
    _translateMoveEl() {
        if (this.targetEl) {
            let tx = this.targetElTx + this.moveInsX
            let ty = this.targetElTy + this.moveInsY

            // 工具函数：限制移动边界
            const limitBorder = () => {
                const { width, height } = this.targetEl.getBoundingClientRect()
                if (tx + width + this.initTargetElLeft > window.innerWidth) { // 限制右边界
                    tx = window.innerWidth - width - this.initTargetElLeft // 窗口宽度-元素宽度-元素初始时的左偏移距离
                }
                if (tx < -this.initTargetElLeft) { // 限制左边界
                    tx = -this.initTargetElLeft
                }
                if (ty + height + this.initTargetElTop > window.innerHeight) { // 限制下边界
                    ty = window.innerHeight - height - this.initTargetElTop
                }
                if (ty < -this.initTargetElTop) { // 限制上边界
                    ty = -this.initTargetElTop
                }
            }

            if (this.limitMoveBorder) {
                limitBorder()
            }

            let transform = this.targetEl.style.transform
            transform = transform ? this._setTransformProp(transform, 'translate3d', `${tx}px, ${ty}px, 0px`) : `translate3d(${tx}px, ${ty}px, 0px)`
            this.targetEl.style.transform = transform
        }
    }

    // 使用top，left的方式移动元素
    _topLeftMoveTargetEl = () => {
        let left = this.moveInsX + this.initTargetElLeft
        let top = this.moveInsY + this.initTargetElTop

        // 工具函数：限制移动边界
        const limitBorder = () => {
            const { width, height } = this.targetEl.getBoundingClientRect()

            if (top < 0) {
                top = 0
            }
            if (top > (window.innerHeight - height)) {
                top = window.innerHeight - height
            }
            if (left < 0) {
                left = 0
            }
            if (left > (window.innerWidth - width)) {
                left = window.innerWidth - width
            }
        }
        if (this.limitMoveBorder) {
            limitBorder()
        }
        this.targetEl.style.left = left + 'px'
        this.targetEl.style.top = top + 'px'
    }

    // 鼠标移动事件
    _mousemoveHandler = (e) => {
        const pageX = this.h5 ? e.changedTouches[0].pageX : e.pageX
        const pageY = this.h5 ? e.changedTouches[0].pageY : e.pageY
        if (this.isMousedown) {
            // 往左
            if (pageX < this.startX) {
                this.moveInsX = pageX - this.startX
            }
            // 往右
            if (pageX > this.startX) {
                this.moveInsX = pageX - this.startX
            }
            // 往上
            if (pageY < this.startY) {
                this.moveInsY = pageY - this.startY
            }
            // 往下
            if (pageY > this.startY) {
                this.moveInsY = pageY - this.startY
            }
            // console.log('moveInsX', this.moveInsX, 'moveInsY', this.moveInsY)
            if(this.moveMode === 'position') {
                this._topLeftMoveTargetEl()
            }else {
                this._translateMoveEl()
            }
            // 计算第三边的长度（勾股定理 a^2 + b^2 = c^2）
            let c = Math.round(Math.pow((this.moveInsX * this.moveInsX + this.moveInsY * this.moveInsY), 0.5))
            this.callback(this.moveInsX, this.moveInsY, c)
        }
    }

    // 鼠标按下事件
    _mousedownHandler = (e) => {
        if(!(can.fullScreenModel && can.fullScreenModel.isCurrentFullScreen)) return
        const pageX = this.h5 ? e.changedTouches[0].pageX : e.pageX
        const pageY = this.h5 ? e.changedTouches[0].pageY : e.pageY
        this.startX = pageX // 记录鼠标起始位置x
        this.startY = pageY // 记录鼠标起始位置y
        this.moveInsX = 0 // 将x轴移动距离清零
        this.moveInsY = 0 // 将y轴移动距离清零
        this.isMousedown = true // 标记鼠标按下状态

        // 计算目标元素的translate的值
        this._calcTargetTranlate()

        if (this.moveMode === 'position') {
            this._initTragetElInfo()
        }
    }

    // 鼠标松开事件
    _mouseupHandler = (e) => {
        this.isMousedown = false // 标记鼠标松开状态
        this.startX = 0 // 将x轴鼠标起始位置清零
        this.startY = 0 // 将y轴鼠标起始位置清零
    }

    // 初始化监听事件
    _initEvent() {
        const moveEvent = this.h5 ? 'touchmove' : 'mousemove'
        const downEvent = this.h5 ?  'touchstart' : 'mousedown'
        const upEvent = this.h5 ? 'touchend' : 'mouseup'
        this.rootDom.addEventListener(moveEvent, this._mousemoveHandler)
        this.clickEl && this.clickEl.addEventListener(downEvent, this._mousedownHandler)
        this.rootDom.addEventListener(upEvent, this._mouseupHandler)

    }

    // 销毁方法
    destroy() {
        const moveEvent = this.h5 ? 'touchmove' : 'mousemove'
        const downEvent = this.h5 ?  'touchstart' : 'mousedown'
        const upEvent = this.h5 ? 'touchend' : 'mouseup'
        this.clickEl && this.clickEl.removeEventListener(moveEvent, this._mousedownHandler)
        this.rootDom.removeEventListener(downEvent, this._mousemoveHandler)
        this.rootDom.removeEventListener(upEvent, this._mouseupHandler)
    }
}

// const moveModel = new DragMoveModel({ targetEl: targetEl, limitMoveBorder: true })
// const moveModel2 = new DragMoveModel({ targetEl: targetEl2, moveMode: 'position', limitMoveBorder: true  })


/******************** 全屏模式模型******************************/

class toggleFullScreenModal{
    isCurrentFullScreen = false
    constructor(config){
        this.initConfig(config)
        this.initEvent()
    }

    // 初始化配置
    initConfig(config) {
        this.targetEl = config.targetEl              // 全屏元素
        this.clickElement = config.clickElement      // 点击元素
        this.video = config.videoElement             // video 元素
        this.canvasToolBar = config.canvasToolBar     // 整行工具栏
        this.toolBarContent = config.toolBarContent   // 工具栏wrapper
        this.toolbar = config.toolbar                 // 工具栏
        this.isLoadingSuccess = config.isLoading
    }

    // 初始化监听事件
    initEvent(){
        /** 全屏监听事件**/
        if(this.video){
            this.video.addEventListener('fullscreenchange', ()=>{
                let isFullScreen = false
                if (document.fullscreenElement) {
                    isFullScreen = true
                    console.log('Enter Full screen mode');
                } else {
                    isFullScreen = false
                    console.log('Exit Full Screen Mode');
                }
                this.toggleToolBarPosition(isFullScreen)
            })
        }

        document.addEventListener("fullscreenchange", ()=> {
            if (document.fullscreenElement) {
                this.isCurrentFullScreen = true
                console.log('Enter Full screen mode');
            } else {
                this.isCurrentFullScreen = false
                console.log('Exit Full Screen Mode');
            }
            this.toggleToolBarPosition(this.isCurrentFullScreen)
        });



        /** 画中画监听事件**/
        if(this.video){
            this.video.addEventListener('enterpictureinpicture',function(){
                console.log("Picture-in-Picture mode activated!");
            },false)
            this.video.addEventListener("leavepictureinpicture",  function(){
                console.log("Picture-in-Picture mode deactivated!");
            }, false);
        }

        /**按钮点击事件**/
        if(this.clickElement){
            console.log("this.clickElement:",this.clickElement)
            this.clickElement.addEventListener('click',(e)=>{
                let target = e.target
                if (target && target.classList.contains('fullScreen')) {
                    this.currentOperation = 'fullScreen'
                    this.toggleFullScreen(this.isLoadingSuccess,e)
                } else if (target && target.classList.contains('pictureInPicture')) {
                    this.currentOperation = 'pictureInPicture'
                    this.togglePictureInPicture(this.isLoadingSuccess)
                }
            })
        }
    }

    /** 判断当前文档是否能切换到全屏，即当前浏览器是否支持全屏模式
     **/
    isFullscreenEnabled(){
        return  ( document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled);
    }

    /** 判断当前是否有全屏模式的element
     * */
    fullScreenElement() {
        return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement
    }

    /** 判断当前是否全屏
     * */
    isFullScreen() {
        return  !! (document.fullscreen ||document.mozFullScreen || document.webkitIsFullScreen || document.webkitFullScreen || document.msFullScreen );
    }

    /** 设置videoContainer 全屏状态
     * @param state: true 全屏  false：退出全屏
     * */
    setFullscreenData(state) {
        this.targetEl.setAttribute('data-fullscreen', !!state);
    }


    /** 切换全屏模式
     **/
    toggleFullScreen(isStopScreen = null,e){
        if(!this.isLoadingSuccess){
            console.log("current no exist shareScreen stream,fullScreen not supported")
            return
        }
        let isFullScreenEnabled = this.isFullscreenEnabled()
        if( !isFullScreenEnabled){
            console.log("current browser do not support fullScreen")
            return
        }

        let isFullscreen = this.isFullScreen()
        let fullScreenElement = this.fullScreenElement()
        if (!isFullscreen && !fullScreenElement /*&& !isStopScreen*/) {
            if (this.video.requestFullscreen) {
                this.targetEl.requestFullscreen()
                this.video.requestFullscreen()
            } else if (this.video.webkitRequestFullScreen) {
                this.targetEl.webkitRequestFullScreen()
                this.video.webkitRequestFullScreen()
            } else if (this.video.mozRequestFullScreen) {
                this.targetEl.mozRequestFullScreen()
                this.video.mozRequestFullScreen()
            }  else if (this.video.msRequestFullscreen) {
                this.targetEl.msRequestFullscreen()
                this.video.msRequestFullscreen()
            }

            this.setFullscreenData(true);
            this.isCurrentFullScreen = true
        } else {
            if(fullScreenElement){
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                this.setFullscreenData(false);
                this.isCurrentFullScreen = false
            }
        }
        this.toggleToolBarPosition(this.isCurrentFullScreen,e)
    }

    /**
     * 切换画中画模式
     **/
    togglePictureInPicture(isStopScreen = null) {
        if(!this.isLoadingSuccess){
            console.log("current no exist shareScreen stream, pictureInPicture not supported")
            return
        }

        if(!document.pictureInPictureEnabled){
            console.log("current browser do not support pictureInPicture")
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

    /** 在全屏或者画中画更换工具栏位置
     * @param state: 表示当前状态， true or false
     * ***/
    toggleToolBarPosition(state,e){
        if(!state){                                 // 退出全屏或者画中画
            /**整体canvasBar的位置**/
            if(!this.canvasToolBar.classList.contains('canvasToolBar_top_40')){
                this.canvasToolBar.classList.add('canvasToolBar_top_40')
            }
            if(this.canvasToolBar.classList.contains("canvasToolBar_top_0")){
                this.canvasToolBar.classList.remove("canvasToolBar_top_0")
            }

            /**canvas toolBar 取消border且恢复原来位置**/
            if(this.toolBarContent.classList.contains('toolbar_border_change')){
                this.toolBarContent.classList.toggle('toolbar_border_change')

                /*** 针对工具栏移动后 恢复固定位置 ****/
                this.toolBarContent.style.transform = 'translate3d(0px, 0px, 0px)'
            }

            /** 处理框选区域隐藏***/
            can.selectAreaElement.hidden = 1

            /**处理canvas的大小问题**/
            let width = window.getComputedStyle(presentVideo).width
            let height = window.getComputedStyle(presentVideo).height
            can.canvas.style.width = width + 'px'
            can.canvas.style.height = height + 'px'

        }else{                                       // 当前在全屏 或者画中画
            if(this.canvasToolBar.classList.contains("canvasToolBar_top_40")){
                this.canvasToolBar.classList.remove("canvasToolBar_top_40")
            }

            if(!this.canvasToolBar.classList.contains("canvasToolBar_top_0")){
                this.canvasToolBar.classList.add("canvasToolBar_top_0")
            }

            /**在全屏的情况下,设置边框**/
            if(!this.toolBarContent.classList.contains('toolbar_border_change')){
                this.toolBarContent.classList.toggle('toolbar_border_change')
            }

            /** 处理canvas的大小问题**/
            can.canvas.style.width = window.screen.width  + 'px'
            can.canvas.style.height = window.screen.height   + 'px'
        }
        this.toggleClickElementStyle(state, e)
        this.toggleToolBarSize(state)
    }

    /**
     * 处理拖拽工具栏按钮 和 整个工具栏大小
     **/
    toggleToolBarSize(state){
        let toolbar = this.toolbar
        if(!state){

            /**处理拖拽工具栏按钮 和 整个工具栏大小**/
            if(toolbar && toolbar.firstElementChild && !toolbar.firstElementChild.classList.contains("toolbar_button_hidden")){
                toolbar.firstElementChild.classList.add("toolbar_button_hidden")
            }
            if(toolbarContent && toolbarContent.classList.contains("toolbarContent_width")){
                toolbarContent.classList.remove("toolbarContent_width")
            }

        }else{
            if(toolbar && toolbar.firstElementChild && toolbar.firstElementChild.classList.contains("toolbar_button_hidden")){
                toolbar.firstElementChild.classList.remove("toolbar_button_hidden")
            }

            if(!(toolbarContent && toolbarContent.classList.contains("toolbarContent_width"))){
                toolbarContent.classList.add("toolbarContent_width")
            }

            if(toolbar && toolbar.firstElementChild && !toolbar.firstElementChild.firstElementChild.classList.contains("toolbar_button_first")){
                toolbar.firstElementChild.firstElementChild.classList.add("toolbar_button_first")
            }
        }
    }

    /**
     * 处理点击按钮的样式
     * **/
    toggleClickElementStyle(state,e){
        let target = e && e.target || document.getElementsByClassName('hoverButton')[0]
        let children = target.children
        let hoverButton

        if(!children.length){
            hoverButton = target.parentElement.parentElement.children
        }else{
            hoverButton = target.parentElement.children
        }

        for(let i = 0; i < hoverButton.length; i++){
            let btn = hoverButton[i]
            let childNodes = btn.childNodes[0]
            if(!state){
                /**设置按钮的背景色**/
                if(btn.classList.contains('hoverButton_white')){
                    btn.classList.remove("hoverButton_white")
                }

                /**改变样式**/
                if(childNodes && childNodes.classList.contains("fullScreen") ){
                    if(childNodes.classList.contains("GRP-icon-fullScreen-ash")){
                        childNodes.classList.remove("GRP-icon-fullScreen-ash")
                        childNodes.classList.add("GRP-icon-fullScreen-white")
                    }
                }

                if(childNodes && childNodes.classList.contains("pictureInPicture")){
                    if(childNodes.classList.contains("GRP-icon-pictureInPicture-ash")){
                        childNodes.classList.remove("GRP-icon-pictureInPicture-ash")
                        childNodes.classList.add("GRP-icon-pictureInPicture-white")
                    }
                }

            }else{
                /**设置按钮的背景色**/
                if(!btn.classList.contains('hoverButton_white')){
                    btn.classList.add("hoverButton_white")
                }

                /**改变样式**/
                if(childNodes && childNodes.classList.contains("fullScreen") ){
                    if(childNodes.classList.contains("GRP-icon-fullScreen-white")){
                        childNodes.classList.remove("GRP-icon-fullScreen-white")
                        childNodes.classList.add("GRP-icon-fullScreen-ash")
                    }
                }
                if(childNodes && childNodes.classList.contains("pictureInPicture")){
                    if(childNodes.classList.contains("GRP-icon-pictureInPicture-white")){
                        childNodes.classList.remove("GRP-icon-pictureInPicture-white")
                        childNodes.classList.add("GRP-icon-pictureInPicture-ash")
                    }
                }
            }
        }
    }
}


