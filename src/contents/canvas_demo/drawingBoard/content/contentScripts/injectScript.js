
// 通过DOM事件发送消息给content-script
(function() {
    var evt = document.createEvent("MouseEvents");

    /************************************ 鼠标点击 *******************************************/
    evt.initMouseEvent("click", true, true, window,0, 0, 0, 0, 0, false, false, false, false, 0, null);
    function sendMessageToContentScriptByClick(){
        /*** 呼叫按钮 ***/
        let callBtn = document.getElementsByClassName("addGrp_btn")[0]
        callBtn.dispatchEvent(evt)

        /*** 点击显示下拉框内容（类似ul li） ***/
        let addGrp_selectContent = document.getElementsByClassName("addGrp_selectContent")[0]
        addGrp_selectContent.dispatchEvent(evt)

        /*** 点击选中内容（类似option，选中下拉框内容） ****/
        let ulElement = document.getElementsByClassName("addGrp_ul")[0]
        ulElement.dispatchEvent(evt)

        /**** 左边按钮*****/
        let addGrpIconLeft = document.getElementsByClassName("GRP-icon-icon_left")[0]
        addGrpIconLeft.dispatchEvent(evt)

        /***** 右边按钮*******/
        let addGrpIconRight = document.getElementsByClassName("GRP-icon-icon_right")[0]
        addGrpIconRight.dispatchEvent(evt)
    }
    window.sendMessageToContentScriptByClick = sendMessageToContentScriptByClick

    /************************************* 鼠标移入 ************************************/
    evt.initMouseEvent("mousemove", true, true, window,0, 0, 0, 0, 0, false, false, false, false, 0, null)
    function sendMessageToContentScriptByHover(){
        let selectAccount = document.getElementsByClassName("addGrpContent")[0]
        selectAccount.dispatchEvent(evt)

        /****下拉框 鼠标移入（li元素 ----> 开始）***/
        let option = document.getElementsByClassName("addGrpOption")[0]
        option.dispatchEvent(evt)

        /*** email 位置鼠标移入***/
        let addGrpShow = document.getElementsByClassName("addGrpShow")[0]
        addGrpShow.dispatchEvent(evt)


        /**鼠标移入当前账号显示跑马灯效果***/
        let addGrpGetContent = document.getElementsByClassName("addGrp_getContent")[0]
        addGrpGetContent.dispatchEvent(evt)
    }
    window.sendMessageToContentScriptByHover = sendMessageToContentScriptByHover

    /*********************************** 鼠标移出 ***************************************/
    evt.initMouseEvent("mouseleave", true, true, window,0, 0, 0, 0, 0, false, false, false, false, 0, null);
    function sendMessageToContentScriptByLeave(){
        /*** email 位置鼠标移出***/
        let addGrpShow = document.getElementsByClassName("addGrpShow")[0]
        addGrpShow.dispatchEvent(evt)

        /***下拉框 鼠标移出(li ----> 转变)***/
        let ulElement = document.getElementsByClassName("addGrp_ul")[0]
        ulElement.dispatchEvent(evt)
    }
    window.sendMessageToContentScriptByLeave = sendMessageToContentScriptByLeave

})();