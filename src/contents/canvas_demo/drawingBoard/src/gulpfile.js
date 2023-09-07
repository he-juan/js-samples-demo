var gulp = require('gulp')
var clean = require('gulp-clean');//清理文件或文件夹
var concat = require('gulp-concat');// 合并文件


gulp.task('copy',  async function() {
    await gulp.src('sdk/*.js').pipe(concat('gs.sdk.min.js')).pipe(gulp.dest('./background'))
});

gulp.task('default', gulp.series('copy'), function() {
    console.log('default')
})

gulp.task('watch', () => {
    gulp.watch('sdk/*', gulp.series('copy'))
})


