import PromiseQueue from "../classes/PromiseQueue";
import {env, init_queue, roles, users} from "../app";
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
        if ((users[key] = res).exists) {
          let update = false;
          if (user.password) { (users[key].password = user.password) && (update = true); }
          if (user.email !== users[key].email) { (users[key].email = user.email) && (update = true); }
          if (user.username !== users[key].username) { (users[key].username = user.username) && (update = true); }
          if (!update) { return resolve(users[key]); }
        }
        users[key].save()
        .then(res => {
          delete env.users[key].password;
          env.users[key].id = users[key].uuid;
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
        if ((roles[key] = res).exists) {
          let update = false;
          if (role.name !== roles[key].name) { (roles[key].name = role.name) && (update = true); }
          if (!update) { return resolve(roles[key]); }
        }
        roles[key].save()
        .then(res => {
          env.roles[key].id = roles[key].uuid;
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
