/********************************* canvas 工具栏 ***********************************/
let can

/**工具按钮**/
let toolbar = document.getElementsByClassName("toolbar")[0]
let dragBtn = document.getElementsByClassName("dragBtn")[0]
let defaultMouseBtn = document.getElementsByClassName("mouseBtn")[0]
let pointerBtn = document.getElementsByClassName("pointerBtn")[0]
let brushBtn = document.getElementsByClassName("brushBtn")[0]
let textBtn = document.getElementsByClassName("textBtn")[0]
let noteBtn = document.getElementsByClassName("noteBtn")[0]
let eraserBtn = document.getElementsByClassName("eraserBtn")[0]
let areaDeleteBtn = document.getElementsByClassName("areaDeleteBtn")[0]
let clearBtn = document.getElementsByClassName("clearBtn")[0]
let settingsBtn = document.getElementsByClassName("settingsBtn")[0]

/**工具按钮配套子组件***/
let toolbarChild = document.getElementsByClassName("toolbarChild")[0]
let pointerChild = document.getElementsByClassName("pointerChild")[0]
let brushChild = document.getElementsByClassName("brushChild")[0]
let textChild = document.getElementsByClassName("textChild")[0]
let noteChild = document.getElementsByClassName("noteChild")[0]
let eraserChild = document.getElementsByClassName("eraserChild")[0]
let settingChild = document.getElementsByClassName("settingsChild")[0]


/** 设置按钮 **/
let text = document.getElementsByClassName("setting-status-text")[0]
let content = document.getElementsByClassName("setting-status-content")[0]
let other = document.getElementsByClassName("setting-display-other")[0]
let account = document.getElementsByClassName("setting-display-account")[0]
let isShowComment = true   // 是否显示其他成员的内容
let isShowAccount = true   // 是否显示其他成员的账户

/**子组件空地方被点击（隐藏子组件且设置zIndex）**/
toolbarChild.onclick = function(){
    setDefaultToolBarChild()
}

/**工具栏监听事件**/
let tool_bar = document.getElementsByClassName("toolbar")[0]
tool_bar.onclick = function(e){
    can.canvasToolsBar.handleParentClick(e)
}

