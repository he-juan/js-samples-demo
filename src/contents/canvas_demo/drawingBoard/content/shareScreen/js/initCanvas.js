/********************************* canvas 工具栏 ***********************************/
let can

/**工具按钮**/
let toolbar = document.getElementsByClassName("toolbar")[0]
let dragBtn = document.getElementsByClassName("dragBtn")[0]
let pointerBtn = document.getElementsByClassName("pointerBtn")[0]
let brushBtn = document.getElementsByClassName("brushBtn")[0]
let textBtn = document.getElementsByClassName("textBtn")[0]
let shapeBtn = document.getElementsByClassName("shapeBtn")[0]
let noteBtn = document.getElementsByClassName("noteBtn")[0]
let eraserBtn = document.getElementsByClassName("eraserBtn")[0]
let areaDeleteBtn = document.getElementsByClassName("areaDeleteBtn")[0]
let clearBtn = document.getElementsByClassName("clearBtn")[0]
let revokeBtn = document.getElementsByClassName('revokeBtn')[0]
let restoreBtn = document.getElementsByClassName('restoreBtn')[0]
let settingsBtn = document.getElementsByClassName("settingsBtn")[0]

/**工具按钮配套子组件***/
let toolbarChild = document.getElementsByClassName("toolbarChild")[0]
let brushChild = document.getElementsByClassName("brushChild")[0]
let textChild = document.getElementsByClassName("textChild")[0]
let shapeChild = document.getElementsByClassName("shapeChild")[0]
let eraserChild = document.getElementsByClassName("eraserChild")[0]
let settingChild = document.getElementsByClassName("settingsChild")[0]


/** 设置按钮 **/
let text = document.getElementsByClassName("setting-status-text")[0]
let content = document.getElementsByClassName("setting-status-content")[0]
let other = document.getElementsByClassName("setting-display-other")[0]
let account = document.getElementsByClassName("setting-display-account")[0]
let isShowComment = true   // 是否显示其他成员的内容
let isShowAccount = true   // 是否显示其他成员的账户

/**工具栏监听事件**/
toolbar.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleParentClick(e)
}

/**子组件空地方被点击（隐藏子组件且设置zIndex）**/
toolbarChild.onclick = function(){
    setDefaultToolBarChild()
}

/**子工具栏监听事件***/
brushChild.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleChildClickOfBrush(e)
}
textChild.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleChildClickOfText(e)
}
shapeChild.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleLineStyleOfShape(e)
}
eraserChild.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleChildClickOfEraser(e)
}

/**设置监听事件**/
text.onclick = (e)=> {
    if(!isShowComment){
        isShowComment = true
        other.checked = true
        can.setShowComment(true)
    }else{
        isShowComment = false
        other.checked = false
        can.setShowComment(false)
    }
}

content.onclick = (e)=>{
    if(!isShowAccount){
        isShowAccount = true
        account.checked = true
        can.setShowAccount(true)
    }else{
        isShowAccount = false
        account.checked = false
        can.setShowAccount(false)
    }
}


/***隐藏子组件且设置zIndex**/
let setDefaultToolBarChild = function(){
    can.canvasToolsBar.setDefaultOfChild()
    if(toolbarChild.classList.contains('toolbarChild-zIndex')){
        toolbarChild.classList.remove('toolbarChild-zIndex')
    }
}

