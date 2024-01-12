/**********************canvas 绘制 ***********************/
class CanvasExample {
    isMouseDown = false            // 鼠标是否可以点击
    pausePainting = false          // 暂停绘制
    points = []                      // 点击获取的坐标
    notes = []                       // 便签
    texts = []                       // 文本
    startX = null                     // 开始点击的横坐标
    startY = null                     // 开始点击的纵坐标
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

    canvasStyle = {
        width: null,
        height: null,
    }

    canvasStyleRatio = {
        x: 1,
        y: 1
    }

    /**编写文字输入框**/
    textBox = document.getElementsByClassName("textBox")[0]
    textContent = ''          //  textArea输入的内容
    textAreaRect = null         //  textArea 的位置信息
    showInputFlag = false

    /**右侧工具栏**/
    rightTools = document.getElementsByClassName("rightTools")[0]
    scaleContent = document.getElementsByClassName("scaleContent")[0]
    toolsWrapper = document.getElementsByClassName("toolsWrapper")[0]
    displayContent = document.getElementsByClassName("displayContent")[0]

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

    /**canvas 最外面元素 **/
    videoDisplayArea = document.getElementsByClassName("videoDisplayArea")[0]

    /**canvas 和 video的父元素**/
    area = document.getElementsByClassName("areaContent")[0]
    canvasArray = []

    /**保存canvas所有步骤**/
    canvasHistory = []
    currentCanvasValue = 0;

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
        this.ctx = config.canvas.getContext('2d',{ willReadFrequently: true})
        this.videoElement = config.videoElement
        this.videoContainer = config.toolParam?.targetEl
        this.videoWrapper = config.videoWrapper
        this.canvasToolsBar = new CanvasToolsBar()
        this.fullScreenModel = new toggleFullScreenModal(config.toolParam)
        this.dragMoveModal = new DragMoveModel(config.dragParam)

