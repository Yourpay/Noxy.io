import {init_chain, roles, users} from "../../app";
import Role from "../../objects/Role";
import * as env from "../../env.json";
import * as Promise from "bluebird";
import * as path from "path";
import * as _ from "lodash";
import * as fs from "fs";
import RoleUser from "../../objects/RoleUser";

init_chain.addPromise("role", (resolve, reject) => {
  Promise.all(_.map(env.roles, (role, key) =>
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
      .catch(err => reject(err))
    })
  ))
  .then(res =>
    Promise.all([
      new RoleUser({user_id: users["admin"].id, role_id: roles["admin"].id}).save(),
      new RoleUser({user_id: users["admin"].id, role_id: roles["user"].id}).save(),
      new RoleUser({user_id: users["server"].id, role_id: roles["admin"].id}).save(),
      new RoleUser({user_id: users["server"].id, role_id: roles["user"].id}).save()
    ])
    .then(res => resolve(res))
  )
  .catch(err => reject(err))
  .finally(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)));
});
