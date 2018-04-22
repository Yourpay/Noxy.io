import PromiseChain from "./classes/PromiseChain";
import DBPool, {default as DB} from "./classes/DB";
import * as express from "express";
import * as requireAll from "require-all";
import * as _ from "lodash";
import * as env from "./env.json";
import Role from "./objects/Role";
import User from "./objects/User";
import Element from "./classes/Element";
import Router from "./classes/Router";
import {Application} from "./modules/Application";

export const router = express();
export const db: { [key: string]: DBPool } = _.mapValues(env.databases, env_db => new DB(env_db));
export const users: { [key: string]: User } = {};
export const roles: { [key: string]: Role } = {};
export const elements: { [key: string]: Element } = {};
export const init_chain = new PromiseChain().addLink("db").addLink("table").addLink("user").addLink("role");

requireAll(__dirname + "/init");

init_chain.cycle()
.catch(err => {
  console.error(err);
  process.exitCode = 1;
})
.then((res) => {
  Application.listen();
});


