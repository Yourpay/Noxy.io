import {init_chain, init_queue, roles, users} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import * as Promise from "aigle";
import PromiseQueue from "../../classes/PromiseQueue";
import Role from "../../objects/Role";
import RoleUser from "../../objects/RoleUser";

export const object_chain = new PromiseQueue(["user", "role"]);

object_chain.promise("user", (resolve, reject) =>
  Promise.all(_.map(env.users, (user, key) =>
    new Promise((resolve, reject) => {
      users[key] = new User(user);
      const changed = !_.isEqual(user, users[key].toObject());
      users[key].validate()
      .then(res => {
        if (users[key].exists && !changed) { return resolve(res); }
        users[key].save()
        .then(res => {
          delete env.users[key].password;
          env.users[key].id = users[key].uuid;
          resolve(res);
        })
        .catch(err => reject(err));
      })
      .catch(err => err);
    })
  ))
  .then(res => resolve(res))
  .catch(err => reject(err))
  .finally(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
);

object_chain.promise("user", (resolve, reject) =>
  Promise.map(env.roles, (role, key) =>
    new Promise((resolve, reject) => {
      roles[key] = new Role(role);
      const changed = !_.isEqual(role, roles[key].toObject());
      roles[key].validate()
      .then(res => {
        if (roles[key].exists && !changed) { return resolve(res); }
        roles[key].save(users.server)
        .then(res => {
          env.roles[key].id = roles[key].uuid;
          resolve(res);
        })
        .catch(err => reject(err));
      })
      .catch(err => reject(err));
    })
  )
  .then(() =>
    Promise.all([
      new RoleUser({user_id: users["admin"].id, role_id: roles["admin"].id}).save(),
      new RoleUser({user_id: users["admin"].id, role_id: roles["user"].id}).save(),
      new RoleUser({user_id: users["server"].id, role_id: roles["admin"].id}).save(),
      new RoleUser({user_id: users["server"].id, role_id: roles["user"].id}).save()
    ])
    .then(res => resolve(res))
  )
  .catch(err => reject(err))
  .finally(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
);

init_queue.promise("object", (resolve, reject) => object_chain.execute().then(res => resolve(res), err => reject(err)));
