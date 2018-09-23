import * as _ from "lodash";
import * as Include from "../modules/Include";

console.log("#### Test 1 ####");
console.log("Result", Include("./tests/imports", {sync: true}));
console.log("#### Test 2 ####");
console.log("Result", Include("./tests/imports", {sync: true, filter: "**/*.js"}));
console.log("#### Test 3 ####");
console.log("Result", Include("./tests/imports", {sync: true, filter: "**/*.js", recursive: true, hierarchy: true}));
console.log("#### Test 4 ####");
console.log("Result", Include("./tests/imports", {sync: true, filter: "**/*.js", recursive: true, transform: s => _.last(s.split("/"))}));

Include("./tests/imports")
.finally(() => console.log("#### Test 1 ####"))
.then(res => console.log("Result", res))
.catch(err => console.error("Error", err));

Include("./tests/imports", {filter: "**/*.js"})
.finally(() => console.log("#### Test 2 ####"))
.then(res => console.log("Result", res))
.catch(err => console.error("Error", err));

Include("./tests/imports", {filter: "**/*.js", hierarchy: true})
.finally(() => console.log("#### Test 3 ####"))
.then(res => console.log("Result", res))
.catch(err => console.error("Error", err));

Include("./tests/imports", {filter: "**/*.js", recursive: true, transform: s => _.last(s.split("/"))})
.finally(() => console.log("#### Test 4 ####"))
.then(res => console.log("Result", res))
.catch(err => console.error("Error", err));