/**子工具栏监听事件***/
pointerChild.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleChildClickOfPointer(e)
}
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
noteChild.onclick = function(e){
    e.preventDefault();
    e.stopPropagation();
    can.canvasToolsBar.handleChildClickOfNote(e)
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
    this.canvas = document.getElementsByClassName("canvas")[0]
    this.inputEarser = document.getElementById("rangeEarser")

    /**主工具栏默认状态**/
    this.mouseFlag = true
    this.pointerFlag = false
    this.brushFlag = false
    this.textFlag = false
    this.noteFlag = false
    this.eraserFlag = false
    this.areaDeleteFlag = false
    this.clearFlag = false
    this.settingFlag = false

    /***子工具栏默认状态***/
    this.pointerColor = '#FE4737'
    this.brushColor = getRandomColor()
    this.brushStrokeSize = '4'
    this.textColor = "#FE4737"
    this.textFontSize = "16px"
    this.noteColor = "#F9EC96"
    this.eraserSize = "5"

    this.inputEarser.oninput = (e)=>{
        this.setEraserSize(e.target.value)
    }

    this.setDefaultOfParent = function(flag){
        /**父级工具栏**/
        if(defaultMouseBtn.firstElementChild.classList.contains("GRP-icon-mouse-blue")){
            defaultMouseBtn.firstElementChild.classList.remove("GRP-icon-mouse-blue")
            defaultMouseBtn.firstElementChild.classList.add("GRP-icon-mouse-white")
        }

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
        this.mouseFlag = false
        this.pointerFlag = false
        this.brushFlag = false
        this.textFlag = false
        this.noteFlag = false
        this.eraserFlag = false
        this.areaDeleteFlag = false
        this.clearFlag = false
        this.settingFlag = false

        this[flag] = true

        if(this.mouseFlag){
            this.canvas.style.cursor = 'default'
        }else if(this.pointerFlag){
            this.canvas.style.cursor = 'none'
        }else if(this.brushFlag){
            this.canvas.style.cursor = 'url(./img/mouse_brush.png) 0 0, default'
        }else if(this.textFlag){
            this.canvas.style.cursor = 'url(./img/mouse_text.png) 0 0, default'
        }else if(this.noteFlag){
            this.canvas.style.cursor = 'url(./img/mouse_note.png) 0 0, default'
        }else if(this.eraserFlag){
            this.canvas.style.cursor = 'none'
        }else if(this.areaDeleteFlag){
            this.canvas.style.cursor = 'url(./img/mouse_area.png) 0 0, default'
        }else if(this.clearFlag || this.settingFlag){
            this.canvas.style.cursor = 'default'
        }
    }

    this.getCurrentSelectedTool = function(){
        let toolArray = ['mouseFlag', 'pointerFlag', 'brushFlag', 'textFlag', 'noteFlag', 'eraserFlag', 'areaDeleteFlag', 'clearFlag']
        let content = toolArray.find((item)=>{
            if(this[item]) return item
        })
        return content
    }

    this.setDefaultOfChild = function(){
        /**子级工具栏***/
        if(pointerChild && pointerChild.classList.contains('toolbarChild_child_show')){
            pointerChild && pointerChild.classList.remove('toolbarChild_child_show')
        }

        if(brushChild && brushChild.classList.contains('toolbarChild_child_show')){
            brushChild && brushChild.classList.remove('toolbarChild_child_show')
        }

        if(textChild && textChild.classList.contains('toolbarChild_child_show')){
            textChild && textChild.classList.remove('toolbarChild_child_show')
        }

        if(noteChild && noteChild.classList.contains('toolbarChild_child_show')){
            noteChild && noteChild.classList.remove('toolbarChild_child_show')
        }

        if(eraserChild && eraserChild.classList.contains('toolbarChild_child_show')){
            eraserChild && eraserChild.classList.remove('toolbarChild_child_show')
        }

        if(settingChild && settingChild.classList.contains('toolbarChild_child_show')){
            settingChild && settingChild.classList.remove('toolbarChild_child_show')
        }
    }
    this.setBackgroundColor = function(element, children=[]){
        /**设置当前元素选中状态***/
        if(!children.length){
            let parent = element.parentElement
            parent.classList.add('childWrapper-bg')
        }else{
            element.classList.add('childWrapper-bg')
        }
    }
    this.setPointerColor = function(color){
        this.pointerColor = color
    }
    this.setBrushColor = function(color){
        this.brushColor = color
        can.changeToolColor({account: localAccount, brushColor: this.brushColor})
    }
    this.setBrushStrokeSize = function(size){
        this.brushStrokeSize = size

    }
    this.setTextColor = function(color){
        this.textColor = color
    }
    this.setTextFontSize = function(size){
        this.textFontSize = size
    }
    this.setNoteColor = function(color){
        this.noteColor = color
    }
    this.setEraserSize = function(size){
        this.eraserSize = size
    }

    this.getBrushColor = function(){
        return this.brushColor
    }

    this.changeToolBarStyle = function(data){
        this.setDefaultOfParent(data && data.flag)

        /** 针对存在子组件：添加子组件的类名zIndex**/
        let settingsView = ['pointer', 'brush', 'text', 'note', 'eraser', 'settings']
        settingsView.forEach(function(item){
            if(data.type === item){
                if(!toolbarChild.classList.contains('toolbarChild-zIndex')){
                    toolbarChild.classList.add('toolbarChild-zIndex')
                    return
                }
            }
        })

        /** 针对不存在子组件：删除子组件的类名zIndex**/
        let settingsName = ['defaultMouse', 'areaDelete', 'clear']
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
            case 'defaultMouse':
                if(defaultMouseBtn.firstElementChild.classList.contains("GRP-icon-mouse-white")){
                    defaultMouseBtn.firstElementChild.classList.remove("GRP-icon-mouse-white")
                    defaultMouseBtn.firstElementChild.classList.add("GRP-icon-mouse-blue")
                }
                break
            case 'pointer':
                if(pointerBtn.firstElementChild.classList.contains("GRP-icon-laserPointer-white")){
                    pointerBtn.firstElementChild.classList.remove("GRP-icon-laserPointer-white")
                    pointerBtn.firstElementChild.classList.add("GRP-icon-laserPointer-blue")
                }
                if(!(pointerChild && pointerChild.classList.contains('toolbarChild_child_show'))){
                    pointerChild && pointerChild.classList.add('toolbarChild_child_show')
                }
                break
            case 'brush':
                if(brushBtn.firstElementChild.classList.contains("GRP-icon-brush-white")){
                    brushBtn.firstElementChild.classList.remove("GRP-icon-brush-white")
                    brushBtn.firstElementChild.classList.add("GRP-icon-brush-blue")
                }
                if(!(brushChild && brushChild.classList.contains('toolbarChild_child_show'))){
                    brushChild && brushChild.classList.add('toolbarChild_child_show')
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
            case 'note':
                if(noteBtn.firstElementChild.classList.contains("GRP-icon-stickyNote-white")){
                    noteBtn.firstElementChild.classList.remove("GRP-icon-stickyNote-white")
                    noteBtn.firstElementChild.classList.add("GRP-icon-stickyNote-blue")
                }
                if( !(noteChild && noteChild.classList.contains('toolbarChild_child_show')) ){
                    noteChild.classList.add('toolbarChild_child_show')
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
            case 'areaDelete':
                if(areaDeleteBtn.firstElementChild.classList.contains("GRP-icon-areaDelete-white")){
                    areaDeleteBtn.firstElementChild.classList.remove("GRP-icon-areaDelete-white")
                    areaDeleteBtn.firstElementChild.classList.add("GRP-icon-areaDelete-blue")
                }
                break
            case 'clear':
                can.clearCanvas()
                can.canvasToolsBar.changeToolBarStyle({ flag:'mouseFlag', type: 'defaultMouse' })
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
    this.handleParentClick = function(e){
       let element = e.target
        /**得到当前点击是哪个组件，并显示子组件**/
        if(element.classList.value.indexOf("GRP-icon-mouse") !== -1){
            this.changeToolBarStyle({ flag:'mouseFlag', type: 'defaultMouse' })
        }else if(element.classList.value.indexOf("GRP-icon-laserPointer") !== -1){
            this.changeToolBarStyle({ flag:'pointerFlag', type: 'pointer'})
       }else if(element.classList.value.indexOf("GRP-icon-brush") !== -1){
            this.changeToolBarStyle({ flag: 'brushFlag', type: 'brush' } )
       }else if(element.classList.value.indexOf("GRP-icon-text") !== -1){
            this.changeToolBarStyle({ flag: 'textFlag', type: 'text' })
       }else if(element.classList.value.indexOf("GRP-icon-stickyNote") !== -1){
            this.changeToolBarStyle({ flag: 'noteFlag', type: 'note' })
       }else if(element.classList.value.indexOf("GRP-icon-eraser") !== -1){
            this.changeToolBarStyle({ flag: 'eraserFlag', type: 'eraser' })
       }else if(element.classList.value.indexOf("GRP-icon-areaDelete") !== -1){
            this.changeToolBarStyle({flag: 'areaDeleteFlag',  type: 'areaDelete'})
            can.handleSelectionArea()
       }else if(element.classList.value.indexOf("GRP-icon-clear") !== -1){
            this.changeToolBarStyle({type: 'clear'})
       }else if(element.classList.value.indexOf("GRP-icon-settings") !== -1){
            this.changeToolBarStyle({type: 'settings'})
       }
    }
    this.handleChildClickOfPointer = function(e){
        let element = e.target
        if(element.classList.contains('pointerChild')){
            return
        }
        let childNodes = element.childNodes
        /**子组件的组件（多个）**/
        let pointerChildWrapper = document.getElementsByClassName("pointerChildWrapper")

        /***清除之前选中的状态**/
        if(pointerChildWrapper.length){
            for(let i =0; i < pointerChildWrapper.length; i++){
                let child = pointerChildWrapper[i]
                if(child.classList.contains('childWrapper-bg')){
                    child.classList.remove("childWrapper-bg")
                }
            }
        }

        /**设置选中元素的样式**/
        this.setBackgroundColor(element,childNodes)

        /**获取当前颜色**/
        if(element.classList.value.indexOf("pointerBtn-red") !== -1){
            this.setPointerColor('#FE4737')
        }else if(element.classList.value.indexOf("pointerBtn-yellow") !== -1){
            this.setPointerColor('#FFE500')
        }else if(element.classList.value.indexOf("pointerBtn-green") !== -1){
            this.setPointerColor('#21D175')
        }else if(element.classList.value.indexOf("pointerBtn-blue") !== -1){
            this.setPointerColor('#3890FF')
        }else if(element.classList.value.indexOf("pointerBtn-purple") !== -1){
            this.setPointerColor('#A066FF')
        }
    }
    this.handleChildClickOfBrush = function(e){
        let element = e.target
        let children = element.children
        if(element.classList.contains("brushChildColor-Wrapper") || element.classList.contains("brushChildFontContent")){
            return
        }
        /**清除之前选中的状态***/
        let colorWrapper = document.getElementsByClassName("brushColorWrapper")
        let brushChildContent = document.getElementsByClassName("brush-font")
        if(colorWrapper.length && element.classList.value.indexOf('brushBtn') !== -1){
            for(let i =0; i < colorWrapper.length; i++){
                let child = colorWrapper[i]
                if(child.classList.contains('childWrapper-bg')){
                    child.classList.remove("childWrapper-bg")
                }
                if(i === colorWrapper.length -1){
                    /**设置当前选中的样式**/
                    this.setBackgroundColor(element, children)
                }
            }
        }
        if(brushChildContent.length && element.classList.value.indexOf('brush-font') !== -1){
            for(let i =0; i < brushChildContent.length; i++){
                let child = brushChildContent[i]
                if(child.classList.contains('childWrapper-bg')){
                    child.classList.remove("childWrapper-bg")
                }
                if(i === brushChildContent.length -1){
                    /**设置当前选中的样式**/
                    this.setBackgroundColor(element, children)
                }
            }
        }


        /**针对颜色处理**/
        if(element.classList.value.indexOf("brushBtn-black") !== -1){
            this.setBrushColor('#000000')
        }else if(element.classList.value.indexOf("brushBtn-white") !== -1){
            this.setBrushColor('#FFFFFF')
        }else if(element.classList.value.indexOf("brushBtn-gray") !== -1){
            this.setBrushColor('#888888')
        }else if(element.classList.value.indexOf("brushBtn-red") !== -1){
            this.setBrushColor('#FE4737')
        }else if(element.classList.value.indexOf("brushBtn-orange") !== -1){
            this.setBrushColor('#FF9F00')
        }
        else if(element.classList.value.indexOf("brushBtn-yellow") !== -1){
            this.setBrushColor('#FFE500')
        }else if(element.classList.value.indexOf("brushBtn-green") !== -1){
            this.setBrushColor('#21D175')
        }else if(element.classList.value.indexOf("brushBtn-cyan") !== -1){
            this.setBrushColor('#24E8FF')
        }else if(element.classList.value.indexOf("brushBtn-blue") !== -1){
            this.setBrushColor('#3890FF')
        }else if(element.classList.value.indexOf("brushBtn-purple") !== -1){
            this.setBrushColor('#A066FF')
        }
        /**针对大小处理**/
        if(element.classList.value.indexOf("brush-font-small") !== -1){
            this.setBrushStrokeSize('1')
        }else if(element.classList.value.indexOf("brush-font-middle") !== -1){
            this.setBrushStrokeSize('4')
        }else if(element.classList.value.indexOf("brush-font-big") !== -1){
            this.setBrushStrokeSize('8')
        }
    }
    this.handleChildClickOfText = function(e){
        let element = e.target
        let children = element.children
        if(element.classList.contains("textChildColor-Wrapper") || element.classList.contains("textChildFontContent")){
            return
        }
        /**清除之前选中的状态***/
        let colorWrapper = document.getElementsByClassName("textColorWrapper")
        let brushChildContent = document.getElementsByClassName("text-font")
        if(colorWrapper.length && element.classList.value.indexOf('textBtn') !== -1){
            for(let i =0; i < colorWrapper.length; i++){
                let child = colorWrapper[i]
                if(child.classList.contains('childWrapper-bg')){
                    child.classList.remove("childWrapper-bg")
                }
                if(i === colorWrapper.length -1){
                    /**设置当前选中的样式**/
                    this.setBackgroundColor(element, children)
                }
            }
        }
        if(brushChildContent.length && element.classList.value.indexOf('text-font') !== -1){
            for(let i =0; i < brushChildContent.length; i++){
                let child = brushChildContent[i]
                if(child.classList.contains('childWrapper-bg')){
                    child.classList.remove("childWrapper-bg")
                }
                if(i === brushChildContent.length -1){
                    /**设置当前选中的样式**/
                    this.setBackgroundColor(element, children)
                }
            }
        }


        /**针对颜色处理**/
        if(element.classList.value.indexOf("textBtn-black") !== -1){
            this.setTextColor('#000000')
        }else if(element.classList.value.indexOf("textBtn-white") !== -1){
            this.setTextColor('#FFFFFF')
        }else if(element.classList.value.indexOf("textBtn-gray") !== -1){
            this.setTextColor('#888888')
        }else if(element.classList.value.indexOf("textBtn-red") !== -1){
            this.setTextColor('#FE4737')
        }else if(element.classList.value.indexOf("textBtn-orange") !== -1){
            this.setTextColor('#FF9F00')
        }
        else if(element.classList.value.indexOf("textBtn-yellow") !== -1){
            this.setTextColor('#FFE500')
        }else if(element.classList.value.indexOf("textBtn-green") !== -1){
            this.setTextColor('#21D175')
        }else if(element.classList.value.indexOf("textBtn-cyan") !== -1){
            this.setTextColor('#24E8FF')
        }else if(element.classList.value.indexOf("textBtn-blue") !== -1){
            this.setTextColor('#3890FF')
        }else if(element.classList.value.indexOf("textBtn-purple") !== -1){
            this.setTextColor('#A066FF')
        }
        /**针对大小处理**/
        if(element.classList.value.indexOf("text-font-small") !== -1){
            this.setTextFontSize('1px')
        }else if(element.classList.value.indexOf("text-font-middle") !== -1){
            this.setTextFontSize('4px')
        }else if(element.classList.value.indexOf("text-font-big") !== -1){
            this.setTextFontSize('8')
        }
    }
    this.handleChildClickOfNote = function(e){
        let element = e.target
        if(element.classList.contains('noteChild')){
            return
        }
        let children = element.children
        /**子组件的组件（多个）**/
        let noteChildWrapper = document.getElementsByClassName("noteChildWrapper")

        /***清除之前选中的状态**/
        if(noteChildWrapper.length){
            for(let i =0; i < noteChildWrapper.length; i++){
                let child = noteChildWrapper[i]
                if(child.classList.contains('childWrapper-bg')){
                    child.classList.remove("childWrapper-bg")
                }
            }
        }

        /**设置选中元素的样式**/
        this.setBackgroundColor(element,children)

        /**获取当前颜色**/
        if(element.classList.value.indexOf("noteBtn-orange") !== -1){
            this.setNoteColor('#F9EC96')
        }else if(element.classList.value.indexOf("pointerBtn-yellow") !== -1){
            this.setNoteColor('#FFCA96')
        }else if(element.classList.value.indexOf("pointerBtn-cyan") !== -1){
            this.setNoteColor('#8DE7B8')
        }else if(element.classList.value.indexOf("pointerBtn-lightPurple") !== -1){
            this.setNoteColor('#A7D0FF')
        }else if(element.classList.value.indexOf("pointerBtn-deepPurple") !== -1){
            this.setNoteColor('#E2D0FF')
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
    this.handleChildClickOfSetting = (e) =>{
        let element = e.target
        let text = document.getElementsByClassName("setting-status-text")[0]
        let content = document.getElementsByClassName("setting-status-content")[0]
        let other = document.getElementsByClassName("setting-display-other")[0]
        let account = document.getElementsByClassName("setting-display-account")[0]
        if(element === text ){
            if(!this.isShowComment){
                this.isShowComment = true
                other.checked = true
            }else{
                this.isShowComment = false
                other.checked = false
            }

        }else if(element === content){
            if(!this.isShowAccount){
                this.isShowAccount = true
                account.checked = true
            }else{
                this.isShowAccount = false
                account.checked = false
            }

        }else if(element === other){
            if(!this.isShowComment){
                this.isShowComment = true
            }else{
                this.isShowComment = false
            }

        }else if(element === account){
            if(!this.isShowAccount){
                this.isShowAccount = true
            }else{
                this.isShowAccount = false
            }

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

/**************************************** canvas 绘制 ************************************************/
let showPosition = document.getElementsByClassName("showPosition")[0]
let textBox = document.getElementsByClassName("textBox")[0]
let initCanvas = document.getElementsByClassName("canvas")[0]
let ctx = initCanvas.getContext("2d")
let canvasPos = initCanvas.getBoundingClientRect()


/** 发送当前鼠标显示位置
 * */
function sendCurrentMousePosition(data){
    if(!data) {
        console.log("setCurrentMousePosition  invalid")
        return
    }
    let lineId = data.lineContent.local
    let session = WebRTCSession.prototype.getSession({key: 'lineId', value: lineId})
    if(!session){
        log.warn("setCurrentMousePosition: session is not found")
        return
    }
    data.lineId = lineId
    session.dataChannelSendMessage(data)
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
        mouseStyle.style.boxShadow = `0 0 6px 3px ${can.canvasToolsBar.pointerColor}`
        mouseStyle.style.display = "block";
    }else if(can.canvasToolsBar.eraserFlag){
        let mouseRadius =  can.canvasToolsBar.eraserSize
        mouseStyle.style.width = Number(mouseRadius) * 10 + 'px'
        mouseStyle.style.height = Number(mouseRadius) * 10 + 'px'
        mouseStyle.style.left = x - 5 * mouseRadius + 'px'
        mouseStyle.style.top = y - 5 * mouseRadius + 'px'
        mouseStyle.style.boxShadow = `0 0 8px 0 #00000033`
        mouseStyle.style.display = "block";
    }
}


/***************************************************************全屏********************************************************************/
let canvasToolBar = document.getElementsByClassName("canvasToolBar")[0]
let toolbarContent = document.getElementsByClassName("toolbarContent")[0]
let isCurrentFullScreen = false

let fullScreenParam ={
    clickEl: document.getElementsByClassName("dragBtn")[0],
    targetEl: document.getElementsByClassName("presentVideoContainter")[0],
    videoElement: document.getElementsByClassName("presentVideo")[0],
    canvasToolBar: document.getElementsByClassName("canvasToolBar")[0],
    toolBarContent: document.getElementsByClassName("toolbarContent")[0],
    toolbar: document.getElementsByClassName("toolbar")[0],
    clickElement: document.getElementsByClassName("hoverState")[0],
    isLoading: true
}
let dragParam = {  clickEl: dragBtn, targetEl: toolbarContent, limitMoveBorder: true }


/**当页面加载解析完成**/
can = new CanvasExample({
    canvas: document.getElementsByClassName("canvas")[0],
    videoElement: document.getElementsByClassName("presentVideo")[0],
    videoWrapper: document.getElementsByClassName("videoWrapper")[0],
    toolParam: fullScreenParam,
    dragParam: dragParam
})
