import * as Promise from "bluebird";
import * as path from "path";
import * as Include from "../modules/Include";
import * as Module from "../modules/Module";

Include(path.resolve(__dirname, "./modules")).then(() => Module.init());

const array = [
  new Promise(resolve => setTimeout(() => resolve(), 2000)).then(() => console.log("LOL")),
  new Promise(resolve => setTimeout(() => resolve(), 3000)).then(() => console.log("LOL")),
  new Promise(resolve => setTimeout(() => resolve(), 4000)).then(() => console.log("LOL")),
]

Promise.all(array)
.then(() => console.log("Done now"))

array.push(new Promise(resolve => setTimeout(() => resolve(), 1000)).then(() => console.log("LOL")))
array.push(new Promise(resolve => setTimeout(() => resolve(), 5000)).then(() => console.log("LOL")))