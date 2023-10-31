// 引入语言文件
const grpLang = {
    zh_CN: window.GRP_LOCALES["zh-CN"],
    en_us: window.GRP_LOCALES["en-US"],
}

/**
 * 获取浏览器设置语言
 * @returns {string}
 */
function getCurrentLanguage(){
    const userLanguage = navigator.language
    console.log('The browser\'s current locale is：', userLanguage)
    let languageCode = userLanguage.split('-')[0];   // 提取语言代码
    let lang

    switch (languageCode){
        case 'en':
            lang = 'en-US'
            break
        case 'zh':
            lang = 'zh-CN'
            break
        default:
            lang = 'en-US'
            break
    }
    return lang
}

/**
 * 获取国际化语言
 * @returns {{messages, lang: string}}
 */
function getLocalLanguage() {
    let currentLanguage = getCurrentLanguage()
    let currentLocaleData
    switch (currentLanguage) {
        case 'en-US':
            currentLocaleData = Object.assign(grpLang.en_us)
            break
        case 'zh-CN':
            currentLocaleData = Object.assign(grpLang.zh_CN)
            break
        default:
            break
    }

    currentLocaleData.language = currentLanguage
    console.log('current locale：', currentLocaleData)
    return currentLocaleData
}

window.currentLocale = getLocalLanguage()
