
/******************************************************************************贝塞尔曲线 *************************************************************************************/
let maxWidth = 10
let minWidth = 0
let delay = 300
let tension = 0.3
let opacity = 0
let colorRed = 255
let colorGreen = 0
let colorBlue = 0
let roundCap = false

const setDelay = (millisecond) => {
    delay = millisecond
}

const setMaxWidth = (width) => {
    maxWidth = width
}

const setMinWidth = (width) => {
    minWidth = width
}

const setTension = (t) => {
    tension = t
}

const setOpacity = (o) => {
    opacity = o
}

const setColor = (r, g, b) => {
    colorRed = r
    colorGreen = g
    colorBlue = b
}

const setRoundCap = (r) => {
    roundCap = r
}

/**
 * remove some unnessesary points
 */
function drainPoints(originalPoints){
    const timeThreshold = Date.now() - delay
    let sliceIndex
    // remove timeout points
    for (let index = 0; index < originalPoints.length; index++) {
        const point = originalPoints[index]
        if (point.time >= timeThreshold) {
            sliceIndex = index
            break
        }
    }
    const newPoints = sliceIndex === 0 ? originalPoints : sliceIndex === undefined ? [] : originalPoints.slice(sliceIndex)
    for (let index = newPoints.length - 1; index > 0; index--) {
        const p = newPoints[index]
        // if point[n - 1] and point[n] has the same coordinate, remove point[n]
        if (p.x === newPoints[index - 1].x && p.y === newPoints[index - 1].y) {
            newPoints.splice(index, 1)
        }
    }
    for (let index = newPoints.length - 1; index > 1; index--) {
        // if point[n - 1] and point[n + 1] has the same coordinate, remove point[n] and point[n + 1]
        const p = newPoints[index]
        if (p.x === newPoints[index - 2].x && p.y === newPoints[index - 2].y) {
            newPoints.splice(index - 1, 2)
            index--
        }
    }
    return newPoints
}

/**
 * calculate control points
 */
function calControlPoints(points){
    if (points.length < 3) {
        throw new Error('to calculate control points, the point counts should be larger than 3')
    }
    const controlPoints = Array(points.length)
    const l = points.length
    let i = l - 2
    for (; i > 0; i--) {
        const pi = points[i] // current point
        const pp = points[i + 1] // previous point
        const pn = points[i - 1] // next point;

        /* First, we calculate the normalized tangent slope vector (dx,dy).
         * We intentionally don't work with the derivative so we don't have
         * to handle the vertical line edge cases separately. */
        const rdx = pn.x - pp.x // actual delta-x between previous and next points
        const rdy = pn.y - pp.y // actual delta-y between previous and next points
        const rd = hypotenuse(rdx, rdy) // actual distance between previous and next points
        const dx = rdx / rd // normalized delta-x (so the total distance is 1)
        const dy = rdy / rd // normalized delta-y (so the total distance is 1)

        /* Next we calculate distances to previous and next points, so we
         * know how far out to put the control points on the tangents (tension).
         */
        const dp = hypotenuse(pi.x - pp.x, pi.y - pp.y) // distance to previous point
        const dn = hypotenuse(pi.x - pn.x, pi.y - pn.y) // distance to next point

        /* Now we can calculate control points. Previous control point is
         * located on the tangent of the curve, with the distance between it
         * and the current point being a fraction of the distance between the
         * current point and the previous point. Analogous to next point. */
        const cpx = pi.x - dx * dp * tension
        const cpy = pi.y - dy * dp * tension
        const cnx = pi.x + dx * dn * tension
        const cny = pi.y + dy * dn * tension

        controlPoints[i] = {
            cn: { x: cpx, y: cpy }, // previous control point
            cp: { x: cnx, y: cny }, // next control point
        }
        if (isNaN(cpx) || isNaN(cpy) || isNaN(cnx) || isNaN(cny)) {
            console.log('a')
        }
    }
    controlPoints[l - 1] = {
        cn: { x: points[l - 1].x, y: points[l - 1].y },
        cp: { x: (points[l - 1].x + points[l - 2].x) / 2, y: (points[l - 1].y + points[l - 2].y) / 2 },
    }
    controlPoints[0] = {
        cn: { x: (points[0].x + points[i + 1].x) / 2, y: (points[0].y + points[i + 1].y) / 2 },
        cp: { x: points[0].x, y: points[0].y },
    }

    return controlPoints
}

