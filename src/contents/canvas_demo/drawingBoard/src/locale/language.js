// 引入语言文件
const grpLang = {
    zh_CN: window.GRP_LOCALES["zh-CN"],
    en_us: window.GRP_LOCALES["en-US"],
}

function getLocalLanguage(lang) {
    let currentLocaleData

    switch (lang) {
        case 'en-US':
            currentLocaleData = Object.assign(grpLang.en_us)
            break
        case 'zh-CN':
            currentLocaleData = Object.assign(grpLang.zh_CN)
            break
        default:
            break
    }

    return {
        lang: lang,
        messages: currentLocaleData
    }
}

// reducers
let localLang = 'en-US'
const preLocalLang = localStorage.getItem('grpLocale')
console.log('get pre local lang: ' + preLocalLang)

localLang = preLocalLang || navigator.language
if (localLang?.indexOf('en') >= 0) {
    localLang = 'en-US'
} else if (localLang?.indexOf('zh') >= 0) {
    localLang = 'zh-CN'
} else {
    // default en-US
    localLang = 'en-US'
}
console.log('The browser\'s current locale is：', localLang)

let result = getLocalLanguage(localLang)
window.currentLocale = result.messages
window.currentLocale.language = localLang
console.log('current locale：', window.currentLocale)
