import PromiseQueue from "../classes/PromiseQueue";
import {env, init_queue} from "../app";
import Promise from "aigle";
import User from "../resources/User";
import Role from "../resources/Role";
import * as fs from "fs";
import * as path from "path";

export const resource_queue = new PromiseQueue(["user", "role"]);

resource_queue.promise("user", (resolve, reject) =>
  Promise.map(env.users, (user, key) =>
    new Promise((resolve, reject) =>
      (new User(user)).validate()
      .then(res => {
        if (res.exists) {
          let update = false;
          if (user.password) { (res.password = user.password) && (update = true); }
          if (user.email !== res.email) { (res.email = user.email) && (update = true); }
          if (user.username !== res.username) { (res.username = user.username) && (update = true); }
          if (!update) { return resolve(res); }
        }
        res.save()
        .then(res => {
          delete env.users[key].password;
          env.users[key].id = res.uuid;
          resolve(res);
        })
        .catch(err => reject(err));
      })
      .catch(err => reject(err))
    )
  )
  .tap(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

resource_queue.promise("role", (resolve, reject) =>
  Promise.map(env.roles, (role, key) =>
    new Promise((resolve, reject) =>
      (new Role(role)).validate()
      .then(res => {
        if (res.exists) {
          let update = false;
          if (role.name !== res.name) { (res.name = role.name) && (update = true); }
          if (!update) { return resolve(res); }
        }
        res.save()
        .then(res => {
          env.roles[key].id = res.uuid;
          resolve(res);
        })
        .catch(err => reject(err));
      })
      .catch(err => reject(err))
    )
  )
  .tap(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

init_queue.promise("resource", (resolve, reject) => resource_queue.execute().then(res => resolve(res), err => reject(err)));
