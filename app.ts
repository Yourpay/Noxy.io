import PromiseChain from "./classes/PromiseChain";
import DBPool from "./classes/DBPool";
import * as express from "express";
import User from "./objects/User";
import * as requireAll from "require-all";

export const db: { [key: string]: DBPool } = {};
export const users = {};
export const roles = {};
export const router = express();
export const init_chain = new PromiseChain();

requireAll(__dirname + "/init");

const user = new User({id: "test", username: "something else", "password": "test"});

console.log("Normal user", user);
console.log("Parsed user", user.toObject());

//

init_chain.cycle()
.then((res) => {
  console.log(users);
  console.log(roles);
})
.catch(err => console.error(err));

