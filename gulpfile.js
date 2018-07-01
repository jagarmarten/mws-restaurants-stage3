var gulp = require('gulp');
var uglify = require('gulp-uglify');
var pump = require('pump');

gulp.task('default', defaultTask);

function defaultTask(done) {
    // place code for your default task here
    done();
}

gulp.task('compress', function (cb) {
    pump([
            gulp.src('js/*.js'),
            uglify(),
            gulp.dest('compressed_js')
        ],
        cb
    );
});