let CanvasToolsBar = function(){
    this.toolbarChild = document.getElementsByClassName("toolbarChild")[0]
    this.canvas = document.getElementsByClassName("canvas")[0]
    this.inputEarser = document.getElementById("rangeEarser")

    /*** 右侧色板 **/
    this.colorSelect = document.getElementsByClassName("colorSelect")[0]
    this.colorSelectContainer = document.getElementsByClassName('colorSelectContainer')[0]
    this.markColorBlock = false                     // 标记档期显示颜色块的点击状态

    /** canvas工具栏 **/
    this.drawToolbar = document.getElementsByClassName("drawToolbar")[0]

    /**主工具栏默认状态**/
    this.pointerFlag = false
    this.brushFlag = true
    this.textFlag = false
    this.noteFlag = false
    this.shapeFlag = false
    this.eraserFlag = false
    this.areaDeleteFlag = false
    this.clearFlag = false
    this.settingFlag = false

    /***子工具栏默认状态***/
    this.lineStyle = 'line'  //线条样式如： line、 arrow、 circleFlag、 rectFlag、 strokeRectFlag、 strokeCircleFlag
    this.color = getRandomColor()
    this.colorSelect.style.backgroundColor = this.color
    this.brushStrokeStyle = 'round'
    this.brushStrokeSize = '4'
    this.textFontSize = "16"
    this.eraserSize = "5"

    this.inputEarser.oninput = (e)=>{
        this.setEraserSize(e.target.value)
    }

    this.colorSelect.onclick = (e)=>{
        e.stopPropagation()
        /** 处理多次点击显示或者隐藏色块版 **/
        if(this.markColorBlock){
            this.markColorBlock = false
            this.colorSelectContainer.style.display = 'none'
        }else{
            this.colorSelectContainer.style.display = 'flex'
            this.markColorBlock = true
        }
    }

    this.colorSelectContainer.onclick = (e)=>{

        /**1.设置选中的颜色 2.点击后隐藏色块版 3.更改颜色色块为当前选中的颜色 4.改变当前针对canvas颜色色块的显示 ***/
        let element = e.target
        if(element.classList.contains('color-red')){
             this.setColor('#FE4737')
        }else if(element.classList.contains('color-yellow')){
            this.setColor('#FFE500')
        }else if(element.classList.contains('color-green')){
            this.setColor('#21D175')
        }else if(element.classList.contains('color-blue')){
            this.setColor('#3890FF')
        }else if(element.classList.contains('color-purple')){
            this.setColor('#A066FF')
        }else if(element.classList.contains('color-deepPurple')){
            this.setColor('#E2D0FF')
        }else if(element.classList.contains('color-cyan')){
            this.setColor('#24E8FF')
        }else if(element.classList.contains('color-orange')){
            this.setColor('#15ab87')
        }else if(element.classList.contains('color-white')){
            this.setColor('#FFFFFF')
        } else if(element.classList.contains('color-black')){
            this.setColor('#0c090c')
        }
        this.colorSelectContainer.style.display = 'none'
        this.colorSelect.style.backgroundColor = this.getColor()
        can.changeToolColor({account: localAccount, brushColor: this.getColor()})
    }

    this.setDefaultOfParent = function(data){
        /**父级工具栏**/
        if(pointerBtn){
            if(pointerBtn.firstElementChild.classList.contains("GRP-icon-laserPointer-blue")){
                pointerBtn.firstElementChild.classList.remove("GRP-icon-laserPointer-blue")
                pointerBtn.firstElementChild.classList.add("GRP-icon-laserPointer-white")
            }
        }

        if(brushBtn){
            if(brushBtn.firstElementChild.classList.contains("GRP-icon-brush-blue")){
                brushBtn.firstElementChild.classList.remove("GRP-icon-brush-blue")
                brushBtn.firstElementChild.classList.add("GRP-icon-brush-white")
            }
        }

        if(textBtn){
            if(textBtn.firstElementChild.classList.contains("GRP-icon-text-blue")){
                textBtn.firstElementChild.classList.remove("GRP-icon-text-blue")
                textBtn.firstElementChild.classList.add("GRP-icon-text-white")
            }
        }

        if(shapeBtn){
            if(shapeBtn.firstElementChild.classList.contains("GRP-icon-shape-blue")){
                shapeBtn.firstElementChild.classList.remove("GRP-icon-shape-blue")
                shapeBtn.firstElementChild.classList.add("GRP-icon-shape-white")
            }
        }

        if(noteBtn){
            if(noteBtn.firstElementChild.classList.contains("GRP-icon-stickyNote-blue")){
                noteBtn.firstElementChild.classList.remove("GRP-icon-stickyNote-blue")
                noteBtn.firstElementChild.classList.add("GRP-icon-stickyNote-white")
            }
        }

        if(eraserBtn){
            if(eraserBtn.firstElementChild.classList.contains("GRP-icon-eraser-blue")){
                eraserBtn.firstElementChild.classList.remove("GRP-icon-eraser-blue")
                eraserBtn.firstElementChild.classList.add("GRP-icon-eraser-white")
            }
        }

        if(revokeBtn){
            if(revokeBtn.firstElementChild.classList.contains("GRP-icon-revoke-blue")){
                revokeBtn.firstElementChild.classList.remove("GRP-icon-revoke-blue")
                revokeBtn.firstElementChild.classList.add("GRP-icon-revoke-white")
            }
        }

        if(restoreBtn){
            if(restoreBtn.firstElementChild.classList.contains("GRP-icon-restore-blue")){
                restoreBtn.firstElementChild.classList.remove("GRP-icon-restore-blue")
                restoreBtn.firstElementChild.classList.add("GRP-icon-restore-white")
            }
        }

        if(areaDeleteBtn){
            if(areaDeleteBtn.firstElementChild.classList.contains("GRP-icon-areaDelete-blue")){
                areaDeleteBtn.firstElementChild.classList.remove("GRP-icon-areaDelete-blue")
                areaDeleteBtn.firstElementChild.classList.add("GRP-icon-areaDelete-white")
            }
        }

        // if(clearBtn){
        //     if(clearBtn.firstElementChild.classList.contains("GRP-icon-clear-blue")){
        //         clearBtn.firstElementChild.classList.remove("GRP-icon-clear-blue")
        //         clearBtn.firstElementChild.classList.add("GRP-icon-clear-white")
        //     }
        // }

        if(settingsBtn){
            if(settingsBtn.firstElementChild.classList.contains("GRP-icon-settings-blue")){
                settingsBtn.firstElementChild.classList.remove("GRP-icon-settings-blue")
                settingsBtn.firstElementChild.classList.add("GRP-icon-settings-white")
            }
        }

        this.setDefaultOfChild()

        /***标记状态**/
        this.pointerFlag = false
        this.brushFlag = false
        this.textFlag = false
        this.shapeFlag = false
        this.noteFlag = false
        this.eraserFlag = false
        this.revokeFlag = false
        this.restoreFlag = false
        this.areaDeleteFlag = false
        this.clearFlag = false
        this.settingFlag = false

        this[data.flag] = true

        if(this.pointerFlag){
            this.canvas.style.cursor = 'none'
        }else if(this.brushFlag){
            this.canvas.style.cursor = 'url(./img/mouse_brush.png) 0 0, default'
        }else if(this.textFlag){
            this.canvas.style.cursor = 'url(./img/mouse_text.png) 0 0, default'
        }else if(this.shapeFlag){
            this.canvas.style.cursor = 'default'
        }else if(this.noteFlag){
            this.canvas.style.cursor = 'url(./img/mouse_note.png) 0 0, default'
        }else if(this.eraserFlag){
            this.canvas.style.cursor = 'none'
        }else if(this.areaDeleteFlag){
            this.canvas.style.cursor = 'url(./img/mouse_area.png) 0 0, default'
        }else if(this.clearFlag || this.settingFlag || this.revokeFlag || this.restoreFlag){
            this.canvas.style.cursor = 'default'
        }
    }

    this.getCurrentSelectedTool = function(){
        let toolArray = [
            'pointerFlag', 'brushFlag', 'textFlag', 'shapeFlag','noteFlag',
            'eraserFlag', 'restoreFlag','clearFlag','areaDeleteFlag', 'revokeFlag',
        ]

        return toolArray.find((item)=> {
            if(this[item]) return item
        })
    }

    this.setDefaultOfChild = function(){
        /**子级工具栏***/
        if(brushChild && brushChild.classList.contains('toolbarChild_child_show')){
            brushChild && brushChild.classList.remove('toolbarChild_child_show')
        }

        if(textChild && textChild.classList.contains('toolbarChild_child_show')){
            textChild && textChild.classList.remove('toolbarChild_child_show')
        }

        if(shapeChild && shapeChild.classList.contains('toolbarChild_child_show')){
            shapeChild && shapeChild.classList.remove('toolbarChild_child_show')
        }

        if(eraserChild && eraserChild.classList.contains('toolbarChild_child_show')){
            eraserChild && eraserChild.classList.remove('toolbarChild_child_show')
        }

        if(settingChild && settingChild.classList.contains('toolbarChild_child_show')){
            settingChild && settingChild.classList.remove('toolbarChild_child_show')
        }
    }

    this.checkedSetBackgroundColor = function(element, children=[]){
        /**设置当前元素选中状态***/
        if(!children.length){
            let parent = element.parentElement
            parent.classList.add('btn-active')
        }else{
            element.classList.add('btn-active')
        }
    }

    this.setLineStyle = function(style){
        this.lineStyle = style
    }

    this.setColor = function(color){
        this.color = color
        can.changeToolColor({account: localAccount, color: this.color})
    }

    this.setBrushStrokeSize = function(size){
        this.brushStrokeSize = size

    }
    this.setBrushStrokeStyle = function(style){
        this.brushStrokeStyle = style
    }
    this.setTextFontSize = function(size){
        this.textFontSize = size
    }

    this.setEraserSize = function(size){
        this.eraserSize = size
    }

    this.getTextFontSize = function(){
        return this.textFontSize
    }

    this.getColor = function(){
        return this.color
    }
    this.getBrushStrokeSize = function(){
        return this.brushStrokeSize
    }

    this.getBrushStrokeStyle = function(){
        return this.brushStrokeStyle
    }

    this.getEraserSize = function(){
        return this.eraserSize
    }

    this.getTextFontSize = function(){
        return this.textFontSize
    }

    this.getLineStyle = function(){
        return this.lineStyle
    }

    this.getCurrentStyle = function(){
        return {
            brushStrokeSize: this.getBrushStrokeSize(),
            brushStrokeStyle: this.getBrushStrokeStyle(),
            textFontSize: this.getTextFontSize(),
            eraserSize: this.getEraserSize(),
            lineStyle: this.getLineStyle(),
            color: this.getColor(),
        }
    }
    this.changeToolBarStyle = function(data){
        this.setDefaultOfParent({flag: data.flag})

        /** 针对存在子组件：添加子组件的类名zIndex**/
        let settingsView = ['brush', 'text', 'shape',  'eraser', 'settings']
        settingsView.forEach(function(item){
            if(data.type === item){
                if(!toolbarChild.classList.contains('toolbarChild-zIndex')){
                    toolbarChild.classList.add('toolbarChild-zIndex')
                    return
                }
            }
        })

        /** 针对不存在子组件：删除子组件的类名zIndex**/
        let settingsName = ['pointer', 'note','revoke', 'restore','areaDelete', 'clear']
        settingsName.forEach(function(item){
            if(data.type === item){
                if(toolbarChild.classList.contains('toolbarChild-zIndex')){
                    toolbarChild.classList.remove('toolbarChild-zIndex')
                    return
                }
            }
        })


        /***更改子组件的样式***/
        switch(data.type){
            case 'pointer':
                if(pointerBtn.firstElementChild.classList.contains("GRP-icon-laserPointer-white")){
                    pointerBtn.firstElementChild.classList.remove("GRP-icon-laserPointer-white")
                    pointerBtn.firstElementChild.classList.add("GRP-icon-laserPointer-blue")
                }
                break
            case 'brush':
                if(brushBtn.firstElementChild.classList.contains("GRP-icon-brush-white")){
                    brushBtn.firstElementChild.classList.remove("GRP-icon-brush-white")
                    brushBtn.firstElementChild.classList.add("GRP-icon-brush-blue")
                }
                if(!data.from){
                    if(!(brushChild && brushChild.classList.contains('toolbarChild_child_show'))){
                        brushChild && brushChild.classList.add('toolbarChild_child_show')
                    }
                }

                break
            case 'text':
                if(textBtn.firstElementChild.classList.contains("GRP-icon-text-white")){
                    textBtn.firstElementChild.classList.remove("GRP-icon-text-white")
                    textBtn.firstElementChild.classList.add("GRP-icon-text-blue")
                }
                if( !(textChild && textChild.classList.contains('toolbarChild_child_show')) ){
                    textChild.classList.add('toolbarChild_child_show')
                }
                break
            case 'shape':
                if(shapeBtn.firstElementChild.classList.contains("GRP-icon-shape-white")){
                    shapeBtn.firstElementChild.classList.remove("GRP-icon-shape-white")
                    shapeBtn.firstElementChild.classList.add("GRP-icon-shape-blue")
                }
                if(!(shapeChild && shapeChild.classList.contains('toolbarChild_child_show'))){
                    shapeChild && shapeChild.classList.add('toolbarChild_child_show')
                }
                break
            case 'note':
                if(noteBtn.firstElementChild.classList.contains("GRP-icon-stickyNote-white")){
                    noteBtn.firstElementChild.classList.remove("GRP-icon-stickyNote-white")
                    noteBtn.firstElementChild.classList.add("GRP-icon-stickyNote-blue")
                }
                break
            case 'eraser':
                if(eraserBtn.firstElementChild.classList.contains("GRP-icon-eraser-white")){
                    eraserBtn.firstElementChild.classList.remove("GRP-icon-eraser-white")
                    eraserBtn.firstElementChild.classList.add("GRP-icon-eraser-blue")
                }
                if( !(eraserChild && eraserChild.classList.contains('toolbarChild_child_show')) ){
                    eraserChild.classList.add('toolbarChild_child_show')
                }
                break
            case 'revoke':
                if(revokeBtn.firstElementChild.classList.contains("GRP-icon-revoke-white")){
                    revokeBtn.firstElementChild.classList.remove("GRP-icon-revoke-white")
                    revokeBtn.firstElementChild.classList.add("GRP-icon-revoke-blue")
                }
                can.handleRevokeDraw()

                break
            case 'restore':
                if(restoreBtn.firstElementChild.classList.contains("GRP-icon-restore-white")){
                    restoreBtn.firstElementChild.classList.remove("GRP-icon-restore-white")
                    restoreBtn.firstElementChild.classList.add("GRP-icon-restore-blue")
                }
                can.handleRestoreDraw()

                break
            case 'areaDelete':
                if(areaDeleteBtn.firstElementChild.classList.contains("GRP-icon-areaDelete-white")){
                    areaDeleteBtn.firstElementChild.classList.remove("GRP-icon-areaDelete-white")
                    areaDeleteBtn.firstElementChild.classList.add("GRP-icon-areaDelete-blue")
                }
                break
            case 'clear':
                can.clearCanvas()
                can.notes = []
                can.texts = []
                this.changeToolBarStyle({ flag:'brushFlag', type: 'brush',  from: 'clear'})

                /**告知对端清除全部内容**/
                handleContentForRemote({type: 'allDelete', canvas: can.canvas})

                break
            case 'settings':
                if(settingsBtn.firstElementChild.classList.contains("GRP-icon-settings-white")) {
                    settingsBtn.firstElementChild.classList.remove("GRP-icon-settings-white")
                    settingsBtn.firstElementChild.classList.add("GRP-icon-settings-blue")
                }
                if(!(settingChild && settingChild.classList.contains('toolbarChild_child_show')) ){
                    settingChild.classList.add('toolbarChild_child_show')
                }
                break
            default:
                console.log("e:",data.type)
        }
    }
    this.handleParentClick = (e)=>{
        let element = e.target
        const {left, top} = this.drawToolbar.getBoundingClientRect()
        let startX = e.clientX - left     // 记录鼠标起始位置x
        let startY = e.clientY - top      // 记录鼠标起始位置y

        /**得到当前点击是哪个组件，并显示子组件**/
        if(element.classList.value.indexOf("GRP-icon-drag") !== -1){
            this.setDefaultOfChild()
        }else if(element.classList.value.indexOf("GRP-icon-laserPointer") !== -1){
            this.changeToolBarStyle({ flag:'pointerFlag', type: 'pointer'})
        }else if(element.classList.value.indexOf("GRP-icon-brush") !== -1){
            this.changeToolBarStyle({ flag: 'brushFlag', type: 'brush' } )
        }else if(element.classList.value.indexOf("GRP-icon-text") !== -1){
            this.changeToolBarStyle({ flag: 'textFlag', type: 'text' })
        }else if(element.classList.value.indexOf("GRP-icon-shape") !== -1){
            this.changeToolBarStyle({ flag:'shapeFlag', type: 'shape' })
        }else if(element.classList.value.indexOf("GRP-icon-stickyNote") !== -1){
            this.changeToolBarStyle({ flag: 'noteFlag', type: 'note' })
        }else if(element.classList.value.indexOf("GRP-icon-eraser") !== -1){
            this.changeToolBarStyle({ flag: 'eraserFlag', type: 'eraser' })
        }else if(element.classList.value.indexOf("GRP-icon-areaDelete") !== -1){
            this.changeToolBarStyle({flag: 'areaDeleteFlag',  type: 'areaDelete'})
            can.handleSelectionArea()
        }else if(element.classList.value.indexOf("GRP-icon-clear") !== -1){
            this.changeToolBarStyle({type: 'clear'})
        }else if(element.classList.value.indexOf("GRP-icon-revoke") !== -1){
            this.changeToolBarStyle({flag: 'revokeFlag', type: 'revoke'})
        }else if(element.classList.value.indexOf("GRP-icon-restore") !== -1){
            this.changeToolBarStyle({flag: 'restoreFlag', type: 'restore'})
        }else if(element.classList.value.indexOf("GRP-icon-settings") !== -1){
            this.changeToolBarStyle({type: 'settings'})
        }
        this.updateChildToolsPosition(startX)
    }


    this.updateChildToolsPosition = function(data){
        this.toolbarChild.style.left = data + 'px'
    }

    this.handleChildClickOfBrush = function(e){
        let element = e.target
        let children = element.children

        if(element.classList.contains('brushStrokesStyle')) {
            /** 1.清除之前画笔选中笔刷样式状态   2.为选中的笔刷样式添加背景样式***/
            let brushStrokesStyle = document.getElementsByClassName ("brushStrokesStyle")
            if (brushStrokesStyle.length) {
                for (let i = 0; i < brushStrokesStyle.length; i ++) {
                    let child = brushStrokesStyle[i]
                    if (child.classList.contains ('btn-active')) {
                        child.classList.remove ("btn-active")
                    }
                    if (i === brushStrokesStyle.length - 1) {
                        /**设置当前选中的样式**/
                        this.checkedSetBackgroundColor (element, children)
                    }
                }
            }

            /**针对画笔笔触设置**/
            if(element.classList.contains("strokes-round")){
                this.setBrushStrokeStyle('round')
            }else if(element.classList.contains("strokes-wide")){
                this.setBrushStrokeStyle('wide')
            }else if(element.classList.contains("strokes-pen")){
                this.setBrushStrokeStyle('pen')
            }
        }

        if(element.classList.contains('brushFontStyle')){
            let brushChildContent = document.getElementsByClassName("brushFontStyle")
            /**1.清除之前画笔选中粗细样式状态  2.为选中的画笔粗细添加背景样式***/
            if(brushChildContent.length){
                for(let i =0; i < brushChildContent.length; i++){
                    let child = brushChildContent[i]
                        if(child.classList.contains('btn-active')){
                            child.classList.remove("btn-active")
                    }
                    if(i === brushChildContent.length -1) {
                        /**设置当前选中的样式**/
                        this.checkedSetBackgroundColor (element, children)
                    }
                }
            }
            /**针对笔触大小设置**/
            if(element.classList.contains("brush-font-thin")){
                this.setBrushStrokeSize('1')
            }else if(element.classList.contains("brush-font-middle")){
                this.setBrushStrokeSize('4')
            }else if(element.classList.contains("brush-font-crude")){
                this.setBrushStrokeSize('8')
            }
        }
    }

    this.handleChildClickOfText = function(e){
        let element = e.target
        let children = element.children

        if(element.classList.contains('textFontStyle')){
            /**1.清除之前文本选中文字大小样式状态  2.为选中文字大小添加背景样式***/
            let textFontStyle = document.getElementsByClassName("textFontStyle")
            if(textFontStyle.length){
                for(let i= 0; i < textFontStyle.length; i++){
                    let child = textFontStyle[i]
                    if(child.classList.contains('btn-active')){
                        child.classList.remove("btn-active")
                    }
                    if(i === textFontStyle.length -1){
                        /**设置当前选中文字大小样式**/
                        this.checkedSetBackgroundColor(element, children)
                    }
                }
            }

            /**设置文字大小**/
            if(element.classList.contains("text-font-small")){
                this.setTextFontSize('12')
            }else if(element.classList.contains("text-font-middle")){
                this.setTextFontSize('16')
            }else if(element.classList.contains("text-font-big")){
                this.setTextFontSize('24')
            }
        }
    }

    this.handleLineStyleOfShape = function(e){
        let element = e.target
        let children = element.children

        if(element.classList.contains('shapeStyle')){
            /**子组件的组件（多个）**/
            let shapeStyle = document.getElementsByClassName("shapeStyle")

            /***1.清除之前选中的状态  2.设置选中的线条的样式**/
            if(shapeStyle.length) {
                for (let i = 0; i < shapeStyle.length; i ++) {
                    let elem = shapeStyle[i]
                    if (elem.classList.contains('btn-active')) {
                        elem.classList.remove("btn-active")
                    }
                    if(i === shapeStyle.length -1){
                        /**设置当前选中线条样式状态**/
                        this.checkedSetBackgroundColor(element, children)
                    }
                }
            }

            /**设置线条样式**/
            if(element.classList.contains('shape-style-line')){
                this.setLineStyle('line')
            }else if(element.classList.contains('shape-style-arrow')){
                this.setLineStyle('arrow')
            }else if(element.classList.contains('shape-style-circle')){
                this.setLineStyle('strokeCircle')
            }else if(element.classList.contains('shape-style-squareShape')){
                this.setLineStyle('strokeRect')
            }
        }

    }
    this.handleChildClickOfEraser = function(e){
        let This = this
        let element = e.target
        /**选中橡皮擦大小**/
        element.oninput = function(){
            This.setEraserSize(element.value)
        }
    }
}

