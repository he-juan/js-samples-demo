## 一、解释 PWA

  - 渐进式web引用
  - progressive web app , 是提升用户体验的一种方法，让web能够给用户原生应用的体验
  - 不是指一项技术，而是引用一系列的新技术进行改进web
  - PWA能用现代的web api 以及传统的渐进式增强策略来创建跨平台的web应用程序
  - 任何的web app都可以用pwa来实现渐进增强
  
  - 作用：
      > (1)使用与所有浏览器，因为还是旨在渐进式挣钱开发
      
      > (2) 能够结束service worker 实现离线访问或网络较差的情况下的正常访问
      
      > (3) 可将网站添加到手机主屏幕上，实现类似原生app的效果，获得原生体验，拥有首屏加载动画可以隐藏地址栏等沉浸式体验
      
      > (4) 可以实现消息推送，点击通知可直接打开网站，增加用户粘度
   
  
## 二、核心技术

  - web app mainfest
  - service worker
  - promise / async / await： 异步
  - fetch api: 前端请求，ajax、axios或者Promise的fetch
  - Cache storage
  - 常见的缓存策略： 确定哪些资源需要走缓存，那些资源需要走网络
  - notification： 用来做通知的，在网页下面也可以实现消息通知 
  
  
## 三、 核心技术之web app mainfest  

  1. 一个程序清单的JSON文件（即项目中引入的manifest.json）， 实现在移动端可以将网站像app一样添加到主屏幕上
  2. 可以提供有关引用程序的信息（如名称，作者，图标和描述等）
  3. 作用：
     - （1）可以添加到桌面，有唯一的图标
     - （2）又启动时的动画，避免生硬过渡
     - （3）隐藏浏览器相关的UI,比如地址栏和菜单栏等
  4. 使用步骤：
     - （1）项目下创建manifest.json
     - （2）创建index.html， 并引入manifest.json
     - （3）在manifest.json中提供常见配置
     - （4）需要在https协议或者http://localhost下访问才可以
     - （5）用http-server或者anywhere启动测试
  5. manifest.json 常见配置如下：

        ```javascript
        {
          // 应用的名称， 用户安装横幅提示的名字，和启动画面中的文字
          "name": "HackerWeb",
          // 应用的短名字， 用于主屏幕显示
          "short_name": "HackerWeb",
          // 指定用户从设备启动应用程序时加载的URL, 可以是相对路径或者绝对路径
          "start_url": ".",
          // fullscreen 全屏显示, 无状态栏
          // standalone 看起来像一个独立应用，拥有独立图标和窗口， 可以包含其他UI元素，如状态栏
          // minimal-ui 看起来像独立应用程序，但是会有浏览器地址栏
          // browser 在传统的浏览器标签或新窗口打开
          "display": "standalone",
          // 用户指定启动时的过度背景颜色#fff / red
          "background_color": "#fff",
          // 指定应用程序的主题颜色， 应用顶部那一块的颜色
          "theme_color": "#ff0000",
          // 定义应用程序上下文的导航范围
          // 限制了manifest可以查看的网页范围，如果用户在范围之外浏览应用程序，这返回到正常网页
          "scope": "/myapp/",
          // 提供有关Web应用程序的一般描述
          "description": "A simply readable Hacker News app.",
          // 应用程序的图标，规格有： 48x48， 72x72， 96x96， 144x144， 168x168， 192x192
          "icons": [{
            "src": "imgs/favicon.png",
            "sizes": "64x64",
            "type": "image/png"
          }],
          // 定义所有Web应用程序顶级的默认方向， 有如下值:
          // any，natural， landscape，landscape-primary，
          // landscape-secondary， portrait，portrait-primary， portrait-secondary
          ​​"orientation": "portrait-primary",
          // 代表可由底层平台安装或可访问的本机应用程序
          "related_applications": [{
              // Google Play Store 可以找到应用程序的平台。
              "platform": "play",
              // 可以找到应用程序的URL。
              "url": "https://play.google.com/store/apps/details?id=com.example.app1",
              // 用于表示指定平台上的应用程序的ID。
              "id": "com.example.app1"
            }, {
              "platform": "itunes", // itunes
              "url": "https://itunes.apple.com/app/example-app1/id123456789"
            }]
        }
         
      ```


