import PromiseChain from "./classes/PromiseChain";
import DBPool, {default as DB} from "./classes/DB";
import * as requireAll from "require-all";
import * as _ from "lodash";
import * as env from "./env.json";
import Role from "./objects/Role";
import User from "./objects/User";
import Element from "./classes/Element";

export const db: { [key: string]: DBPool } = _.mapValues(env.databases, env_db => new DB(env_db));
export const users: { [key: string]: User } = {};
export const roles: { [key: string]: Role } = {};
export const elements: { [key: string]: typeof Element } = _.transform(requireAll(__dirname + "/objects"), (r, v: { [key: string]: typeof Element }) => _.set(r, v.default.__type, v.default), {});
export const init_chain = new PromiseChain([
  "pre-db", "db", "post-db",
  "pre-table", "table", "post-table",
  "pre-user", "user", "post-user",
  "pre-role", "role", "post-role",
  "pre-route", "route", "post-route",
  "pre-publicize", "publicize", "post-publicize"
]);

requireAll(__dirname + "/init");
requireAll({
  dirname: __dirname + "/plugins",
  filter:  /init\.js/
});

init_chain.cycle()
.catch(err => {
  console.error(err);
  process.exitCode = 1;
});