        this.width =  config.canvas.width = 1600
        this.height =  config.canvas.height = 1600
        this.videoContainer.setAttribute('data-fullscreen', true)
    }

    initCanvas(){
        this.ctx.clearRect(0, 0, this.canvasStyle.width, this.canvasStyle.height)
        this.resetDraw({canvas: this.canvas, isLocal: true})
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
        this.textBox.addEventListener('input',this.setTextAreaHandler)
        this.videoElement.addEventListener('loadedmetadata',this.videoHandler)

        /**监听事件处理右侧工具栏**/
        this.scaleContent.addEventListener('click', this.changeContentHandler)
    }

    videoHandler = () =>{
        this.setSize()
    }

    setSize(content){
        this.videoElement.parentNode.style.width = ""
        this.videoElement.parentNode.style.height = ""

        let containerWidth =  this.videoElement.parentNode.clientWidth ;
        let containerHeight = this.videoElement.parentNode.clientHeight ;

        let containerRatio = containerWidth / containerHeight;
        let videoRatio

        if(content && content.videoWidth && content.videoHeight){
            videoRatio = content.videoWidth / content.videoHeight
        } else{
            videoRatio = this.videoElement.videoWidth / this.videoElement.videoHeight;
        }

        if (videoRatio > containerRatio) {
            /***设置video大小***/
            this.videoElement.style.width = containerWidth + 'px';
            this.videoElement.style.height = containerWidth / videoRatio + 'px';

            /** 设置canvas大小 **/
            this.canvas.style.width  = containerWidth + 'px';
            this.canvas.style.height = containerWidth / videoRatio + 'px';

            /** 设置video parentNode 大小 **/
            this.videoElement.parentNode.style.width = containerWidth + 'px'
            this.videoElement.parentNode.style.height = containerWidth / videoRatio + 'px'
        } else {
            this.videoElement.style.width = containerHeight * videoRatio + 'px';
            this.videoElement.style.height = containerHeight + 'px';

            this.canvas.style.width  = containerHeight * videoRatio + 'px';
            this.canvas.style.height = containerHeight + 'px';

            /** 设置video parentNode 大小 **/
            this.videoElement.parentNode.style.width = containerHeight * videoRatio + 'px'
            this.videoElement.parentNode.style.height = containerHeight + 'px'
        }
        /**设置本地canvas缩放比例***/
        this.setCanvasScale(this.canvas)

        /***设置其他canvas的大小****/
        if(this.canvasArray.length){
            for(let canvas of this.canvasArray){
                canvas.style.width = this.canvas.clientWidth + 'px'
                canvas.style.height = this.canvas.clientHeight + 'px'

                /**处理其他canvas缩放比例**/
                this.setCanvasScale(canvas)
            }
        }

        // /**获取canvas变化 前后比例**/
        this.handleCanvasStyleRatio()

        /**告知对端: 本端canvas大小**/
        let canvasPos = this.canvas.getBoundingClientRect()
        let param = {
            type: 'remotePosition',
            width:canvasPos.width,
            height:canvasPos.height
        }
        handleContentForRemote(param)

        /**保存全屏后canvas的大小**/
        this.canvasStyle.width = canvasPos.width
        this.canvasStyle.height = canvasPos.height
    }

    /**
     * 获取 canvas 画板的比例(针对全屏或者退出全屏前后的大小比例)
     * **/
    handleCanvasStyleRatio(){
        let rect = this.canvas.getBoundingClientRect()
        if(rect.width !== this.canvasStyle.width){
            if(this.fullScreenModel.isCurrentFullScreen){
                this.canvasStyleRatio.x = rect.width / this.canvasStyle.width
                this.canvasStyleRatio.y  = rect.height / this.canvasStyle.height
            }else{
                this.canvasStyleRatio.x = 1
                this.canvasStyleRatio.y  = 1
            }
        }
    }

    /**
     * 设置canvas缩放比例
     * **/
    setCanvasScale(canvas){
        if(!canvas) return

        let ctx = canvas.getContext('2d',{ willReadFrequently: true})
        let {width, height} = canvas.getBoundingClientRect()

        // 计算画布的缩放比例
        const scaleX = canvas.width / width;
        const scaleY = canvas.height / height;

        // 清除之前的缩放比例
        ctx.resetTransform();

        // 设置画布缩放比例
        ctx.scale(scaleX, scaleY);
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
        canvas.canvasHistory = []
        canvas.currentCanvasValue = 0
        canvas.setAttribute('name',config.account?.name)
        canvas.setAttribute('nameId',config.account?.id)
        canvas.name = config.account?.name
        canvas.nameId = config.account?.id
        canvas.brushColor = config.brushColor
        canvas.brushSize = config.brushSize
        canvas.brushStyle = config.brushStyle
        canvas.style.width = this.area.clientWidth + 'px'
        canvas.style.height = this.area.clientHeight + 'px'
        canvas.classList.add('otherCanvas')
        this.canvasArray.push(canvas)
        this.area.append(canvas)
        this.setCanvasScale(canvas)
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
        this.displayContent.appendChild(fragment)
    }

    /**
     *更新右侧工具内容
     *@param type add(添加)、del(删除)
     *@param data.account
     *@param data.account.id
     *@param data.account.name
     *@param
     * **/
    updateAttendeesLists(type, data){
        if(!type || !data || !data.account || !data.account.id){
            console.log("updateAttendeesLists: invalid parameter")
            return
        }
        let This = this

        switch(type){
            case 'add':
                This.createTools(data)
                break
            case 'change':
                This.changeToolColor(data)
                break
            case 'del':
                let rightToolArray = Array.from(document.getElementsByClassName("rightToolContent"))
                for(let item of rightToolArray){
                    if(Number(item.getAttribute("nameId")) === Number(data.account.id)){
                        this.displayContent.removeChild(item)
                    }
                }
                break
            default:
                console.log("updateAttendeesLists: current type is ",type)
                break
        }
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

    /**
     * 创建形状内容，如橡皮擦样式或者激光笔
     * @param config.account
     * @param config.action
     * @param config.x
     * @param config.y
     **/
    createShapes(config ={}){
        if(!config?.account?.id || !config?.account?.name || !config?.action) return

        let element = document.createElement('div')
        element.className = `mouseStyle otherMouseStyle`
        element.setAttribute('name', config.account.name)
        element.setAttribute('nameId', config.account.id)

        this.setShapes(config, element)
        this.area.appendChild(element)
    }

    /**
     * 设置形状样式
     * @param element
     * @param config.eraserSize
     * @param config.pointerColor
     * @param config.action
     * @param config.x
     * @param config.y
     * **/
    setShapes(config={}, element = null){
        if(!config?.action || !element ) return

        if(config.action === 'eraserFlag'){
            let mouseRadius = parseInt(config.eraserSize)
            element.style.width = mouseRadius * 10 * this.canvasStyleRatio.x + 'px'
            element.style.height = mouseRadius * 10 * this.canvasStyleRatio.y + 'px'
            element.style.left = config.x - 5 * mouseRadius * this.canvasStyleRatio.x + 'px'
            element.style.top = config.y - 5 * mouseRadius * this.canvasStyleRatio.y + 'px'
            element.style.boxShadow = `0 0 8px 0 #00000033`
            element.style.display = "block";
        }else if(config.action === 'pointerFlag'){
            element.style.width = 6 + 'px'
            element.style.height = 6 + 'px'
            element.style.left = config.x + 'px'
            element.style.top = config.y + 'px'
            element.style.boxShadow = `0 0 6px 3px ${config.pointerColor}`
            element.style.display = "block";
        }

    }

    /**
     * 更改形状样式
     * @param data.account
     * @param data.action
     * @param data.eraserSize
     * @param data.x
     * @param data.y
     **/
    changeShapesStyle(data={}){
        if(!data?.account?.id) return
        let otherMouseStyle = document.getElementsByClassName('otherMouseStyle')
        if(otherMouseStyle.length){
            for(let ele of otherMouseStyle){
                let name = ele.getAttribute("nameId")
                if(name === data.account.id){
                    this.setShapes(data,ele)
                    break
                }
            }
        }
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

                        /** 针对当前颜色为黑色 设置当前文字显示为白色   当前颜色为白色，设置当前文字为为黑色  其他默认白色***/
                        let noteChild = note.children
                        let userName = Array.from(noteChild).filter((item)=> item.classList.contains('user-name'))
                        if(data.brushColor === '#FFFFFF'){
                            for(let item of userName){
                                 item.style.color = '#0c090c'
                            }
                        }else{
                            for(let item of userName){
                                item.style.color = '#FFFFFF'
                            }
                        }
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


    /***更改canvas 层级 ***/
    changeCanvasZindex(data){
        let zIndex = window.getComputedStyle(data.canvas).zIndex
        if(data.isLocal){
            /** 针对本地隐藏，需要对全局鼠标样式禁止；否则解除**/
            if (zIndex === '999') {
                data.canvas.style.zIndex = 'auto'
                this.videoDisplayArea.style.cursor = 'not-allowed'
            } else {
                data.canvas.style.zIndex = '999'
                this.videoDisplayArea.style.cursor = 'default'
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
        this.canvasToolsBar.changeToolBarStyle({ flag:'brushFlag', type: 'brush',  from: 'settings'})
    }

    setShowComment = function(state){
        this.isShowComment = state
        this.canvasToolsBar.changeToolBarStyle({ flag:'brushFlag', type: 'brush',  from: 'settings'})
    }

    setTextAreaHandler = (event)=>{
        if(this.canvasToolsBar.textFlag){
            let getKeyCode = event && event.keyCode
            let isAddCols = getKeyCode === 13 ? true: false
            this.makeExpandingArea(isAddCols,event)
        }
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
        if( this.canvasToolsBar.pointerFlag || this.canvasToolsBar.areaDeleteFlag || event.button === 2 || this.pausePainting )  return

        setDefaultToolBarChild()
        let {left, top} = this.canvas.getBoundingClientRect()
        let startX = event.clientX - left
        let startY = event.clientY - top
        if(!this.canvasToolsBar.noteFlag && !this.canvasToolsBar.textFlag){
            this.updateCanvas({canvas: this.canvas, isLocal: true})
        }

        let getRatio = this.getPostionRatio(true)
        startX = startX / getRatio.xRatio
        startY = startY / getRatio.yRatio
        this.canvasDown({startX,startY, event})


        if(!this.canvasToolsBar.textFlag){
            window.addEventListener("mouseup", this.mouseupHandler)
        }

        /**发送当前内容给远端**/
        let param = {
            type: 'mouseDown',
            action: this.canvasToolsBar.getCurrentSelectedTool(),
            currentStyle: this.canvasToolsBar.getCurrentStyle(),
            x: startX.toString(),
            y: startY.toString(),
            rect: this.canvas.getBoundingClientRect(),
        }
        handleContentForRemote(param)
    }

    // 鼠标移动事件
    mousemoveHandler = (event)=>{
        if( event.button === 2 || this.pausePainting) return
        let {left, top} = this.canvas.getBoundingClientRect()
        let currentX = event.clientX - left
        let currentY = event.clientY - top

        /**鼠标样式**/
        changeMouseStyle(currentX, currentY)

        /**解决在远处多次点击绘制问题**/
        if(this.isMouseDown && (this.startX !== currentX || this.startY !== currentY)){
            this.isMouseMove = true
            let getRatio = this.getPostionRatio(true)
            currentX = currentX / getRatio.xRatio
            currentY = currentY / getRatio.yRatio
            let lineStyle = this.canvasToolsBar.getLineStyle()
            this.canvasMove({currentX,currentY,event,lineStyle})
        }

        let param = {
            type: 'mouseMove',
            action: this.canvasToolsBar.getCurrentSelectedTool(),
            currentStyle: this.canvasToolsBar.getCurrentStyle(),
            rect: this.canvas.getBoundingClientRect(),
            preX: this.startX,
            preY: this.startY,
            x: currentX.toString(),
            y: currentY.toString(),
            shiftKey: event?.shiftKey
        }

        if(this.isMouseDown && param.action !== 'shapeFlag'){
            handleContentForRemote(param)
        }else if(param.action === 'pointerFlag'){
            handleContentForRemote(param)
        }
    }

    // 鼠标松开事件
    mouseupHandler = (event)=>{
       if( event.button === 2 || this.pausePainting) return
       if(this.isMouseDown){
           this.isMouseDown = false
           this.ctx.closePath()
           this.updateCanvas ({canvas: this.canvas, isLocal: true })

           let {left, top} = this.canvas.getBoundingClientRect()
           let endX = event.clientX - left
           let endY = event.clientY - top

           let getRatio = this.getPostionRatio(true)
           endX = endX / getRatio.xRatio
           endY = endY / getRatio.yRatio

           this.canvasUp({x: endX, y:endY, event: event})

           if(this.isMouseMove){
               this.isMouseMove = false
           }

           window.removeEventListener("mouseup", this.mouseupHandler)
       }
    }

    //鼠标划过、离开事件
    mouseleaveHandler = (event)=>{
        if(this.pausePainting) return
        this.showPosition.style.display = "none";
        mouseStyle.style.display = "none"
        handleContentForRemote({type: 'mouseLeave'})
    }

    /**
     * 针对本端处理撤销方法
     */
    handleRevokeDraw(data){
        this.revokeDraw({canvas: this.canvas, isLocal: true, step: 2})
        handleContentForRemote({
            type: 'revoke',
            canvas: this.canvas
        })
    }

    /**
     * 针对本端处理恢复方法
     */
    handleRestoreDraw(data){
        this.restoreDraw({canvas: this.canvas, isLocal: true, step: 2})
        handleContentForRemote({ type: 'restore',canvas: this.canvas})
    }

    /**
     * 重置画布
     **/
    resetDraw = (data) => {
        if(!data ||!data.canvas){
            console.log("resetDraw: invalid parameter")
            return
        }

        if(data.isLocal){
            this.currentCanvasValue = 0;
            this.canvasHistory = this.canvasHistory.slice(0, 1);
            if(this.canvasHistory.length){
                data.msg = this.canvasHistory[0];
                this.setCanvas(data);
            }
        }else{
            let canvas = data.canvas
            canvas.currentCanvasValue = 0;
            canvas.canvasHistory = this.canvasHistory.slice(0, 1);
            if(canvas.canvasHistory.length){
                data.msg = canvas.canvasHistory[0];
                this.setCanvas(data);
            }
        }
    }


    /**
     * 更新画布状态
     **/
    updateCanvas(data){
        if(!data || !data.canvas) {
            console.log("updateCanvas: invalid parameter ")
            return
        }
        let canvas = data.canvas
        let ctx = canvas.getContext("2d",{ willReadFrequently: true})
        let canvasData = ctx.getImageData(0,0, canvas.width, canvas.height)
        if(data.isLocal){
            if (this.currentCanvasValue < this.canvasHistory.length - 1) {
                this.canvasHistory = this.canvasHistory.slice(0, this.currentCanvasValue + 1);
            }
            this.canvasHistory.push(canvasData);
            this.currentCanvasValue += 1;
        }else{
            if (canvas.currentCanvasValue < canvas.canvasHistory.length - 1) {
                canvas.canvasHistory = canvas.canvasHistory.slice(0, canvas.currentCanvasValue + 1);
            }
            canvas.canvasHistory.push(canvasData);
            canvas.currentCanvasValue += 1;
        }
    }

    /**
     * 存储画布状态
     * **/
    setCanvas = (data) => {
        if(!data || !data.canvas || !data.msg) {
            console.log("setCanvas: invalid parameter ")
            return
        }
        let canvas = data.canvas
        let ctx = canvas.getContext('2d',{ willReadFrequently: true})
        ctx.putImageData(data.msg, 0, 0);
    };

    /**
     * 撤销方法
     * @param data.canvas
     * @param data.isLocal
     * @param data.step
     */
    revokeDraw = (data) => {
        if(!data || !data.canvas) {
            console.log("revokeDraw: invalid parameter ")
            return
        }
        let canvas = data.canvas
        let step = !!data.step ?  data.step : 1

        if(data.isLocal){
            if (this.currentCanvasValue > 0) {
                this.currentCanvasValue = this.currentCanvasValue - step
                const canvasData = this.canvasHistory[this.currentCanvasValue];
                this.setCanvas ({canvas: data.canvas, msg: canvasData});
            }
        }else{
            if (canvas.currentCanvasValue > 0) {
                canvas.currentCanvasValue = canvas.currentCanvasValue - step
                const canvasData = canvas.canvasHistory[canvas.currentCanvasValue];
                this.setCanvas ({canvas: data.canvas, msg: canvasData});
            }
        }
    }

    /**
     * 恢复方法
     * @param data.canvas
     * @param data.isLocal
     * @param data.step
     */
    restoreDraw = (data) => {
        if(!data || !data.canvas){
            console.log("restoreDraw: invalid parameter ")
            return
        }

        let canvas = data.canvas
        let step = !!data.step ?  data.step : 1
        if(data.isLocal){
            if (this.currentCanvasValue < this.canvasHistory.length - 1) {
                this.currentCanvasValue = this.currentCanvasValue + step
                if(this.currentCanvasValue === this.canvasHistory.length){
                    this.currentCanvasValue = this.canvasHistory.length - 1
                }
                const canvasData = this.canvasHistory[this.currentCanvasValue];
                this.setCanvas ({canvas: data.canvas, msg: canvasData});
            }
        }else {
            if (canvas.currentCanvasValue < canvas.canvasHistory.length - 1) {
                canvas.currentCanvasValue = canvas.currentCanvasValue + step
                if(canvas.currentCanvasValue === canvas.canvasHistory.length){
                    canvas.currentCanvasValue = canvas.canvasHistory.length - 1
                }
                const canvasData = canvas.canvasHistory[canvas.currentCanvasValue];
                this.setCanvas ({canvas: data.canvas, msg: canvasData});
            }
        }
    };

    /***
     * 创建便签
     * */
    createNote(pos){
        let note = {
            x: pos.x,
            y: pos.y,
            width: 100,
            height: 100,
            text: '',
            color: this.canvasToolsBar.getColor(),
            dragging: false,
            isDrawing: false,
            offsetX: 0,
            offsetY: 0
        };

        // 将便签添加到数组中
        this.notes.push(note);

        // 绘制矩形
        this.drawNote(note);

    }

    /**
     * 绘制矩形
     * **/
    drawNote(note){
        note.isDrawing = true
        this.ctx.beginPath();

        let width = note.width * this.canvasStyleRatio.x
        let height = note.height * this.canvasStyleRatio.y

        // 绘制便签
        this.ctx.fillStyle = note.color
        this.ctx.fillRect(note.x, note.y, width, height);
        this.ctx.stroke()
        this.ctx.restore();
        this.ctx.closePath();
    }

    /*** 鼠标监听点击事件处理
     * @param data.startX
     * @param data.startY
     */
    canvasDown (data){
        this.startX = data.startX
        this.startY = data.startY

       if(this.canvasToolsBar.textFlag || this.canvasToolsBar.noteFlag){
        if (this.canvasToolsBar.textFlag) {
            this.setTextBoxStyle({x: data.startX, y: data.startY})

        } else if(this.canvasToolsBar.noteFlag){
            if(this.showInputFlag){
                this.handleDrawNote({text: this.textBox.value})
                this.setTextBoxStyle({x: data.startX, y: data.startY})
            }else{
                //判断当前位置是否已经存在note
                let selectionNote
                for (var i = 0; i < this.notes.length; i++) {
                    var note = this.notes[i];
                    if (this.startX > note.x && this.startX < note.x + note.width &&
                        this.startY > note.y && this.startY < note.y + note.height){
                        selectionNote = note
                        break;
                    }
                }

                /**1. 获取已经存在的note 2.设置textBox的样式（显示之前的value）  3.清除当前note的画布内容 4.绘制当前note的矩形框 ***/
                if(selectionNote){
                    this.setTextBoxStyle({x: selectionNote.x, y: selectionNote.y, note: selectionNote}, true)
                    this.ctx.clearRect(selectionNote.x, selectionNote.y, selectionNote.width, selectionNote.height)
                    this.drawNote(selectionNote)
                }else{
                    this.setTextBoxStyle({x: data.startX, y: data.startY})
                    this.createNote({x: data.startX, y: data.startY})
                }
            }
           }

           if(this.canvasToolsBar.textFlag || this.canvasToolsBar.noteFlag){
               this.updateCanvas({canvas: this.canvas, isLocal: true })
           }

        } else{
            if(this.canvasToolsBar.noteFlag || this.canvasToolsBar.textFlag) return

            this.isMouseDown = true
            this.points.push({ x: this.startX, y: this.startY });
        }
    }

    /** canvas : mousemove
     * @param data.currentX
     * @param data.currentY
     * @param data.event
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
                This.drawing({
                    x1: This.startX,
                    y1: This.startY,
                    x2: position.currentX,
                    y2: position.currentY,
                    shiftKey:position.event.shiftKey,
                    target: position.target,
                    action: This.canvasToolsBar.getCurrentSelectedTool(),
                    currentStyle: This.canvasToolsBar.getCurrentStyle()
                })
            }
        }

        displayPosition(data)
        drawing(data)
    }

    /**canvas: mouseup  **/
    canvasUp(data) {
        this.lastImage = this.canvas.toDataURL('image/png');
        this.points = []

        if(!this.canvasToolsBar.noteFlag){
            this.textBox.value = ''
        }

        this.showPosition.style.display = 'none'

        let param = {
            type: 'mouseUp',
            action: this.canvasToolsBar.getCurrentSelectedTool(),
            currentStyle: this.canvasToolsBar.getCurrentStyle(),
            startX: this.startX,
            startY: this.startY,
            endX: data.x,
            endY: data.y,
            shiftKey: data.event?.shiftKey
        }

        handleContentForRemote(param)
    }

    /**
     * 钢笔
     * @param data.canvas
     * @param data.x2
     * @param data.y2
     * @param data.color
     * @param data.size
     **/
    pen(data){
        let points = data?.canvas.points || data.points
        let ctx = data?.canvas.getContext('2d',{ willReadFrequently: true})

        let getRandomInt = function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        let param
        if( Number(data.size) === 1 ){
            param = getRandomInt(1, 3)
        }else if(Number(data.size) === 4){
            param = getRandomInt(3, 5)
        }else if(Number(data.size) === 8){
            param = getRandomInt(5, 7)
        }

        points.push({
            x: data.x2,
            y: data.y2,
            width: param
        });

        ctx.strokeStyle = data.color

        for (let i = 1; i < points.length; i++) {
            ctx.beginPath();
            ctx.moveTo(points[i-1].x, points[i-1].y);
            ctx.lineWidth = points[i].width;
            ctx.lineTo(points[i].x, points[i].y);
            ctx.stroke();
        }
    }

    /**
     * 切片笔画
     * @param data.canvas
     * @param data.x2
     * @param data.y2
     * @param data.color
     * @param data.size
     **/
     slicingPen(data){

        let points = data?.canvas.points || data.points
        let ctx = data?.canvas.getContext('2d',{ willReadFrequently: true})

        ctx.lineWidth = data.color * this.canvasStyleRatio.x;
        ctx.strokeStyle = data.color
        ctx.lineJoin = ctx.lineCap = 'round';
        ctx.beginPath();

        ctx.globalAlpha = 1;
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(data.x2, data.y2);
        ctx.stroke();

        ctx.moveTo(points[0].x - 4, points[0].y - 4);
        ctx.lineTo(data.x2 - 4, data.y2 - 4);
        ctx.stroke();

        ctx.moveTo(points[0].x - 2, points[0].y - 2);
        ctx.lineTo(data.x2 - 2, data.y2 - 2);
        ctx.stroke();

        ctx.moveTo(points[0].x + 2, points[0].y + 2);
        ctx.lineTo(data.x2 + 2, data.y2 + 2);
        ctx.stroke();

        ctx.moveTo(points[0].x + 4, points[0].y + 4);
        ctx.lineTo(data.x2 + 4, data.y2 + 4);
        ctx.stroke();

        points[0] = { x: data.x2, y: data.y2 };
    }

    /**
     * 橡皮擦
     **/
    eraser(data){
        if(!data || !data.canvas || !data.eraserSize) return
        let canvas = data.canvas
        let size = data.eraserSize * 10 / 2 * this.canvasStyleRatio.x
        let ctx = canvas.getContext('2d',{ willReadFrequently: true})

        ctx.save()
        ctx.beginPath()

        ctx.arc(data.x, data.y, size, 0, 2 * Math.PI);
        ctx.clip();
        ctx.clearRect(0, 0, this.canvasStyle.width, this.canvasStyle.height);

        ctx.restore();
        ctx.closePath();
    }

    /**
     * 设置textarea的样式和大小
     * **/
    setTextBoxStyle(data, isRestoreValue = false){
        if(this.showInputFlag){
            this.textContent = this.textBox.value
            this.showInputFlag = false

            if(this.canvasToolsBar.textFlag){
                this.textAreaRect = this.textBox.getBoundingClientRect()
                this.handleTextAreaText(data)
            }

            /** 绘图后将文本框恢复到原点***/
            this.textBox.style.display = 'none'
            this.textBox.style['z-index'] = 1
            this.textBox.value = ""

        }else{
            this.showInputFlag = true

            /** 每次点击恢复原本大小 且在对应的位置显示输入框**/
            this.textBox.style.left = data.x + 'px'
            this.textBox.style.top = data.y + 'px'
            this.textBox.style.display = 'block'
            this.textBox.style['z-index'] = 999;
            this.textBox.focus()

            /**修改样式**/
            if(this.canvasToolsBar.textFlag){
                this.textBox.cols = 1;
                this.textBox.rows = 1;
                this.textBox.style.height = '19px'
                this.textBox.style.width = ''
                this.textBox.style.color = this.canvasToolsBar.getColor()
                this.textBox.style.fontSize = this.canvasToolsBar.getTextFontSize() * this.canvasStyleRatio.x + 'px'

            }else if(this.canvasToolsBar.noteFlag) {
                this.textBox.style.width = 98 * this.canvasStyleRatio.x + 'px'
                this.textBox.style.height = 96 * this.canvasStyleRatio.y + 'px'
                this.textBox.style.fontSize = 12 * this.canvasStyleRatio.x + 'px'
                this.textBox.style.color = 'black'

                //恢复原来的值
                if(isRestoreValue){
                    this.textBox.value = data.note.text
                }
            }
        }
    }

    /**
     * 绘制文本文字
     * **/
    handleTextAreaText(data){
        this.createText({x: parseFloat(this.textBox.style.left), y: parseFloat(this.textBox.style.top), text: this.textContent, event: data.event, target: data.target})

        handleContentForRemote({
            type: 'textFlag',
            action: this.canvasToolsBar.getCurrentSelectedTool(),
            currentStyle: this.canvasToolsBar.getCurrentStyle(),
            canvas: this.canvas,
            text: this.textContent,
            x: parseFloat(this.textBox.style.left),
            y: parseFloat(this.textBox.style.top)
        })
    }

    /**
     * 输入文字
     * **/
    handleDrawNote(data){
        if(this.canvasToolsBar.noteFlag){   // 便签
            let note = this.notes.find(item => item.isDrawing)
            if(!note) return

            // 针对当前便签保存内容
            note.text = data.text
            note.isDrawing = false

            // 设置字体样式
            const getTestAreaStyle = getComputedStyle(this.textBox)
            const fontSize = getTestAreaStyle.getPropertyValue('font-size');
            const fontFamily = getTestAreaStyle.getPropertyValue('font-family');

            let size = parseInt(fontSize)
            let width = 98 * this.canvasStyleRatio.x

            this.ctx.font = size + 'px ' + fontFamily;
            this.ctx.fillStyle = getTestAreaStyle.getPropertyValue('color');
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';

            this.ctx.beginPath();
            this.drawText({type: 'noteFlag', x: note.x, y: note.y, text: note.text, fontSize: size, ctx: this.ctx, limitWidth: width})
            this.ctx.stroke()
            this.ctx.restore();
            this.ctx.closePath();

            handleContentForRemote({
                type: 'noteFlag',
                action: this.canvasToolsBar.getCurrentSelectedTool(),
                currentStyle: this.canvasToolsBar.getCurrentStyle(),
                canvas: this.canvas,
                text: note.text,
                width: note.width,
                height: note.height,
                fontSize: 12,
                x: note.x,
                y: note.y,
            })
        }
    }

    /**
     * 创建文字
     **/
    createText(data){
        let text = {
            x: data.x,
            y: data.y,
            text: data.text,
            textColor: this.canvasToolsBar.getColor(),
            fontSize: this.canvasToolsBar.getTextFontSize(),
            dragging: false,
            isDrawing: false,
            offsetX: 0,
            offsetY: 0
        }
        this.texts.push(text)

        this.drawing({
            x1: data.x,
            y1: data.y,
            shiftKey:data.event?.shiftKey,
            target: data.target,
            action:this.canvasToolsBar.getCurrentSelectedTool(),
            currentStyle: this.canvasToolsBar.getCurrentStyle()
        });
    }

    /**绘制文字
     * @param data.type： textFlag、noteFlag
     * @param data.x
     * @param data.y
     * @param data.ctx
     * @param data.fontSize
     * @param data.text：文本内容
     * @param data.limitWidth： 限制宽度
     * @param data.startLeft: 相对于窗口的起始位置（针对textFlag）
     **/
    drawText(data){
        let allChars = data.text.split('')
        let lineText = '';    // 每行的内容
        let px = parseInt(data.x) + 5
        let py = parseInt(data.y) + 5

        let ctx = data.ctx
        let lineHeight = parseInt(data.fontSize,17);
        for (let i = 0; i < allChars.length; i++) {
            // measureText 可计算绘制内容的宽度
            let metric = ctx.measureText(lineText + allChars[i]);

            if (metric.width < data.limitWidth) {

                if(data.type === 'textFlag'){
                    let canvasRect = this.canvas.getBoundingClientRect()
                    let width = data.startLeft + metric.width
                    if( width < canvasRect.right ){
                        lineText = lineText + allChars[i];
                        ctx.fillText(lineText, px, py);
                        if(allChars[i] === '\n'){
                            lineText = '';
                            py = py + lineHeight;
                        }
                    }else{
                        ctx.fillText(lineText, px, py);
                        lineText = allChars[i];
                        py =  py + lineHeight;
                    }
                }else if(data.type === 'noteFlag'){
                    lineText = lineText + allChars[i];
                    ctx.fillText(lineText, px, py);
                    if(allChars[i] === '\n'){
                        lineText = '';
                        py = py + lineHeight;
                    }
                }

            }else {
                ctx.fillText(lineText, px, py);
                lineText = allChars[i];
                py =  py + lineHeight;
            }
        }
    }

    /**绘制方形
     * @param data.action: rectFlag（实心）、strokeRectFlag（空心）
     * @param data.shiftkey: 表示当前是正方形，否则就是普通方形
     * @param data.canvas
     * @param data.startX
     * @param data.startY
     * @param data.endX
     * @param data.endY
     **/
    drawRectangle(data){
        if(!data.canvas) return
        let action
        let x1 = data.startX
        let y1 = data.startY
        let x2 = data.endX
        let y2 = data.endY
        let ctx = data.canvas?.getContext('2d',{ willReadFrequently: true})

        if(data.action === 'rect'){
            action = 'fillRect'
        }else if(data.action === 'strokeRect'){
            action = 'strokeRect'
        }

        ctx.beginPath()
        if (data.shiftKey) {   // 正方形
            let d = ((x2 - x1) < (y2 -y1)) ? (x2 - x1) : (y2 - y1);
            ctx[action](x1, y1, d, d);
        } else {                    // 普通方形
            ctx[action](x1, y1, x2 - x1, y2 - y1);
        }
        ctx.closePath()
    }

    /** 绘制圆
     * @param data.action: circleFlag（实心）、strokeCircleFlag（空心）
     * @param data.shiftkey: 表示当前是正方形，否则就是普通方形
     * @param data.canvas
     * @param data.startX
     * @param data.startY
     * @param data.endX
     * @param data.endY
     * **/
    drawRound(data){
        if(!data.canvas) return

        let x1 = data.startX
        let y1 = data.startY
        let x2 = data.endX
        let y2 = data.endY
        let ctx = data.canvas?.getContext('2d',{ willReadFrequently: true})

        let k = ((x2 - x1) / 0.55);
        let w = (x2 - x1) / 2  ;
        let h = (y2 - y1) / 2 ;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 4 * this.canvasStyleRatio.x             // 指定描边线的宽度
        ctx.beginPath()
        if (data.shiftKey === true) {     // circle
            let r = Math.sqrt(w * w + h * h);
            ctx.arc(w + x1, h + y1, r, 0, Math.PI * 2);
        } else {                        // ellipse
            // bezier double ellipse algorithm
            ctx.moveTo(x1, y1 + h);
            ctx.bezierCurveTo(x1, y1 + h * 3, x1 + w * 11 / 5, y1 + h * 3, x1 + w * 11 / 5, y1 + h);
            ctx.bezierCurveTo(x1 + w * 11 / 5, y1 - h, x1, y1 - h, x1, y1 + h);
        }

        if(data.action === 'circle'){
            ctx.fill();         // 实心
        }else if(data.action === 'strokeCircle'){
            ctx.stroke();       // 空心
        }
        ctx.closePath()
    }

    /**
     * 绘制直线
     * @param data.canvas
     * @param data.startX
     * @param data.startY
     * @param data.endX
     * @param data.endY
     * **/
    drawLine(data){
        if(!data.canvas) return

        let x1 = data.startX
        let y1 = data.startY
        let x2 = data.endX
        let y2 = data.endY
        let ctx = data.canvas?.getContext('2d',{ willReadFrequently: true})

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 4 * this.canvasStyleRatio.x             // 指定描边线的宽度
        ctx.beginPath()
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath()
    }

    /** 绘制箭头
     * @param data.action: arrowFlag（实心）
     * @param data.canvas
     * @param data.startX
     * @param data.startY
     * @param data.endX
     * @param data.endY
     **/
    drawArrow(data){
        if(!data.canvas) return

        let x1 = data.startX
        let y1 = data.startY
        let x2 = data.endX
        let y2 = data.endY
        let ctx = data.canvas?.getContext('2d',{ willReadFrequently: true})
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 4 * this.canvasStyleRatio.x             // 指定描边线的宽度
        ctx.beginPath()

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
        ctx.fill();

        ctx.closePath()
    }

    hiddenContent(content){
        if(!content || !content.account){
            console.log('target empty for hiddenContent')
            return
        }

        /***隐藏鼠标显示***/
        let otherShowPosition = document.getElementsByClassName('otherShowPosition')
        if(otherShowPosition.length){
            if(!content?.account?.id)return
            for(let index of otherShowPosition){
                let nameId = index.getAttribute('nameId')
                if(nameId === content.account.id){
                    index.style.display = "none";
                    break
                }
            }
        }

        /**隐藏形状图显示**/
        let otherMouseStyle = document.getElementsByClassName('otherMouseStyle')
        if(otherMouseStyle.length){
            if(!content?.account?.id)return
            for(let index of otherMouseStyle){
                let nameId = index.getAttribute('nameId')
                if(nameId === content.account.id){
                    index.style.display = "none";
                    break
                }
            }
        }
    }

    otherCanvasDown(data){
        if(!data || !data.target){
            console.log('target empty for other otherCanvasDown')
            return
        }

        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){
            if( data.action === 'eraserFlag' || data.action === 'textFlag' || data.action === 'noteFlag' ){
                console.log("otherCanvasDown: no processing.")
            }else{
                /**处理远端绘制内容**/
                canvas.points.push({ x: data.startX, y: data.startY })
                if(data.action !== 'shapeFlag'){
                    this.drawing({
                        x1: data.startX,
                        y1: data.startY,
                        shiftKey: data.shiftKey,
                        target: canvas,
                        action: data.action,
                        currentStyle: data.currentStyle
                    });
                }
            }
        }
        this.updateCanvas({canvas: data.target, isLocal: false })
    }

    otherCanvasMove(data){
        if(!data || !data.target || !data.currentStyle){
            console.log('target empty for other otherCanvasMove')
            return
        }
        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){

            /** 处理绘制内容( 解决在原地多次点击导致的绘制问题) **/
            if(this.isShowComment &&(canvas.startX !== data.currentX || canvas.startY !== data.currentY)){
                this.drawing({
                    x1: data.startX,
                    y1: data.startY,
                    x2: data.currentX,
                    y2: data.currentY,
                    shiftKey: data.shiftKey,
                    target: data.target,
                    action: data.action,
                    currentStyle: data.currentStyle
                })
            }
        }
    }

    otherCanvasUp(content){
        if(!content || !content.target){
            console.log('target empty for other canvasUp')
            return
        }

        /**处理canvas位置***/
        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === content.target.nameId)
        canvas.points = []
        if(content.action !== 'shapeFlag'){
            this.updateCanvas({canvas: canvas, isLocal: false })
        }

        /**处理隐藏内容**/
        this.hiddenContent(content)
    }

    otherCanvasLeave(content){
        this.hiddenContent(content)
    }


    otherCanvasDelete(data){
        if(!data || !data.target){
            console.log('target empty for other canvasDelete')
            return
        }

        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){
            let ctx = canvas.getContext('2d',{ willReadFrequently: true})

            if(data.type === 'areaDelete'){
                this.updateCanvas({canvas: canvas, isLocal: false })
                ctx.clearRect(data.x, data.y, data.width, data.height)
                this.updateCanvas({canvas: canvas, isLocal: false })
            }else if(data.type === 'allDelete'){
                ctx.clearRect(0, 0, this.canvasStyle.width, this.canvasStyle.height)
                this.resetDraw({canvas: canvas, isLocal: false })
            }
        }

    }

    /** 绘制远端text
     * @param data.type
     * @param data.x
     * @param data.y
     * @param data.text
     * @param data.target
     * @param data.textColor
     * @param data.textFontSize
     * @param data.startLeft
     * **/
    otherCanvasDrawText(data){

        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){
            let ctx = canvas.getContext('2d',{ willReadFrequently: true})
            let font = data.textFontSize * this.canvasStyleRatio.x
            let width = 261 * this.canvasStyleRatio.x
            let left = canvas.getBoundingClientRect().x + data.x

            // 设置字体样式
            ctx.fillStyle = data.textColor;
            ctx.font = font + 'px ' + "'Open Sans', 'SimHei', sans-serif";
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            ctx.beginPath();
            this.drawText({type: data.type, x: data.x, y: data.y, text: data.text, fontSize: font, ctx: ctx, limitWidth: width, startLeft: left})
            ctx.stroke()
            ctx.restore();
            ctx.closePath();
        }
    }

    /** 绘制远端note
     * @param data.type
     * @param data.x
     * @param data.y
     * @param data.width
     * @param data.height
     * @param data.text
     * @param data.fontSize
     * @param data.target
     * @param data.bgColor
     * **/
    otherCanvasDrawNote(data){
        if(!data || !data.target){
            console.log('target empty for other canvasDrawNote')
            return
        }

        let size = data.fontSize * this.canvasStyleRatio.x
        let width = 98 * this.canvasStyleRatio.x
        data.width = data.width * this.canvasStyleRatio.x
        data.height = data.height * this.canvasStyleRatio.y

        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){
            let ctx = canvas.getContext('2d',{ willReadFrequently: true})

            // 绘制便签方框
            ctx.beginPath();
            ctx.fillStyle = data.bgColor
            ctx.fillRect(data.x, data.y, data.width, data.height);
            ctx.stroke()

            // 绘制文字
            ctx.fillStyle = '#000000';
            ctx.font = size + 'px ' + "'Open Sans', 'SimHei', sans-serif";
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            this.drawText({type: 'noteFlag', x: data.x, y: data.y, text: data.text, fontSize: size, ctx: ctx, limitWidth: width})
            ctx.stroke()
            ctx.restore();
            ctx.closePath();
        }
    }

    /**绘制远端内容
     *
     **/
    otherCanvasDraw(data){
        console.warn("data:",data)
        if(!data || !data.target){
            console.log('target empty for other canvasDraw')
            return
        }
        let getRatio = can.getPostionRatio(false)
        let position ={
            x1: data.content.startX / getRatio.xRatio,
            y1: data.content.startY / getRatio.yRatio,
            x2: data.content.endX / getRatio.xRatio,
            y2: data.content.endY / getRatio.yRatio,
        }
        let param
        let currentStyle = data.content.currentStyle
        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){
            let ctx = canvas.getContext('2d',{ willReadFrequently: true})
            ctx.strokeStyle = currentStyle?.color                                               // 画笔的颜色
            ctx.lineWidth = currentStyle?.brushStrokeSize * this.canvasStyleRatio.x             // 指定描边线的宽度
            ctx.fillStyle = currentStyle?.color                                                 // 填充颜色

            ctx.save()

            switch(currentStyle.lineStyle){
                case 'rect':
                case 'strokeRect':
                    param = {
                        action: currentStyle?.lineStyle,
                        shiftkey: data.content?.shiftKey,
                        canvas: canvas,
                        startX: position.x1,
                        startY: position.y1,
                        endX: position.x2,
                        endY: position.y2
                    }
                    this.drawRectangle(param)
                    break;
                case 'circle':
                case 'strokeCircle':
                    param = {
                        action: currentStyle?.lineStyle,
                        shiftkey: data.content?.shiftKey,
                        canvas: canvas,
                        startX: position.x1,
                        startY: position.y1,
                        endX: position.x2,
                        endY: position.y2
                    }
                    this.drawRound(param)
                    break;
                case 'line':
                    param = {
                        canvas: canvas,
                        startX: position.x1,
                        startY: position.y1,
                        endX: position.x2,
                        endY: position.y2
                    }
                    this.drawLine(param)
                    break;
                case 'arrow':
                    param = {
                        action: currentStyle?.lineStyle,
                        shiftkey: data.content?.shiftKey,
                        canvas: canvas,
                        startX: position.x1,
                        startY: position.y1,
                        endX: position.x2,
                        endY: position.y2
                    }
                    ctx.save()
                    this.drawArrow(param)
                    ctx.restore();
                    ctx.closePath();
                    break
                default:
                    console.warn("current action is",data.content.lineStyle)
                    break
            }
            ctx.restore();
            ctx.closePath();
        }
        this.updateCanvas({canvas: canvas, isLocal: false })
    }

    /**
     * 处理撤销恢复流程
     * **/

    otherCanvasUndoRecovery(data){
        if(!data || !data.target){
            console.log('target empty for other canvas UndoRecovery')
            return
        }

        let canvas = can.canvasArray.find(item => item.getAttribute('nameId') === data.target.nameId)
        if(canvas){
            switch(data.type){
                case 'revoke':
                    this.revokeDraw({canvas: canvas, isLocal: false, step: 2})
                    break;
                case 'restore':
                    this.restoreDraw({canvas: canvas, isLocal: false, step: 2})
                    break;
                default:
                    console.warn("otherCanvasUndoRecovery: current type is ", data.type)
                    break;
            }
        }
    }
    loadImage(ctx){
        let self = this;
        let img = new Image();
        img.src = self.lastImage;
        ctx.drawImage(img, 0, 0, self.canvasStyle.width, self.canvasStyle.height);
    }

    setDefaultTextBox(){
        this.textBox.cols = 1
        this.textBox.rows = 1
        this.textBox.value =''
        this.textBox.style.display = "none"
    }


    drawing (data) {
        if(!data || !data.action || !data.currentStyle){
            console.log("drawing: invalid parameter" ,data)
            return
        }
        let points = !data.target ? this.points : data.target.points
        let getCanvas = !data.target ? this.canvas : data.target
        let action = data.action
        let currentStyle = data.currentStyle
        let brushColor = currentStyle.color
        let brushStrokeSize = currentStyle.brushStrokeSize
        let brushStrokeStyle = currentStyle.brushStrokeStyle

        /**针对shapeFlag 修改type**/
        if(action === 'shapeFlag'){
            action = currentStyle.lineStyle
        }else if(action === 'brushFlag'){
            action = currentStyle.brushStrokeStyle
        }

        let param ={
            x1: data.x1,
            y1: data.y1,
            x2: data.x2,
            y2: data.y2,
            style: brushStrokeStyle,
            color: brushColor,
            size: brushStrokeSize,
            canvas: getCanvas,
            points: points,
            action: action,
            lineStyle: currentStyle.lineStyle,
            shiftKey: data.shiftKey
        }

        this.startDraw(param)
    }


    /***根据类别进行绘制***/
    startDraw( content){
        if(!content || !content.action || !content.canvas){
            console.log("startDraw: invalid parameter ",content)
            return
        }
        let x1 = content.x1
        let y1 = content.y1
        let x2 = content.x2
        let y2 = content.y2

        let self = this
        let canvas = content.canvas
        let points = canvas.points || content.points
        let ctx = content?.canvas.getContext('2d',{ willReadFrequently: true})
        if(!ctx) return

        ctx.strokeStyle = content.color                                    // 画笔的颜色
        ctx.lineWidth = content.size * this.canvasStyleRatio.x             // 指定描边线的宽度
        ctx.fillStyle = content.color                                      // 填充颜色为红色

        // Point-based with shadow
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = content.color || 'rgb(0, 0, 0)'

        ctx.save()
        ctx.beginPath()

        switch(content.action){
            case 'rect':
                this.revokeDraw({canvas: canvas, isLocal: true })
                this.drawRectangle({
                    action: content.action,
                    shiftkey: content.shiftKey,
                    canvas: canvas,
                    startX: content.x1,
                    startY: content.y1,
                    endX: content.x2,
                    endY: content.y2
                })
                this.updateCanvas({canvas: canvas, isLocal: true })
                break;
            case 'strokeRect':
                this.revokeDraw({canvas: canvas, isLocal: true })
                this.drawRectangle({
                    action: content.action,
                    shiftkey: content.shiftKey,
                    canvas: canvas,
                    startX: content.x1,
                    startY: content.y1,
                    endX: content.x2,
                    endY: content.y2
                })
                this.updateCanvas({canvas: canvas, isLocal: true })
                break;
            case 'circle':
            case 'strokeCircle':
                // 圆
                this.revokeDraw({canvas: canvas, isLocal: true })
                this.drawRound({
                    action: content.action,
                    shiftkey: content.shiftKey,
                    canvas: canvas,
                    startX: content.x1,
                    startY: content.y1,
                    endX: content.x2,
                    endY: content.y2
                })
                this.updateCanvas({canvas: canvas, isLocal: true })
                break;
            case 'line':
                // 线条
                this.revokeDraw({canvas: canvas, isLocal: true })
                this.drawLine({
                    canvas: canvas,
                    startX: x1,
                    startY: y1,
                    endX: x2,
                    endY: y2
                })
                this.updateCanvas({canvas: canvas, isLocal: true })
                break;
            case 'arrow':
                // 箭头
                ctx.fillStyle = content.color
                this.revokeDraw({canvas: canvas, isLocal: true })
                this.drawArrow({
                    action: content.action,
                    canvas: canvas,
                    startX: content.x1,
                    startY: content.y1,
                    endX: content.x2,
                    endY: content.y2
                })
                this.updateCanvas({canvas: canvas, isLocal: true })
                break;
            case 'textFlag':
                // 写字

                let font = self.canvasToolsBar.getTextFontSize() * self.canvasStyleRatio.x
                let width = 261 * self.canvasStyleRatio.x

                ctx.font =  font +'px' +  " 'Open Sans', 'SimHei', sans-serif"

                ctx.textBaseline = 'top';         // "alphabetic" | "bottom" | "hanging" | "ideographic" | "middle" | "top";
                ctx.textAlign = 'left';           // "center" | "end" | "left" | "right" | "start"; 值不同，绘制的时候 fillText 的坐标也要修改

                ctx.beginPath()
                this.drawText({
                    type: 'textFlag',
                    text: self.textContent,
                    x: self.textBox.style.left,
                    y: self.textBox.style.top,
                    ctx: ctx,
                    fontSize: font,
                    limitWidth: width,
                    startLeft: self.textAreaRect.left
                })

                break;
            case 'eraserFlag':
                // 橡皮擦
                let size = Number(self.canvasToolsBar.eraserSize)
                size = size * 10 / 2 * this.canvasStyleRatio.x

                ctx.beginPath()
                ctx.arc(x2, y2, size, 0, 2 * Math.PI);
                ctx.clip();
                ctx.clearRect(0, 0, self.canvasStyle.width, self.canvasStyle.height);
                break;
            case 'clearFlag':
                // 清空
                ctx.beginPath()
                self.initCanvas()
                self.lastImage = null
                self.canvasToolsBar.changeToolBarStyle({ flag:'mouseFlag', type: 'defaultMouse' })

                // 清除并隐藏输入框
                self.setDefaultTextBox()
                break;
            case 'wide':
                this.slicingPen(content)
                break
            case 'pen':
                this.pen(content)
                break
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
                points.slice(0, 1);
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
     * @return  xRatio = canvasStyleWidth / canvasHtmlWidth;
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
    makeExpandingArea(isAddCols, event){
        let data = event.data
        let target = event.target
        let isAddWidth = true
        this.textBox.style.height = 'auto';
        this.textBox.style.height = this.textBox.scrollHeight + 'px';

        /**1.先判断字体是否达到canvas 的右边界， 如果存在，则换行且不增加宽度**/
        /**2.针对当前行的文字比上一行文字少，则不需要增加宽度**/
        if(this.canvasToolsBar.getCurrentSelectedTool() === 'textFlag'){
            let targetRect = target.getBoundingClientRect()
            let canvasRect = this.canvas.getBoundingClientRect()
            let width = targetRect.width + targetRect.left

            /**先判断字体是否达到canvas 的右边界， 如果存在，则换行且不增加宽度**/
            if(width > canvasRect.right){
                target.style.whiteSpace = 'pre-wrap'
                return
            }

            if(!data){
                this.textBoxValue = ''
                isAddWidth = false
            }else{
                this.textBoxValue += event.data

                // 获取textarea的行宽和高度
                let style = getComputedStyle(this.textBox);
                let lineWidth = parseInt(style.width);
                let lineHeight = parseInt(style.lineHeight);

                // 获取textarea的字体大小
                let fontSize = style.fontSize;

                // 创建一个隐藏的span元素，用来获取字体宽度
                let hiddenSpan = document.createElement('span');
                hiddenSpan.style.fontSize = fontSize;
                hiddenSpan.style.visibility = 'hidden';

                document.body.appendChild(hiddenSpan);
                hiddenSpan.textContent = this.textBoxValue

                let width = hiddenSpan.offsetWidth || hiddenSpan.style.width

                // 移除隐藏的span元素
                document.body.removeChild(hiddenSpan);


                /***针对当前行的文字比上一行文字少，则不需要增加宽度******/
                if(width <= lineWidth  && isAddWidth){
                    return
                }
            }

        }

        /**3.针对设置的固定宽度是否到达，若没有，则继续增加宽度，采用cols处理**/
        if(!isAddCols && data && this.textBox.cols < 30 ){
            this.textBox.cols  = this.textBox.cols + 1
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
        if(!this.ctx) return
        this.updateCanvas({canvas: this.canvas, isLocal: true})

        let startX = Math.min(this.mouseX1, this.mouseX2)
        let startY = Math.min(this.mouseY1, this.mouseY2)
        let { width, height} = this.selectAreaElement.getBoundingClientRect()

        this.ctx.clearRect(startX, startY, width, height)
        this.selectAreaElement.hidden = 1

        this.deleteSelectedNote({startX: startX, startY: startY,endX: startX + width, endY: startY + height })

        /*** 保存当前的画面 **/
        this.canvas.lastImage = this.canvas.toDataURL('image/png')
        this.updateCanvas({canvas: this.canvas, isLocal: true})

        /**告知对端清除位置**/
        let param = {
            type: 'areaDelete',
            x: startX.toString(),
            y: startY.toString(),
            width: width,
            height: height,
            canvas: this.canvas
        }

        handleContentForRemote(param)
    }

    /**
     * 删除框选的便签
     * **/
    deleteSelectedNote(data){
        // 判断便签是否在框选区域内
        for (var i = this.notes.length - 1; i >= 0; i--) {
            var note = this.notes[i];
            if (data.startX <= note.x + note.width && data.endX >= note.x &&
                data.startY <= note.y + note.height && data.endY >= note.y) {
                this.notes.splice(i,1)
            }
        }
    }
}


/********************* 拖动模型*************************/
class DragMoveModel {
    startX = 0               // 按下的鼠标x值
    startY = 0               // 按下的鼠标y值
    moveInsX = 0             // 移动的x的值（从0开始累加）
    moveInsY = 0             // 移动的y的值（从0开始累加）
    isMousedown = false      // 是否按下鼠标
    isMouseMove = false      // 是否移动位置
    direction = null            //  显示方向
    clickEl = null
    targetEl = null              // 目标元素
    targetElTx = 0            // 目标元素的translate的x的值
    targetElTy = 0            // 目标元素的translate的y的值
    initTargetElTop = 0       // 目标元素的初始top值
    initTargetElLeft = 0      // 目标元素的初始left值
    limitMoveBorder = false   // 限制移动边界
    moveMode = 'transform'     // transform为transform-translate方式移动，position为top,left方式移动
    callback = null              // 回调函数，用于获取鼠标移动距离
    h5 = false                // 是否用于h5
    rootDom = document      // 根文档

    mainToolbar = null           // 主工具元素
    subToolbar = null            // 子工具元素
    deployToolbar = null         // 展开或者收起元素
    isDeploy = true          // 默认是否展开
    tool = null                 // 针对工具栏进行区分： canvasTool、functionBtn

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

        this.direction = config.direction
        this.rootDom = config.rootDom || this.rootDom
        this.mainToolbar = config.mainToolbar
        this.subToolbar = config.subToolbar
        this.deployToolbar = config.deployToolbar
        this.tool = config.tool
    }

    // 初始化目标元素相关信息
    _initTragetElInfo() {
        if (this.targetEl) {
            const { top, left } = this.targetEl.getBoundingClientRect()
            this.initTargetElTop = top
            this.initTargetElLeft = left
            this.targetEl.style['will-change'] = this.moveMode === 'transform' ? 'transform' : 'left, top'
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
        e.preventDefault()
        e.stopPropagation()
        const pageX = this.h5 ? e.changedTouches[0].pageX : e.pageX
        const pageY = this.h5 ? e.changedTouches[0].pageY : e.pageY
        if (this.isMousedown) {
            this.isMouseMove = true
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
        e.preventDefault()
        e.stopPropagation()
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
        e.preventDefault()
        e.stopPropagation()
        this.isMousedown = false // 标记鼠标松开状态
        this.startX = 0 // 将x轴鼠标起始位置清零
        this.startY = 0 // 将y轴鼠标起始位置清
        if(this.isMouseMove){
            this.isMouseMove = false
        }else{
            this.handleDisplayForCanvasTool()
        }

        if(this.direction === 'upOrDown'){
            let {top, height} = this.mainToolbar.getBoundingClientRect()
            if(top < window.innerHeight - 2 * height){
                if(!this.subToolbar.classList.contains('toolbarChild_top')){
                    this.subToolbar.classList.add('toolbarChild_top')
                }
                this.subToolbar.style.removeProperty('bottom')
            }else{
                this.subToolbar.classList.remove('toolbarChild_top')
                this.subToolbar.style.bottom = '55px'
            }

        }else if(this.direction === 'leftOrRight') {
            let {left, width, right} = this.mainToolbar.getBoundingClientRect()
            let {width: subWidth} = this.subToolbar.getBoundingClientRect()
            if(left >  width + subWidth){
                if(!this.subToolbar.classList.contains('colorSelectContainer_right')){
                    this.subToolbar.classList.add('colorSelectContainer_right')
                }
                this.subToolbar.style.removeProperty('left')
            }else{
                this.subToolbar.classList.remove('colorSelectContainer_right')
                this.subToolbar.style.left = '50px'
            }
        }

    }

    /**处理收起、展开内容**/
    handleDisplayForCanvasTool = function(){
        if(this.isDeploy){
            this.isDeploy = false

            if(this.tool === 'canvasTool'){
                /**针对工具栏**/
                this.deployToolbar.classList.remove('rightOfCanvasTool')
                if(!this.deployToolbar.classList.contains('leftOfCanvasTool')){
                    this.deployToolbar.classList.add('leftOfCanvasTool')
                }
                /**隐藏子组件**/
                can.canvasToolsBar.setDefaultOfChild()
            }else if(this.tool === 'functionBtn'){
                /**针对功能按钮**/
                this.deployToolbar.classList.remove('rightOfFunctionBtn')
                if(!this.deployToolbar.classList.contains('leftOfFunctionBtn')){
                    this.deployToolbar.classList.add('leftOfFunctionBtn')
                }
            }

        }else{
            this.isDeploy = true

            if(this.tool === 'canvasTool'){
                /**针对工具栏**/
                this.deployToolbar.classList.remove('leftOfCanvasTool')
                if(!this.deployToolbar.classList.contains('rightOfCanvasTool')){
                    this.deployToolbar.classList.add('rightOfCanvasTool')
                }
            }else if(this.tool === 'functionBtn'){
                /**针对功能按钮**/
                this.deployToolbar.classList.remove('leftOfFunctionBtn')
                if(!this.deployToolbar.classList.contains('rightOfFunctionBtn')){
                    this.deployToolbar.classList.add('rightOfFunctionBtn')
                }
            }
        }
    }

    // 初始化监听事件
    _initEvent() {
        const moveEvent = this.h5 ? 'touchmove' : 'mousemove'
        const downEvent = this.h5 ?  'touchstart' : 'mousedown'
        const upEvent = this.h5 ? 'touchend' : 'mouseup'
        this.rootDom.addEventListener(moveEvent, this._mousemoveHandler)
        this.clickEl && this.clickEl.addEventListener(downEvent, this._mousedownHandler)
        this.clickEl && this.clickEl.addEventListener(upEvent, this._mouseupHandler)

    }

    // 销毁方法
    destroy() {
        const moveEvent = this.h5 ? 'touchmove' : 'mousemove'
        const downEvent = this.h5 ?  'touchstart' : 'mousedown'
        const upEvent = this.h5 ? 'touchend' : 'mouseup'
        this.rootDom.removeEventListener(downEvent, this._mousemoveHandler)
        this.clickEl && this.clickEl.removeEventListener(moveEvent, this._mousedownHandler)
        this.clickEl && this.clickEl.addEventListener(upEvent, this._mouseupHandler)
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
        this.canvas = config.canvas
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
                    this.togglePictureInPicture()
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

        /**保存全屏之前canvas大小**/
        let rect = this.canvas.getBoundingClientRect()
        can.canvasStyle.width = rect.width
        can.canvasStyle.height = rect.height

        let isFullscreen = this.isFullScreen()
        let fullScreenElement = this.fullScreenElement()
        if (!isFullscreen && !fullScreenElement /*&& !isStopScreen*/) {
            if (this.video.requestFullscreen) {
                this.targetEl.requestFullscreen()
            } else if (this.video.webkitRequestFullScreen) {
                this.targetEl.webkitRequestFullScreen()
            } else if (this.video.mozRequestFullScreen) {
                this.targetEl.mozRequestFullScreen()
            }  else if (this.video.msRequestFullscreen) {
                this.targetEl.msRequestFullscreen()
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
                this.video.requestPictureInPicture();
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
            if(this.targetEl && this.targetEl.classList.contains("toolbarContent_width")){
                this.targetEl.classList.remove("toolbarContent_width")
            }

        }else{
            if(toolbar && toolbar.firstElementChild && toolbar.firstElementChild.classList.contains("toolbar_button_hidden")){
                toolbar.firstElementChild.classList.remove("toolbar_button_hidden")
            }

            if(!(this.targetEl && this.targetEl.classList.contains("toolbarContent_width"))){
                this.targetEl.classList.add("toolbarContent_width")
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