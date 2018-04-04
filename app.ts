import PromiseChain from "./classes/PromiseChain";
import DBPool from "./classes/DBPool";
import * as express from "express";
import User from "./objects/User";

export const db: { [key: string]: DBPool } = {};
export const users = {};
export const roles = {};
export const init_chain = new PromiseChain();
export const router = express();

const user = new User({id: "test", username: "something else", "password": "test"});

console.log("Normal user", user);
console.log("Parsed user", user.toObject());

//
// requireAll(__dirname + "/init");
// init_chain.cycle()
// .then((res) => {
//   console.log(users);
//   console.log(roles);
// })
// .catch(err => console.error(err));

