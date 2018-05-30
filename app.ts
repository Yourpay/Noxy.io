import DBPool, {default as DB} from "./classes/DB";
import * as _ from "lodash";
import * as env from "./env.json";
import Role from "./objects/Role";
import User from "./objects/User";
import {Include} from "./modules/Include";
import * as Promise from "bluebird";
import PromiseQueue from "./classes/PromiseQueue";

export const db: {[mode: string]: DBPool} = _.mapValues(env.databases, env_db => new DB(env_db));
export const users: {[id: string]: User} = {};
export const roles: {[id: string]: Role} = {};

export const init_queue = new PromiseQueue(["db", "object", "routing", "publicize"]);

new Promise((resolve, reject) =>
  Include({path: __dirname + "/init"})
  .then(() =>
    Include({path: __dirname + "/plugins", filter: /^[\w\d\s]+\\init\.js/})
    .then(() =>
      init_queue.execute()
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

