import * as Promise from "bluebird";
import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";
import {env, init_queue} from "../app";
import PromiseQueue from "../classes/PromiseQueue";
import * as Response from "../modules/Response";
import Role from "../resources/Role";
import RoleUser from "../resources/RoleUser";
import User from "../resources/User";
import Test from "../resources/Test";

export const resource_queue = new PromiseQueue(["user", "role", "role/user"]);

resource_queue.promise("test", (resolve, reject) => {
  const b = new Test({name: "Test", key: "any", template: 1, type: 1, user_created: env.users.server.id});
  b.save({update_protected: true})
  .then(res => {
    resolve(res);
  })
  .catch(err => {
    reject(err);
  });
});

resource_queue.promise("user", (resolve, reject) => {
  Promise.props(_.mapValues(env.users, (user, key) => {
    return new User(user).validate()
    .then(resource => {
      if (!user.password && _.isEqual(_.assign({}, resource, user), resource)) { return resource; }
      return resource.save({update_protected: true})
      .tap(resource => {
        delete env.users[key].password;
        env.users[key].id = resource.uuid;
      });
    });
  }))
  .tap(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
  .then(res => resolve(res))
  .catch(err => reject(new Response.error(err.code, err.type, err)));
});

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
