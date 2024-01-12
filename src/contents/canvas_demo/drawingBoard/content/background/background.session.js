class LineSession{
    remote = {
        lineId: '',
    }
    local = {
        lineId: '',
    }
    isEstablishSuccessPc = false
    sdp = ''
    reqId = 0
    lineId = 0                       // 本地线路Id

    currentLineInfo = null              // 当前线路信息（比如：remotename、remotenumber、line、state、conf）
    shareType = null
    localShare= false               // 本地是否开启共享： true（本地开启共享）
    remoteShare = false             // 对端是否开启共享： true（对端开启共享）
    rspInfo = null
    action = null                      // 此标记使用场景：除首次建立pc以外。
    updateMediaSession  = null         // 更新内容


    constructor (config = {}) {
        this.lineId = config.lineId
        this.local.lineId = config.lineId
        this.shareType = config.shareType
        this.localShare = config.localShare
        this.currentLineInfo = config.currentLineInfo
    }

    setLocalContent(data = {}){
        console.log("set local content :", data)
        this.local.lineId = data.lineId
        this.lineId = data.lineId
        this.reqId = data.reqId

        if(data.sdp){
            this.sdp = data.sdp
        }
        if(data.rspInfo){
            this.rspInfo = data.rspInfo
        }
    }

    setRemoteContent(data = {}){
        console.log("set remote content :", data)
        this.remote.lineId = data.lineId
        this.reqId = data.reqId

        if(data.sdp){
            this.sdp = data.sdp
        }

        if(data.remoteShare){
            this.remoteShare = data.remoteShare
        }
    }

    updateMessage(data){
        console.log("update message :", data)
        this.updateMediaSession = data.updateContent
        if(data.sdp){
            this.sdp = data.sdp
        }

        if(data.rspInfo){
            this.rspInfo = data.rspInfo
        }

        if(data.reqId){
            this.reqId = data.reqId
        }

        if(data.action){
            this.action = data.action
        }

        if(data.shareType){
            this.shareType = data.shareType
        }

        if(data.localShare){
            this.localShare = data.localShare
        }
    }


    getRemoteContent(){
        return this.remote
    }

    getRemoteContent(){
        return this.local
    }

}

export { LineSession }