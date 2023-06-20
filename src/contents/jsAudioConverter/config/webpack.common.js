const {resolveApp} = require("./paths")
const webpack = require('webpack')
const paths = require("./paths")
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')  // webpack4之后的引入方式
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');

let pathsBuild = paths.build
let staticFilesToDistConfigs = [
    {
        from: './README.md',
        to: paths.build,
    },
    {
        from: paths.assets,
        to: paths.build + '/assets/',
    },
    {
        from: paths.src,
        to:  paths.build + '/src',
    },
    {
        from: paths.toBin +  '/encoderWorker.js',
        to:  paths.build + '/toBin',
    },
    {
        from: paths.toOgg +  '/oggOpusEncoderWorker.js',
        to:  paths.build + '/toOgg',
    },
    {
        from: paths.toOgg +  '/oggOpusEncoderWorker.wasm',
        to:  paths.build + '/toOgg',
    },
]
let webpackEntry = {
    // convert:[
    //     paths.src + "/recorder.js",
    //     paths.src + "/encoder.js",
    //     "./index.js",
    // ],
    index: "./index.js",
}

/**
 * 使用function方式return配置,用来获取argv相关参数
 * @param env 用以接收上面那种方式传递的自定义参数
 * @param argv 里面包含 webpack 的配置信息
 * @returns {}
 */
module.exports = {
    devtool: false,  // 控制如何生成map源映射
    target: 'web', // <=== 默认是 'web'，可省略
    mode: 'production',
    // mode: 'development',
    entry: webpackEntry,
    output: {
        path: pathsBuild,
        filename: "[name].js",
        clean: true,            // 编译前清除目录
    },
    plugins: [
        new CopyPlugin({
            patterns: staticFilesToDistConfigs
        }),
        new ProgressBarPlugin({
            format:'  :msg [:bar] :percent (:elapsed s)'
        }),
        new HtmlWebpackPlugin({
            title: 'Ringtone file converter',
            template: './template_index.ejs',
            filename: 'index.html',
            css: ["assets/css/main.css" ],
            js: [
                "toBin/encoderWorker.js",
                "toOgg/oggOpusEncoderWorker.js",
                "src/recorder.js",
                "src/encoder.js",
            ],
            inject: 'body',            // 是否将js放在body的末尾
            // minify: false,
            minify: { // 压缩HTML文件
                removeAttributeQuotes: true, // 移除属性的引号
                removeComments: true, // 移除HTML中的注释
                collapseWhitespace: true, // 删除空白符与换行符
                minifyCSS: true// 压缩内联css
            },
        }),
        new CleanWebpackPlugin(),  //打包时先清除dist目录
    ]
}
