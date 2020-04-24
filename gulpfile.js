const gulp = require("gulp");
const babel = require("gulp-babel");
const spawn = require('child_process').spawn;

let node = null;

gulp.task('transpile', () => {
    return gulp.src(["src/**/*.js", "!src/**/*.test.js"])
      .pipe(babel())
      .pipe(gulp.dest("dist"));
})

gulp.task('stop', (done) => {
    if (node) node.kill();
    done();
});

gulp.task('start', (done) => {
	node = spawn('node', ['dist/'], { stdio: 'inherit' });
	node.on('close', (code) => {
    	if (code === 8)
      		gulp.log('Error detected, waiting for changes...');
	});

    done();
});

gulp.task('build_and_run', gulp.series('stop', 'transpile', 'start'));

gulp.task('watch', function() {
    gulp.watch('src/**/*.js', gulp.series('build_and_run'));
})

gulp.task('default', gulp.parallel('watch', 'build_and_run'));

process.on('exit', () => {
    if (node) node.kill()
});
