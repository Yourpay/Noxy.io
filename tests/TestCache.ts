import * as Promise from "bluebird";
import * as _ from "lodash";
import * as Cache from "../modules/Cache";

const tests = _.shuffle([
  {
    key: 0,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [0], () => new Promise(resolve => setTimeout(() => resolve({test: 0}), 300)))
    .then(res => print(true, 0, res))
    .catch(err => print(false, 0, err))
  },
  
  {
    key: 1,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [[0], [1]], () => new Promise(resolve => setTimeout(() => resolve({test: 1}), 300)))
    .then(res => print(true, 1, res))
    .catch(err => print(false, 1, err))
  },
  
  {
    key: 2,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [1], () => new Promise(resolve => setTimeout(() => resolve({test: 2}), 300)))
    .then(res => print(true, 2, res))
    .catch(err => print(false, 2, err))
  },
  
  {
    key: 3,
    fn:  () => Cache.try(Cache.types.QUERY, "test", [0], () => new Promise(resolve => setTimeout(() => resolve({test: 3}), 300)))
    .then(res => print(true, 3, res))
    .catch(err => print(false, 3, err))
  },
  
  {
    key: 4,
    fn:  () => Cache.try(Cache.types.QUERY, "test", [1], () => new Promise(resolve => setTimeout(() => resolve({test: 4}), 300)))
    .then(res => print(true, 4, res))
    .catch(err => print(false, 4, err))
  },
  
  {
    key: 5,
    fn:  () => Cache.try(Cache.types.QUERY, "test", [[0], [1]], () => new Promise(resolve => setTimeout(() => resolve({test: 5}), 300)))
    .then(res => print(true, 5, res))
    .catch(err => print(false, 5, err))
  },
  
  {
    key: 6,
    fn:  () => Cache.try(Cache.types.QUERY, "test", [2], () => new Promise(resolve => setTimeout(() => resolve({test: 6}), 300)))
    .then(res => print(true, 6, res))
    .catch(err => print(false, 6, err))
  },
  
  {
    key: 7,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [[3], [3]], () => new Promise(resolve => setTimeout(() => resolve({test: 7}), 300)))
    .then(res => print(true, 7, res))
    .catch(err => print(false, 7, err))
  },
  
  {
    key: 8,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [[4], [5]], () => new Promise(resolve => setTimeout(() => resolve({test: 8}), 300)))
    .then(res => print(true, 8, res))
    .catch(err => print(false, 8, err))
  },
  
  {
    key: 9,
    fn:  () => Cache.try(Cache.types.QUERY, "test", [[6], [7]], () => new Promise(resolve => setTimeout(() => resolve({test: 9}), 300)))
    .then(res => print(true, 9, res))
    .catch(err => print(false, 9, err))
  },
  
  {
    key: 10,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [[5], [6]], () => new Promise(resolve => setTimeout(() => resolve({test: 10}), 300)))
    .then(res => print(true, 10, res))
    .catch(err => print(false, 10, err))
  },
  
  {
    key: 11,
    fn:  () => Cache.set(Cache.types.QUERY, "test", [[5], [6]], () => new Promise(resolve => setTimeout(() => resolve({test: 11}), 300)))
    .then(res => print(true, 11, res))
    .catch(err => print(false, 11, err))
  },
  
  {
    key: -1,
    fn:  () => Cache.get(Cache.types.QUERY, "test", [0])
    .then(res => print(true, -1, res))
    .catch(err => print(false, -1, err))
  }
]);

_.each(tests, t => console.log("Calling", t.key) || t.fn());

for (let i = 1; i < 4; i++) {
  setTimeout(() => console.log(i * 100 + "milliseconds passed."), i * 100);
}

setTimeout(() => print(true, "Namespace All", Cache.getNamespace(Cache.types.QUERY, "test", {value: true})), 1000);

function print(success, number, content) {
  console.log("-------------------");
  console.log((success ? "Result" : "Error") + " of Test #" + number);
  console.log(content);
}