/**随机生成颜色**/
function getRandomColor () {
    let r = Math.floor(Math.random()*255);
    let g = Math.floor(Math.random()*255);
    let b = Math.floor(Math.random()*255);
    let color = 'rgb('+ r +','+ g +','+ b +')';
    return color
}
/**
 * 处理发送当前内容给远端
 * @param param
 * **/
function handleContentForRemote(param){
    let content = param
    if(window.gsRTC && window.gsRTC.webrtcSessions  && window.gsRTC?.webrtcSessions.length){
        for(let session of window.gsRTC.webrtcSessions){
            if(session.isSuccessUseWebsocket){
                content.lineContent = {local: session.lineId, remote: session.remoteLineId}
                content.account = {id: session.account?.id, name: session.account?.name}
                sendCurrentMousePosition(content)
            }
        }
    }
}



/** 发送当前鼠标显示位置
 * */
function sendCurrentMousePosition(data){
    if(!data || !data.lineContent || !data.lineContent.local || !data.account || !data.account.id) {
        console.log("setCurrentMousePosition  invalid")
        return
    }

    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: data.lineContent.local})
    if(!session){
        console.log("setCurrentMousePosition: session is not found")
        return
    }
    session.sendMessageByDataChannel(data)
}


/******************** 鼠标样式处理 ****************************/
let mouseStyle = document.getElementsByClassName("mouseStyle")[0]
function changeMouseStyle(x, y){
    if(!can) return
    if(can.canvasToolsBar.pointerFlag){
        mouseStyle.style.width = 6 + 'px'
        mouseStyle.style.height = 6 + 'px'
        mouseStyle.style.left = x + 'px'
        mouseStyle.style.top = y  + 'px'
        mouseStyle.style.boxShadow = `0 0 6px 3px ${can.canvasToolsBar.getColor()}`
        mouseStyle.style.display = "block";
    }else if(can.canvasToolsBar.eraserFlag){
        let mouseRadius =  can.canvasToolsBar.eraserSize
        mouseStyle.style.width = Number(mouseRadius) * 10 * can.canvasStyleRatio.x + 'px'
        mouseStyle.style.height = Number(mouseRadius) * 10 * can.canvasStyleRatio.y + 'px'
        mouseStyle.style.left = x - 5 * mouseRadius  * can.canvasStyleRatio.x + 'px'
        mouseStyle.style.top = y - 5 * mouseRadius * can.canvasStyleRatio.y + 'px'
        mouseStyle.style.boxShadow = `0 0 8px 0 #00000033`
        mouseStyle.style.display = "block";
    }
}