## 四、核心技术之service worker

  1. pwa的核心技术，可以让网页在离线或者网速比较慢的情况下依然可以访问

  2. 是一个独立的worker线程，独立于当前网页进程，是一种特殊的 web worker

  3. 优化网页性能的一个有效方法。除去，cdn , css sprite, 文件合并压缩，缓存，异步加载， 图片懒加载预加载，code spliting等

  4. 特点：
     - 浏览器的js是运行在单线程上的，在同一时间内只能处理一件事
     - web worker 是脱离主线程之外的，所以可以将一些比较耗时的任务交给web worker 做，完成之后通过postMessage方法告诉主线程
     - web worker 是一个独立的运行环境，不能操作DOM和BOM，全局环境变量为self
     - web worker 和service worker 都必须在http://localhost或者https服务器环境下才能生效
  5. 使用方法：
     - 创建web worker, var worker = new Worker(“work.js”)
     - 在web work中进行复杂的计算
     - web work计算结束时，通过self.postMessage(msg)给主线程发消息
     - 主线程通过worker.onmessage=function () {}监听消息
     - 主线程也可以用同样的方法来给web work 进行通讯；
     
  6. service worker 用法和特征：
     - Web Worker 是临时的，每次做的事情结果还不能被持久存下来，如果下次有同样的复杂操作，还得费时间的重新来一遍
     - 一旦被install, 就永远存在，除非被手动在控制台unregister
     - 用到的时候可以直接唤醒，不用的时候自动休眠
     - 可编程拦截代理请求和返回，缓存文件，缓存的文件可以被网页进程取到（包括网络离线状态）
     - 离线内容开发者可控
     - <font color=red>**必须在localhost或者https环境下才能工作**</font>
     - 异步实现，内部大都是通过Promise实现，接口也多是异步
  7. Service Worker 使用步骤：
     - 页面加载完成后再注册service worker，防止与其他资源竞争
     - navigatior中内置了serviceWorker属性，可以通过这个特性检测浏览器是否支持service worker， 老版本浏览器中不支持，需要兼容处理 if（‘serviceWorker’ in navigator） {}
     - 注册service worker 
     
  8. service worker 的生命周期
     - install： 事件会在service worker 注册成功的时候触发，主要用于资源缓存
     - activate: 事件会在service worker 激活的时候触发，主要用于删除旧的资源
     - fetch: 可以接收到所有的网络请求。事件会在接收网络请求的时候就会触发fetch事件，主要用于操作缓存或者读取网络资源或者读取网络资源失败之后再去读取缓存
     - 注意：
         - (1) 一个service work的install 和 activate都只会触发一次。一次成功之后，如果不重新install, 那么永远都不会再触发这两个周期。
         - (2) 如果sw.js文件改变了，install事件会重新触发
         - (3) activate事件会在install 事件之后触发，但是如果现在已经存在service work了， 那么就处于等待状态，直到当前service work终止
         - (4) 可以通过 self.skipWaiting() 方法跳过等待，返回一个Promise对象,是异步的
         - (5) 可以通过 event.waitUtil() 方法扩的参数promise对象，会在promise结束后才会结束当前生命周期函数，防止浏览器在异步操作之前就停止了生命周期
         - (6) service work激活后，会在下一次刷新页面的时候生效，可以通过self.clients.claim() 立即获取控制权，立即生效
   

