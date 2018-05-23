const _       = require("lodash");
const fs      = require("fs");
const path    = require("path");
const Promise = require("bluebird");

function clean(source, count = {directories: 0, files: 0}) {
  return new Promise((resolve, reject) => {
    fs.stat(source, (err, stats) => {
      if (err) { return reject(err); }
      if (stats.isDirectory()) {
        return fs.readdir(source, (err, files) => {
          if (err) {return reject(err);}
          count.directories++;
          Promise.all(_.map(files, (file) => clean(path.resolve(source, file), count)))
          .then(() => fs.rmdir(source, err => err ? reject(err) : resolve(count)))
          .catch(err => reject(err));
        });
      }
      count.files++;
      fs.unlink(source, err => err ? reject(err) : resolve(count));
    });
  });
}

function copyFile(source, target) {
  return new Promise((resolve, reject) =>
    fs.createReadStream(source)
    .on("error", err => reject(err))
    .pipe(
      fs.createWriteStream(target)
      .on("error", err => console.log("fails here?") || reject(err))
      .on("close", () => resolve())
    )
  );
}

function createPath(target) {
  return new Promise((resolve, reject) => fs.access((target = path.parse(target)).dir, err => err ? createPath(target.dir) : fs.mkdir(path.resolve(target.dir, target.base), err => err ? reject(err) : resolve(target))));
}

function copy(source, destination) {
  const temp  = arguments[arguments.length - 1];
  const count = typeof temp !== "object" || !temp.directories || !temp.files ? {directories: 0, files: 0} : temp;
  /* Main Promise to be resolved when as entry and exit condition */
  return new Promise((resolve, reject) => {
    /* Setup phase for destination directory and retrieving source stats */
    return new Promise((resolve, reject) => {
      fs.stat(source, (err, stats) => {
        if (err) { return reject(err); }
        console.log(stats.isDirectory() ? destination : path.parse(destination).dir)
        resolve();
        // fs.access(destination, err => err ? createPath(stats.isDirectory() ? destination : path.parse(destination).dir).then(() => resolve(stats)).catch(err => reject(err)) : resolve(stats));
      });
    })
    .then(stats => {
      // if (stats.isDirectory()) {
      //   return new Promise(() => fs.access(destination, err => err ? fs.mkdir(destination, err => err ? reject(err) : resolve(count.directories++)) : resolve(count)))
      //   .then(() => {
      //     return fs.readdir(source, (err, files) => {
      //       if (err) {return reject(err);}
      //       Promise.all(_.map(files, file => copy(path.resolve(source, file), path.resolve(destination, file), count)))
      //       .then(() => resolve(count))
      //       .catch(err => reject(err));
      //     });
      //   })
      //   .catch(err => reject(err));
      // }
      // new Promise(() => fs.access(destination, err => {
      //   if (err) { return fs.mkdir(destination, err => err ? reject(err) : copyFile(source, destination).then(() => resolve(count.files++)).catch(err => reject(err)));}
      //   return resolve(count);
      // }))
      // .then(res => resolve(res))
      // .catch(err => reject(err));
      // count.files++;
    })
    .catch(err => reject(err));
  })
  .then(() => console.log("Reached, so far so good"));
}

clean(path.resolve(__dirname, "../build")).then(
  res => {
    if (res.directories > 0) { console.log(`Cleaned ${res.directories} directories.`); }
    if (res.files > 0) { console.log(`Cleaned ${res.files} files.`); }
    Promise.all(_.map(["env.json"], file => copy(path.resolve(__dirname, "../", file), path.resolve(__dirname, "../build", file))))
    .then(res => console.log(res))
    .catch(err => console.error(err));
  },
  err => console.error(err)
);