/***************************************************************全屏********************************************************************/

let fullScreenParam ={
    clickEl: document.getElementsByClassName("dragBtn")[0],
    targetEl: document.getElementsByClassName("presentVideoContainer")[0],
    videoElement: document.getElementsByClassName("presentVideo")[0],
    canvasToolBar: document.getElementsByClassName("canvasToolBar")[0],
    toolBarContent: document.getElementsByClassName("toolbarContent")[0],
    toolbar: document.getElementsByClassName("toolbar")[0],
    clickElement: document.getElementsByClassName("hoverState")[0],
    canvas:document.getElementsByClassName("canvas")[0],
    isLoading: true
}

let dragParam = {
    clickEl: dragBtn,
    targetEl: document.getElementsByClassName("canvasToolBar")[0],
    limitMoveBorder: true,
    moveMode: 'position',
    mainToolbar: document.getElementsByClassName("toolbar")[0],
    subToolbar:  document.getElementsByClassName("toolbarChild")[0],
    deployToolbar: document.getElementsByClassName("drawToolbar")[0],
    direction: 'upOrDown',
    tool: 'canvasTool'
}

/**当页面加载解析完成**/
can = new CanvasExample({
    canvas: document.getElementsByClassName("canvas")[0],
    videoElement: document.getElementsByClassName("presentVideo")[0],
    videoWrapper: document.getElementsByClassName("videoWrapper")[0],
    toolParam: fullScreenParam,
    dragParam: dragParam
})

// let moveColor= new DragMoveModel({
//     clickEl: document.getElementsByClassName("colorContent")[0],
//     targetEl: document.getElementsByClassName("colorContent")[0],
//     limitMoveBorder: true,
//     moveMode: 'position',
//     mainToolbar: document.getElementsByClassName("colorContent")[0],
//     subToolbar:  document.getElementsByClassName("colorSelectContainer")[0],
//     direction: 'leftOrRight'
// })
//
//
// let moveFunction= new DragMoveModel({
//     clickEl: document.getElementsByClassName("displayBtn")[0],
//     targetEl: document.getElementsByClassName("shareBtnContainer")[0],
//     deployToolbar: document.getElementsByClassName("functionBtn")[0],
//     limitMoveBorder: true,
//     moveMode: 'position',
//     tool: 'functionBtn'
// })

