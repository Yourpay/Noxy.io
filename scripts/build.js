// const _       = require("lodash");
// const path    = require("path");
// const Promise = require("bluebird");
// const fs      = Promise.promisifyAll(require("fs"));
//
// function clean(source, count = {directories: 0, files: 0}) {
//   return new Promise((resolve, reject) => {
//     fs.stat(source, (err, stats) => {
//       if (err) { return resolve(count); }
//       if (stats.isDirectory()) {
//         return fs.readdir(source, (err, files) => {
//           if (err) {return reject(err);}
//           count.directories++;
//           Promise.all(_.map(files, (file) => clean(path.resolve(source, file), count)))
//           .then(() => fs.rmdir(source, err => err ? reject(err) : resolve(count)))
//           .catch(err => reject(err));
//         });
//       }
//       count.files++;
//       fs.unlink(source, err => err ? reject(err) : resolve(count));
//     });
//   });
// }
//
// function copyFile(source, target) {
//   return new Promise((resolve, reject) =>
//     fs.createReadStream(source)
//     .on("error", err => reject(err))
//     .pipe(
//       fs.createWriteStream(target)
//       .on("error", err => console.log("fails here?") || reject(err))
//       .on("close", () => resolve())
//     )
//   );
// }
//
// function createPath(target) {
//   return new Promise((resolve, reject) => {
//     fs.access((target = path.parse(target)).dir, err =>
//       new Promise((resolve, reject) => err ? createPath(target.dir).then(() => resolve(target)).catch(err => reject(err)) : resolve(target))
//       .then(res => fs.mkdir(path.resolve(target.dir, target.base), err => err ? reject(err) : resolve(res)))
//       .catch(err => reject(err))
//     );
//   });
// }
//
// function copy(source, destination) {
//   const count = {directories: 0, files: 0};
//   return new Promise((resolve, reject) => {
//     fs.accessAsync(source)
//     .then(() =>
//       fs.accessAsync(destination)
//       .catch(err => err.code !== "ENOENT" ? err : )
//       .then(res => {})
//     );
//   })
//   .catch(err => reject(err));
// }
//
// clean(path.resolve(__dirname, "../build")).then(
//   res => {
//     console.log(`Cleaned ${res.directories} directories.`);
//     console.log(`Cleaned ${res.files} files.`);
//     Promise.map(["scripts"], file => copy(path.resolve(__dirname, "../", file), path.resolve(__dirname, "../build", file)))
//     .then(res => console.log(res))
//     .catch(err => console.error(err));
//   },
//   err => console.error(err)
// );
//
//
// // /* Main Promise to be resolved when as entry and exit condition */
// // return new Promise((resolve, reject) => {
// //   /* Setup phase for destination directory and retrieving source stats */
// //   return new Promise((resolve, reject) => {
// //     if (typeof count !== "object" || _.difference(_.keys(count), ["directories", "files"]).length > 1) {
// //       new Promise((resolve, reject) =>
// //         fs.stat(source, (err, stats) => {
// //           if (err) { return reject(err); }
// //           fs.access(destination, err => {
// //             if (err) {
// //               if (err.code !== "ENOENT") { return reject(err); }
// //               return createPath(stats.isDirectory());
// //             }
// //           });
// //         })
// //       fs.access(destination);
// //
// //       fs.access((target = path.parse(target)).dir, err =>
// //         new Promise((resolve, reject) => err ? createPath(target.dir).then(() => resolve(target)).catch(err => reject(err)) : resolve(target))
// //         .then(res => fs.mkdir(path.resolve(target.dir, target.base), err => err ? reject(err) : resolve(res)))
// //         .catch(err => reject(err))
// //       );
// //     )
// //     .
// //       then(() => resolve({directories: 0, files: 0}))
// //       .catch(err => reject(err));
// //     }
// //     return resolve(count);
// //   })
// //   .then(stats => {
// //     // if (stats.isDirectory()) {
// //     //   return new Promise(() => fs.access(destination, err => err ? fs.mkdir(destination, err => err ? reject(err) : resolve(count.directories++)) : resolve(count)))
// //     //   .then(() => {
// //     //     return fs.readdir(source, (err, files) => {
// //     //       if (err) {return reject(err);}
// //     //       Promise.all(_.map(files, file => copy(path.resolve(source, file), path.resolve(destinatio0n, file), count)))
// //     //       .then(() => resolve(count))
// //     //       .catch(err => reject(err));
// //     //     });
// //     //   })
// //     //   .catch(err => reject(err));
// //     // }
// //     // new Promise(() => fs.access(destination, err => {
// //     //   if (err) { return fs.mkdir(destination, err => err ? reject(err) : copyFile(source, destination).then(() => resolve(count.files++)).catch(err => reject(err)));}
// //     //   return resolve(count);
// //     // }))
// //     // .then(res => resolve(res))
// //     // .catch(err => reject(err));
// //     // count.files++;
// //   })
// //   .catch(err => reject(err));