## 五、核心技术之Cache Storage api

  1. 用来做缓存，service worker 能够实现离线访问主要就是依赖于缓存策略，缓存资源

  2. Cache api
     - cache Storage 接口表示Cache对象的存储，可以配合service work 来实现资源的缓存, 可以再控制台Applicant – > Cache --> Cache Storage 中查看缓存的数据
  3. cache api 类似于数据库的操作
      ```javascript
        caches.open(cacheName).then(function (cache ) { }) ,
        // 用于打开缓存，返回一个匹配cacheName的cache对象（Promise类型）， 类似于链接数据库。
        
        cacheName 为缓存的名字
        // cache类似于已经连上数据库了，可接下来就可以基于cache来做一些操作了.
        
        caches.keys() 返回一个Promise对象，包括所有的缓存的key(数据库名)。 类似于可以获取到所有的数据库
        
        caches.delete(key) 返回一个Promise对象， 根据key删除对应的缓存（数据库）。
        // 相当于根据一个key，删除掉一个已有数据库
     ```
  
  4. Cahce对象常用方法：
     - cache接口为缓存的request/response 对象(网络请求对象)提供存储机制
     - cache.put(req, res) 把请求当成key,把对应的响应存储起来，如果当前key已存在，那么新的数据会覆盖老的。即可以把对应的请求和响应结果都存起来
     - cache.add(url) 根据url发起请求，并把响应结果存储起来
     - cache.addAll(urls) 抓取一个url数组，会自动去抓取，并把结果都存起来
     - cache.match(req) 获取req对应的response
     
  5. <font color=red>**常见的缓存策略： 确定哪些资源需要走缓存，哪些资源需要走网络**   </font>
     - 只走缓存 (cache only)： 只从缓存中获取资源
     - 只走网络 (network only)： 只从网络获取资源
     - 缓存优先 (cache first)： 优先从缓存获取资源，没有则向网络请求资源
     - 网络优先 (network first)： 优先从网络获取资源，获取失败则向缓存请求资源
     - 缓存网络竞速 (cache and network race)： 网络和缓存同时请求，优先使用最先返回的资源。
     - 缓存处理时必须要注意避免跨域资源缓存:
       > 由于更新机制的问题，如果Service Work 缓存了错误的结果，将会对web应用造成灾难性的后果。我们必须要小心翼翼的检查网络返回是否准确。一种常见的做法是只缓存满足如下条件的结果：
       
        - 响应状态码为200； 避免缓存304、 404、 500 等常见错误结果
        - 响应类型为basic 或者cors； 即只缓存同源、或者正确的跨域请求结果； 避免缓存错误的响应和不正确的跨域请求响应

  6. <font color=red>**Notification: 用来向用户配置和显示桌面通知的，在网页下面也可以实现消息通知**</font>
     - 基本使用：
       - Notification.permission 可以获取当前用户的授权情况
       - (1) Default: 默认的， 未授权
       - (2) Denied: 拒绝的，如果拒绝了，无法再次请求授权，也无法弹窗提醒
       - (3) Granted: 授权的，可以弹窗消息提醒
     - 通过 Notification. requestPermission() 可以请求用户的授权
    
     - 通过new Notification(‘title’, {icon: ‘’, body: ‘’}) 可以显示通知
     
     - 在授权的情况下，可以再Service Worker 中显示通知self.registration.showNotification(‘你好’， {body: ‘msg’})


## 六、核心技术之fetch api
 
 - fetch 在windows对象上
 
 - dom中能使用XMLHttpRequest 和 fetch api, 而service work中只能使用fetch api
 
 - Fetch 提供了对 Request 和 Response （以及其他与网络请求有关的）对象的通用定义。将可以使用在多场景中，如：service workers、Cache API、又或者是其他处理请求和响应的方式。
 
 - XMLHttpRequest 只能使用在DOM中
 
 - fetch api 基于promise实现的
 
 - fetch非常强大，不仅可以获取接口，还可以获取json, 图片等资源
 
 - response 是一个二进制数据流，需要使用**res. json()**方法可以转换成json数据， 前提是读取的是一个json数据。
 
 - fetch（URL， config） 用于发送http请求，返回一个包含响应结果的promise对象
 - config 常见参数：
     - (1) body： 用于设置请求体
     - (2) headers： 用于设置请求头
     - (3) method: 设置请求方式







## 參考：
 - [图标添加到主屏幕快捷方式](https://developer.mozilla.org/zh-CN/docs/web/progressive_web_apps/add_to_home_screen)
 
 - [PWA 实例代码](https://github.com/deanhume/progressive-web-apps-book)
 
 - [PWA 实战](https://github.com/SangKa/PWA-Book-CN)
 
 - [PWA（渐进式的web引用）系列核心技术总结](https://blog.csdn.net/studentenglish/article/details/103174770)
 
 - [PWA Workshop](https://pwa-workshop.js.org/2-service-worker/#service-worker-life-cycle)
 
 