/**
 * construct bezier curve from points
 */
function transformPointToBezier(points,controlPoints){
    const bzArray = []
    for (let i = 1; i < points.length; i++) {
        const pp = points[i - 1]
        const p = points[i]
        const { cn: ppn } = controlPoints[i - 1]
        const { cp } = controlPoints[i]

        console.warn("pp:",pp, "ppn:",ppn, "cp:",cp, "p:",p)
        const bz = new Bezier(pp.x, pp.y, ppn.x, ppn.y, cp.x, cp.y, p.x, p.y)
        bzArray.push(bz)
    }
    return bzArray
}


function bezier(arr, t) { //通过各控制点与占比t计算当前贝塞尔曲线上的点坐标
    var x = 0,
        y = 0,
        n = arr.length - 1
    arr.forEach(function(item, index) {
        if(!index) {
            x += item.x * Math.pow(( 1 - t ), n - index) * Math.pow(t, index)
            y += item.y * Math.pow(( 1 - t ), n - index) * Math.pow(t, index)
        } else {
            x += factorial(n) / factorial(index) / factorial(n - index) * item.x * Math.pow(( 1 - t ), n - index) * Math.pow(t, index)
            y += factorial(n) / factorial(index) / factorial(n - index) * item.y * Math.pow(( 1 - t ), n - index) * Math.pow(t, index)
        }
    })
    return {
        x: x,
        y: y
    }
}

/**
 * calculate drawing data from bezier
 */
function calDrawingData(bzArray, totalLength){
    const drawingData = []
    const opacityDistance = 1 - opacity
    const widthDistance = maxWidth - minWidth
    let pastLength = 0
    for (let index = 0; index < bzArray.length; index++) {
        const bz = bzArray[index]
        const currentBezierLength = bz.length()
        pastLength += currentBezierLength
        const currentOpacity = opacity + (pastLength / totalLength) * opacityDistance
        const currentWidth = minWidth + (pastLength / totalLength) * widthDistance
        drawingData.push({
            bezier: bz,
            opacity: currentOpacity,
            width: currentWidth,
        })
    }
    return drawingData
}

function drawDrawingBezierData(ctx, data){
    ctx.save()
    ctx.lineCap = 'butt'
    for (let i = 0; i < data.length; i++) {
        ctx.beginPath()
        const { bezier: bz, width, opacity } = data[i]
        ctx.lineWidth = width
        ctx.strokeStyle = `rgba(${colorRed},${colorGreen},${colorBlue},${opacity})`

        // offset the coordinates of start point and end point to make the line looks like a real line,
        // not a serials lint with white gaps, relative to this issue: https://github.com/SilentTiger/laser-pen/issues/1
        let newStartPointX = bz.points[0].x
        let newStartPointY = bz.points[0].y
        if (bz.points[0].x !== bz.points[1].x) {
            const startPointX = bz.points[0].x
            const startPointY = bz.points[0].y
            const startPointK = (startPointY - bz.points[1].y) / (startPointX - bz.points[1].x)
            const startPointB = startPointY - startPointK * startPointX
            const xOffset = Math.sqrt(0.005 / (1 + startPointK * startPointK))
            newStartPointX = (bz.points[1].x > startPointX ? -xOffset : xOffset) + startPointX
            newStartPointY = startPointK * newStartPointX + startPointB
        } else {
            newStartPointY += bz.points[0].y > bz.points[1].y ? 0.005 : -0.005
        }

        let newEndPointX = bz.points[3].x
        let newEndPointY = bz.points[3].y
        if (bz.points[2].x !== bz.points[3].x) {
            const endPointX = bz.points[3].x
            const endPointY = bz.points[3].y
            const endPointK = (endPointY - bz.points[2].y) / (endPointX - bz.points[2].x)
            const endPointB = endPointY - endPointK * endPointX
            const xOffset = Math.sqrt(0.005 / (1 + endPointK * endPointK))
            newEndPointX = (bz.points[2].x > endPointX ? -xOffset : xOffset) + endPointX
            newEndPointY = endPointK * newEndPointX + endPointB
        } else {
            newEndPointY += bz.points[2].y > bz.points[3].y ? -0.005 : 0.005
        }

        ctx.moveTo(newStartPointX, newStartPointY)
        ctx.bezierCurveTo(bz.points[1].x, bz.points[1].y, bz.points[2].x, bz.points[2].y, newEndPointX, newEndPointY)

        ctx.stroke()
        ctx.closePath()
    }
    ctx.restore()
}

