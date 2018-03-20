var gulp = require('gulp'),
    clean = require('gulp-clean'),
    runSequence = require('gulp-run-sequence'),
    cache = require('gulp-cache'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'), //png图片压缩插件
    sourcemaps  = require('gulp-sourcemaps'),
    cleanCSS = require('gulp-clean-css'),
    minifyHTML = require('gulp-minify-html'),
    uglify = require('gulp-uglify'),
    rev = require('gulp-rev'),
    revReplace = require('gulp-rev-replace'),
    revCollector = require('gulp-rev-collector'),
    userref = require('gulp-useref'),
    concat = require('gulp-concat');


var test_rev_replace_direc = "src/wwroot/test_rev_replace";

// 使用gulp-cache缓存插件
gulp.task('test-image', function() {
    return gulp.src(test_rev_replace_direc + '/img/*')
        .pipe(cache(imagemin({
            progressive: true,
            interlaced: true,
            svgoPlugins: [{removeViewBox: false}], //不要移除svg的viewbox属性
            use: [pngquant()]                      //使用pngquant深度压缩png图片的imagemin插件
        })))
        .pipe(gulp.dest("dist_test_rev_replace/img"))  
});

//压缩CSS
gulp.task('test-minify-css', function () {
    return gulp.src(test_rev_replace_direc + '/css/*.css')
        .pipe(sourcemaps.init())                            //- 启用sourcemaps功能
        .pipe(concat('css-combo.min.css'))                  //- 合并后的文件名
        .pipe(cleanCSS())                                   //- 压缩CSS处理成一行
        .pipe(sourcemaps.write('maps'))                     //- 生成记录位置信息的sourcemaps文件
        .pipe(gulp.dest("dist_test_rev_replace/css"))        //- 输出本地文件目录
});

//CSS生成文件hash编码并生成 rev-manifest.json文件名对照映射
gulp.task('test-rev-css',['test-minify-css'], function () {
    return gulp.src('dist_test_rev_replace/css/*.css')     
        .pipe(rev())                                        //- 文件名加MD5后缀
        .pipe(gulp.dest("dist_test_rev_replace/css"))       //- 输出本地文件目录
        .pipe(rev.manifest())                               //- 生成一个rev-manifest.json
        .pipe(gulp.dest("dist_test_rev_replace/rev/css"))   //- 将 rev-manifest.json 保存到目录内
});

//压缩js
gulp.task('test-uglify-js', function () {
    return gulp.src([test_rev_replace_direc + '/js/a.js', test_rev_replace_direc + '/js/b.js'])
        .pipe(sourcemaps.init())                            //- 启用sourcemaps功能
        .pipe(concat('main-combo.min.js'))                  //- 合并后的文件名
        .pipe(uglify())                                     //- 压缩jS    
        .pipe(sourcemaps.write('maps'))                     //- 生成记录位置信息的sourcemaps文件
        .pipe(gulp.dest("dist_test_rev_replace/js"))        //- 输出本地文件目录
});

//js生成文件添加hash编码并生成 rev-manifest.json文件名对照映射
gulp.task('test-rev-js', ['test-uglify-js'], function () {
    return gulp.src('dist_test_rev_replace/js/*.js')
        .pipe(rev())                                        //- 文件名添加hash
        .pipe(gulp.dest("dist_test_rev_replace/js"))        //- 输出本地文件目录
        .pipe(rev.manifest())                               //- 生成一个rev-manifest.json
        .pipe(gulp.dest("dist_test_rev_replace/rev/js"))    //- 输出本地文件目录
});

//Html更换css、js文件版本 by userref plugin for testB.html
gulp.task('test-rev', ['test-rev-js', 'test-rev-css'], function () {
    var manifest = gulp.src('dist_test_rev_replace/rev/**/*.json');
    return gulp.src('src/wwroot/test_rev_replace/*.html')
        .pipe(userref())
        .pipe(revReplace({ manifest: manifest }))
        .pipe(gulp.dest('dist_test_rev_replace'))
});

//Html更换css、js文件版本 by revCollector plugin for testA.html
gulp.task('test-rev-2', function () {
    return gulp.src(['dist_test_rev_replace/rev/**/*.json', './src/wwroot/test_rev_replace/*.html'])
        .pipe(revCollector({ 
            revReplace: true
        }))
        .pipe(minifyHTML())
        .pipe(gulp.dest('dist_test_rev_replace'))
});

gulp.task('clean', function () {
    return gulp.src('dist_test_rev_replace/', { read: false })
        .pipe(clean());
});

gulp.task('default', function (cb) {
     runSequence('clean', ['test-rev-js', 'test-rev-css', 'test-image'], 'test-rev-2', cb);
});