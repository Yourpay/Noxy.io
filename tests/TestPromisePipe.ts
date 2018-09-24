import * as Promise from "bluebird";
import {ePromisePipeStagesInit} from "../interfaces/iPromisePipe";
import * as PromisePipe from "../modules/PromisePipe";

const pipe = PromisePipe(ePromisePipeStagesInit);

pipe.add(ePromisePipeStagesInit.DATABASE, () => Promise.delay(300).then(() => console.log("Stage 1 - Promise 1")));
pipe.add(ePromisePipeStagesInit.DATABASE, () => Promise.delay(500).then(() => console.log("Stage 1 - Promise 2")));
pipe.add(ePromisePipeStagesInit.RESOURCE, () => Promise.delay(200).then(() => console.log("Stage 2 - Promise 1")));
pipe.add(ePromisePipeStagesInit.PUBLICIZE, () => Promise.delay(400).then(() => console.log("Stage 3 - Promise 1")));

console.log("Starting test");

setTimeout(() => console.log("--- 200 ms ---"), 200);
setTimeout(() => console.log("--- 400 ms ---"), 400);
setTimeout(() => console.log("--- 600 ms ---"), 600);
setTimeout(() => console.log("--- 800 ms ---"), 800);
setTimeout(() => console.log("--- 1000 ms ---"), 1000);

pipe.resolve()
.then(() => console.log("pipe resolved", pipe));