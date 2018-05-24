const gulp      = require("gulp");
const ts        = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");

gulp.task("copy", () => gulp.src(["./env.json", "./package.json"]).pipe(gulp.dest("./build/")));
gulp.task("dirs", () => gulp.src("*.*", {read: false}).pipe(gulp.dest("./build/plugins")));

gulp.task("default", gulp.series(["copy", "dirs"]));