function drawRoundCap(ctx, lastData){
    const centerPoint = lastData.bezier.points[3]
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = `rgba(${colorRed},${colorGreen},${colorBlue},${lastData.opacity})`
    ctx.arc(centerPoint.x, centerPoint.y, lastData.width / 2, 0, Math.PI * 2, false)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
}

function drawLaserPen (ctx, points){
    if (points.length < 3) {
        throw new Error('too less points')
    }
    const originalControlPoints = calControlPoints(points)
    const originalBezierArray = transformPointToBezier(points, originalControlPoints)
    const totalLength = originalBezierArray.reduce((sum, bz) => sum + bz.length(), 0)
    const step = totalLength / 50
    const splittedPoints = []
    originalBezierArray.forEach((bz, index) => {
        const length = bz.length()
        const splitCount = Math.ceil(length / step) + 2
        const lut = bz.getLUT(splitCount)
        if (index < originalBezierArray.length - 1) {
            lut.pop()
        }
        splittedPoints.push(...lut)
    })
    const splittedControlPoints = calControlPoints(splittedPoints)
    const splittedBezierArray = transformPointToBezier(splittedPoints, splittedControlPoints)
    const drawingData = calDrawingData(splittedBezierArray, totalLength)
    drawDrawingBezierData(ctx, drawingData)
    if (roundCap) {
        drawRoundCap(ctx, drawingData[drawingData.length - 1])
    }
}

/**
 * calculate distance between two points
 */
function hypotenuse(x, y) {
    return Math.sqrt(x * x + y * y)
}

/************************************************************************************* 基本处理 ************************************************************************/

let canvas = document.getElementsByClassName("canvas")[0]
let canvasPos = canvas.getBoundingClientRect()
let ctx = canvas.getContext("2d")
let mouseTrack = []
let drawing = false

/** 显示当前鼠标划过或者点击的位置
 * */
canvas.onmousemove = function(e){
    console.warn("move move move")
    mouseTrack.push({
        x: event.clientX - canvasPos.x,
        y: event.clientY - canvasPos.y,
        time: Date.now(),
    })
    startDraw()

}

canvas.onmouseleave = function(e) {
    console.warn("out out out")
}
/** 开始绘制
 * */
function startDraw() {
    if (!drawing) {
        drawing = true
        draw()
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let needDrawInNextFrame = false
    // draw local mouse track first
    mouseTrack = drainPoints(mouseTrack)
    if (mouseTrack.length >= 3) {
        setColor(
            parseInt(255, 10),
            parseInt(38, 10),
            parseInt(0, 10),
        )
        drawLaserPen(ctx, mouseTrack)
        needDrawInNextFrame = true
    }
    if (needDrawInNextFrame) {
        requestAnimationFrame(draw)
    } else {
        drawing = false
    }
}

/** 绘制路径
 * */


