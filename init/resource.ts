import * as Promise from "bluebird";
import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";
import {env, init_queue} from "../app";
import PromiseQueue from "../classes/PromiseQueue";
import Role from "../resources/Role";
import RoleUser from "../resources/RoleUser";
import User from "../resources/User";

export const resource_queue = new PromiseQueue(["user", "role", "role/user"]);

resource_queue.promise("user", (resolve, reject) =>
  Promise.all(_.map(env.users, (user, key) =>
    Promise.map([1, 2], i =>
      new User(user)
      .validate()
      .catch(err => Promise.reject(err))
      .then(res => {
        if (res.exists) {
          let update = false;
          if (user.password) { (res.password = user.password) && (update = true); }
          if (user.email !== res.email) { (res.email = user.email) && (update = true); }
          if (user.username !== res.username) { (res.username = user.username) && (update = true); }
          if (!update) { return res; }
        }
        return res
        .save({update_protected: true})
        .then(res => {
          delete env.users[key].password;
          env.users[key].id = res.uuid;
          return res;
        });
      })
    ))
  )
  .tap(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

resource_queue.promise("role", (resolve, reject) =>
  Promise.all(_.map(env.roles, (role, key) =>
    new Role(role)
    .validate()
    .then(res => {
      if (res.exists) {
        let update = false;
        if (role.name !== res.name) { (res.name = role.name) && (update = true); }
        if (!update) { return res; }
      }
      return res
      .save({update_protected: true})
      .then(res => {
        env.roles[key].id = res.uuid;
        return res;
      });
    })
  ))
  .tap(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
  .then(res => resolve(res))
  .catch(err => reject(err))
);

resource_queue.promise("role/user", (resolve, reject) =>
  Promise.map(_.values(env.roles), role =>
    Promise.map(_.values(env.users), user =>
      new RoleUser({role_id: role.id, user_id: user.id})
      .save({update_protected: true})
    )
  )
  .then(res => resolve(res))
  .catch(err => reject(err))
);

init_queue.promise("resource", (resolve, reject) => resource_queue.execute().then(res => resolve(res), err => reject(err)));
