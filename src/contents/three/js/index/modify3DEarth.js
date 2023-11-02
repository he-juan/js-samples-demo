class Earth{
    landOrbitObject = new THREE.Object3D()          // 地球，月亮 3D层
    earthObject = new THREE.Object3D()              // 地球3D层
    moonObject = new THREE.Object3D()               // 月亮3D层
    radius = 5                                       // 地球半径

    loader = new THREE.TextureLoader()           // 纹理加载器
    geometryLz = new THREE.BufferGeometry()     // 炫光粒子 几何体

    rotateSlowArr = []                                   // 旋转队列
    bigByOpacityArr = []                                 // 放大并透明 队列
    moveArr = []                                         // 移动 队列
    lines = []                                           // 边界 绘制点集合
    opacitys = []                                        // 炫光粒子 透明度
    canvas = document.querySelector('#c3d')

    vertexShader = `
        attribute float aOpacity;
        uniform float uSize;
        varying float vOpacity;

        void main(){
            gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
            gl_PointSize = uSize;

            vOpacity=aOpacity;
        }
        `
    fragmentShader = `
          varying float vOpacity;
          uniform vec3 uColor;

          float invert(float n){
              return 1.-n;
          }

          void main(){
            if(vOpacity <=0.2){
                discard;
            }
            vec2 uv=vec2(gl_PointCoord.x,invert(gl_PointCoord.y));
            vec2 cUv=2.*uv-1.;
            vec4 color=vec4(1./length(cUv));
            color*=vOpacity;
            color.rgb*=uColor;

            gl_FragColor=color;
          }
          `

    constructor () {
        this.init()
    }

    init(){
        this.initScene()         // 定义场景

        this.initCamera()        // 定义相机
        this.initLight()         // 定义光源
        this.initRenderer()      // 定义渲染器
        this.initControls()      // 定义相机控制

        this.bg()               // 定义背景绘制
        this.earth()            // 定义地球
        this.drawChart()        // 定义画图
        this.dazzleLight()      // 定义边界炫光路径
        this.animate()          // 渲染
    }

   /**
    * 初始化 场景
    **/
    initScene(){
       this.scene = new THREE.Scene()
       this.scene.background = new THREE.Color(0x020924)
   }

    /**
     * 初始化 相机
     **/
    initCamera(){
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 1, 1000)
        this.camera.position.set(5, -20, 200)                                          // 设置相机位置(x,y,z)
        this.camera.lookAt(0,3,0)                                                      // 通过lookAt将摄像机指向场景中心,(默认指向0,0,0)
    }

    /**
     * 初始化 光源
     **/
    initLight(){
        /** 环境光 **/
        this.ambientLight = new THREE.AmbientLight(0xcccccc, 0.2)
        this.scene.add(this.ambientLight)

        /** 平行光 **/
        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
        directionalLight.position.set(1, 0.1, 0).normalize()
        this.scene.add(directionalLight)

        /** 平行光2 **/
        let directionalLight2 = new THREE.DirectionalLight(0xff2ffff, 0.2)
        directionalLight2.position.set(1, 0.1, 0.1).normalize()
        this.scene.add(directionalLight2)

        /** 半球光 **/
        let hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2)
        hemisphereLight.position.set(0, 1, 0)
        this.scene.add(hemisphereLight)

        /** 平行光3 **/
        let directionalLight3 = new THREE.DirectionalLight(0xffffff)
        directionalLight3.position.set(1, 500, -20)
        // 开启阴影
        directionalLight3.castShadow = true
        // 设置光边界
        directionalLight3.shadow.camera.top = 18
        directionalLight3.shadow.camera.bottom = -10
        directionalLight3.shadow.camera.left = -52
        directionalLight3.shadow.camera.right = 12
        this.scene.add(directionalLight3)
    }

    /**
     * 初始化 渲染器
     * **/
    initRenderer() {
        // antialias: true, alpha: true 抗锯齿设置
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
        // window.devicePixelRatio 设备像素比
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(window.innerWidth,window.innerHeight)
    }

    /**
     * 初始化 相机控制
     * **/
    initControls(){
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.enableZoom = true
        this.controls.autoRotate = false
        this.controls.autoRotateSpeed = 2
        this.controls.enablePan = true
    }

    /**
     * 设置背景
     **/
    bg() {
        /** 1. 创建几何体并设置  2.设置星星为ParticleBasicMaterial点基础材质  3. 设置星星为粒子网格 ***/

        let positions = []
        let colors = []

        // ------------- 1 ----------
        const geometry = new THREE.BufferGeometry()                                 // 创建 几何体
        for (let i = 0; i < 10000; i++) {
            let vertex = new THREE.Vector3()
            vertex.x = Math.random() * 2 - 1
            vertex.y = Math.random() * 2 - 1
            vertex.z = Math.random() * 2 - 1
            positions.push(vertex.x, vertex.y, vertex.z)
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))    // 对几何体 设置 坐标 和 颜色
        geometry.computeBoundingSphere()     // 默认球体

        // ------------- 2 星星资源图片  ParticleBasicMaterial 点基础材质----------
        let starsMaterial = new THREE.ParticleBasicMaterial({
            map: this.generateSprite(),
            size: 2,
            transparent: true,
            opacity: 1,
            //true：且该几何体的colors属性有值，则该粒子会舍弃第一个属性--color，而应用该几何体的colors属性的颜色
            // vertexColors: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        })

        // ------------- 2 粒子系统 网格----------
        let stars = new THREE.ParticleSystem(geometry, starsMaterial)
        stars.scale.set(300, 300, 300)
        this.scene.add(stars)
    }

    /**
     * 创建 方形纹理
     * */
    generateSprite() {
        const canvas = document.createElement('canvas')
        canvas.width = 16
        canvas.height = 16

        const context = canvas.getContext('2d')
        // 创建颜色渐变
        const gradient = context.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            canvas.width / 2
        )
        gradient.addColorStop(0, 'rgba(255,255,255,1)')
        gradient.addColorStop(0.2, 'rgba(0,255,255,1)')
        gradient.addColorStop(0.4, 'rgba(0,0,64,1)')
        gradient.addColorStop(1, 'rgba(0,0,0,1)')

        // 绘制方形
        context.fillStyle = gradient
        context.fillRect(0, 0, canvas.width, canvas.height)
        // 转为纹理
        const texture = new THREE.Texture(canvas)
        texture.needsUpdate = true
        return texture
    }

    /**
     * 球相关加载
     * */
    earth() {
        // const radius = globeRadius
        const widthSegments = 200
        const heightSegments = 100
        const sphereGeometry = new THREE.SphereGeometry(this.radius, widthSegments, heightSegments)

        // 地球
        const earthTexture = this.loader.load('./img/3.jpg')
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthTexture
        })
        const earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial)

        // 月球
        const moonTexture = this.loader.load('./img/2.jpg')
        const moonMaterial = new THREE.MeshPhongMaterial({ map: moonTexture })
        const moonMesh = new THREE.Mesh(sphereGeometry, moonMaterial)
        moonMesh.scale.set(0.1, 0.1, 0.1)
        moonMesh.position.x = 10

        this.moonObject.add(moonMesh)
        // 加入动画队列
        this.moonObject._y = 0
        this.moonObject._s = 1
        this.rotateSlowArr.push(this.moonObject)

        // 地球加入 地球3D层
        this.earthObject.add(earthMesh)
        this.earthObject.rotation.set(0.5, 2.9, 0.1)
        this.earthObject._y = 2.0
        this.earthObject._s = 0.1
        // 加入动画队列
        // rotateSlowArr.push(earthObject)

        // 加入 地球3D层
        this.landOrbitObject.add(this.earthObject)
        // 加入 月亮3D层
        this.landOrbitObject.add(this.moonObject)

        this.scene.add(this.landOrbitObject)
    }

    /**
     * 画图
     * */
    drawChart() {
        let markPos = this.lglt2xyz(106.553091, 29.57337, 5)
        this.spotCircle([markPos.x, markPos.y, markPos.z])                 // 目标点

        let markPos2 = this.lglt2xyz(106.553091, 33.57337, 5)
        this.spotCircle([markPos2.x, markPos2.y, markPos2.z])                   // 目标点

        let markPos3 = this.lglt2xyz(111.553091, 29.57337, 5)
        this.spotCircle([markPos3.x, markPos3.y, markPos3.z])                   // 目标点

        this.lineConnect([121.48, 31.23], [116.4, 39.91])
        this.lineConnect([121.48, 31.23], [121.564136, 25.071558])
        this.lineConnect([121.48, 31.23], [104.896185, 11.598253])
        this.lineConnect([121.48, 31.23], [130.376441, -16.480708])
        this.lineConnect([121.48, 31.23], [-71.940328, -13.5304])
        this.lineConnect([121.48, 31.23], [-3.715707, 40.432926])
    }

    /**
     * 经维度 转换坐标
     * THREE.Spherical 球类坐标
     * lng:经度
     * lat:维度
     * radius:地球半径
     */
    lglt2xyz(lng, lat, radius) {

        const theta = (90 + lng) * (Math.PI / 180)   // 以z轴正方向为起点的水平方向弧度值
        const phi = (90 - lat) * (Math.PI / 180)     // 以y轴正方向为起点的垂直方向弧度值

        return new THREE.Vector3().setFromSpherical(new THREE.Spherical(radius, phi, theta))
    }

    /**
     * 绘制 目标点
     * */
    spotCircle(spot) {
        // 圆
        const geometry1 = new THREE.CircleGeometry(0.02, 100)
        const material1 = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
        const circle = new THREE.Mesh(geometry1, material1)
        circle.position.set(spot[0], spot[1], spot[2])

        let coordVec3 = new THREE.Vector3(spot[0], spot[1], spot[2]).normalize()   // mesh在球面上的法线方向(球心和球面坐标构成的方向向量)
        let meshNormal = new THREE.Vector3(0, 0, 1)                                 // mesh默认在XOY平面上，法线方向沿着z轴new THREE.Vector3(0, 0, 1)

        /** 1.四元数属性.quaternion表示mesh的角度状态  2..setFromUnitVectors();计算两个向量之间构成的四元数值**/
        circle.quaternion.setFromUnitVectors(meshNormal, coordVec3)
        this.earthObject.add(circle)

        // 圆环
        const geometry2 = new THREE.RingGeometry(0.03, 0.04, 100)
        const material2 = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true })      // transparent 设置 true 开启透明
        const circleY = new THREE.Mesh(geometry2, material2)
        circleY.position.set(spot[0], spot[1], spot[2])
        circleY.lookAt(new THREE.Vector3(0, 0, 0))                                                                         // 指向圆心
        this.earthObject.add(circleY)

        this.bigByOpacityArr.push(circleY)                                                                                      // 加入动画队列
    }

    /**
     * 绘制 两个目标点并连线
     * */
    lineConnect(posStart, posEnd) {
        let v0 = this.lglt2xyz (posStart[0], posStart[1], this.radius)
        let v3 = this.lglt2xyz (posEnd[0], posEnd[1], this.radius)

        // angleTo() 计算向量的夹角
        let angle = v0.angleTo (v3)
        let vtop = v0.clone ().add (v3)
        // multiplyScalar 将该向量与所传入的 标量进行相乘
        vtop = vtop.normalize ().multiplyScalar (this.radius)

        let n
        if (angle <= 1) {
            n = (this.radius / 5) * angle
        } else if (angle > 1 && angle < 2) {
            n = (this.radius / 5) * Math.pow (angle, 2)
        } else {
            n = (this.radius / 5) * Math.pow (angle, 1.5)
        }

        const v1 = v0.clone ().add (vtop).normalize ().multiplyScalar (this.radius + n)
        const v2 = v3.clone ().add (vtop).normalize ().multiplyScalar (this.radius + n)
        const curve = new THREE.CubicBezierCurve3 (v0, v1, v2, v3)                            // 三维三次贝塞尔曲线(v0起点，v1第一个控制点，v2第二个控制点，v3终点)

        // 绘制 目标位置
        this.spotCircle ([v0.x, v0.y, v0.z])
        this.spotCircle ([v3.x, v3.y, v3.z])
        this.moveSpot (curve)

        const lineGeometry = new THREE.BufferGeometry ()
        // 获取曲线 上的50个点
        let points = curve.getPoints (50)
        let positions = []
        let colors = []
        let color = new THREE.Color ()

        // 给每个顶点设置演示 实现渐变
        for (let j = 0; j < points.length; j ++) {
            color.setHSL (0.81666 + j, 0.88, 0.715 + j * 0.0025) // 粉色
            colors.push (color.r, color.g, color.b)
            positions.push (points[j].x, points[j].y, points[j].z)
        }
        // 放入顶点 和 设置顶点颜色
        lineGeometry.addAttribute ('position', new THREE.BufferAttribute (new Float32Array (positions), 3, true))
        lineGeometry.addAttribute ('color', new THREE.BufferAttribute (new Float32Array (colors), 3, true))

        const material = new THREE.LineBasicMaterial ({vertexColors: THREE.VertexColors, side: THREE.DoubleSide})
        const line = new THREE.Line (lineGeometry, material)

        this.earthObject.add (line)
    }

    /**
     * 边界炫光路径
     * */
    dazzleLight (){
        const loader = new THREE.FileLoader ()
        loader.load ('./file/100000.json', (data) => {
            const jsondata = JSON.parse (data)
            console.log ('🚀 ~ file: index.html:454 ~ loader.load ~ jsondata:', jsondata)

            // 中国边界
            const feature = jsondata.features[0]
            const province = new THREE.Object3D ()
            province.properties = feature.properties.name
            // 点数据
            const coordinates = feature.geometry.coordinates

            coordinates.forEach ((coordinate) => {
                // coordinate 多边形数据
                coordinate.forEach ((rows) => {
                    // 绘制线
                    const line = this.lineDraw (rows, 0xaa381e)
                    province.add (line)
                })
            })
            // 添加地图边界
            this.earthObject.add (province)

            // 拉平 为一维数组
            const positions = new Float32Array (lines.flat (1))
            // 设置顶点
            this.geometryLz.setAttribute ('position', new THREE.BufferAttribute (positions, 3))
            // 设置 粒子透明度为 0
            this.opacitys = new Float32Array (positions.length).map (() => 0)
            this.geometryLz.setAttribute ('aOpacity', new THREE.BufferAttribute (opacitys, 1))

            this.geometryLz.currentPos = 0
            // 炫光移动速度
            this.geometryLz.pointSpeed = 20

            // 控制 颜色和粒子大小
            const params = {
                pointSize: 2.0,
                pointColor: '#4ec0e9'
            }

            // 创建着色器材质
            const material = new THREE.ShaderMaterial ({
                vertexShader: this.vertexShader,
                fragmentShader: this.fragmentShader,
                transparent: true, // 设置透明
                uniforms: {
                    uSize: {
                        value: params.pointSize
                    },
                    uColor: {
                        value: new THREE.Color (params.pointColor)
                    }
                }
            })
            const points = new THREE.Points (geometryLz, material)

            this.earthObject.add (points)
        })
    }


    /**
     * 线上移动物体
     * */
    moveSpot(curve) {
        // 线上的移动物体
        const aGeo = new THREE.SphereGeometry(0.04, 0.04, 0.04)
        const aMater = new THREE.MeshPhongMaterial({ color: 0xff0000, side: THREE.DoubleSide })
        const aMesh = new THREE.Mesh(aGeo, aMater)
        // 保存曲线实例
        aMesh.curve = curve
        aMesh._s = 0

        this.moveArr.push(aMesh)
        this.earthObject.add(aMesh)
    }

    /**
     * 渲染函数
     * */
    renders(time) {
        time *= 0.003

        // 3D对象 旋转
        // _y 初始坐标 _s 旋转速度
        this.rotateSlowArr.forEach((obj) => {
            obj.rotation.y = obj._y + time * obj._s
        })
        this.bigByOpacityArr.forEach(function (mesh) {
            //  目标 圆环放大 并 透明
            mesh._s += 0.01
            mesh.scale.set(1 * mesh._s, 1 * mesh._s, 1 * mesh._s)
            if (mesh._s <= 2) {
                mesh.material.opacity = 2 - mesh._s
            } else {
                mesh._s = 1
            }
        })
        this.moveArr.forEach(function (mesh) {
            mesh._s += 0.01
            let tankPosition = new THREE.Vector3()
            tankPosition = mesh.curve.getPointAt(mesh._s % 1)
            mesh.position.set(tankPosition.x, tankPosition.y, tankPosition.z)
        })

        if (this.geometryLz.attributes.position) {
            this.geometryLz.currentPos += this.geometryLz.pointSpeed
            for (let i = 0; i < this.geometryLz.pointSpeed; i++) {
                this.opacitys[(this.geometryLz.currentPos - i) % this.lines.length] = 0
            }

            for (let i = 0; i < 200; i++) {
                this.opacitys[(this.geometryLz.currentPos + i) % this.lines.length] = i / 50 > 2 ? 2 : i / 50
            }
            this.geometryLz.attributes.aOpacity.needsUpdate = true
        }

        this.renderer.clear()
        this.renderer.render(this.scene, this.camera)
    }

    /**
     * 动画渲染函数
     */
    animate() {
        window.requestAnimationFrame((time) => {
            if (this.controls) this.controls.update()

            this.renders(time)
            this.animate()
        })
    }

}

new Earth().init()