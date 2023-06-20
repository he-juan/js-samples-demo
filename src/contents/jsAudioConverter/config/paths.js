const path = require('path')
const fs = require('fs')

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = {
    resolveApp,
    // 静态文件路径
    src: path.resolve(__dirname, '../src'),
    css: path.resolve(__dirname, '../css'),
    assets: path.resolve(__dirname, '../assets'),
    toBin: path.resolve(__dirname, '../toBin'),
    toOgg: path.resolve(__dirname, '../toOgg'),
    // 生产环境输出的文件目录
    build: path.resolve(__dirname, '../dist'),
}
