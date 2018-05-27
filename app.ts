import PromiseChain from "./classes/PromiseChain";
import DBPool, {default as DB} from "./classes/DB";
import * as _ from "lodash";
import * as env from "./env.json";
import Role from "./objects/Role";
import User from "./objects/User";
import {Include} from "./modules/Include";
import * as Promise from "bluebird";

export const db: {[mode: string]: DBPool} = _.mapValues(env.databases, env_db => new DB(env_db));
export const users: {[id: string]: User} = {};
export const roles: {[id: string]: Role} = {};
export const init_chain = new PromiseChain([
  "pre-table", "table", "post-table",
  "pre-db", "db", "post-db",
  "pre-user", "user", "post-user",
  "pre-role", "role", "post-role",
  "pre-route", "route", "post-route",
  "pre-publicize", "publicize", "post-publicize"
]);

new Promise((resolve, reject) =>
  Include({path: __dirname + "/init"})
  .then(() =>
    Include({path: __dirname + "/plugins", filter: /^[\w\d\s]+\\init\.js/})
    .then(() =>
      init_chain.cycle()
      .then(() => resolve())
      .catch(err => reject(err))
    )
    .catch(err => reject(err))
  )
  .catch(err => reject(err))
)
.catch(err => {
  console.error(err);
  process.exitCode = 1;
});

