import {init_chain, roles, users} from "../../app";
import * as env from "../../env.json";
import * as _ from "lodash";
import * as Promise from "bluebird";
import Role from "../../objects/Role";

init_chain.addPromise("role", (resolve, reject) => {
  Promise.all(_.map(env.roles, (role, key) =>
    new Promise((resolve, reject) => {
      roles[key] = new Role(role);
      roles[key].validate()
      .catch(err => err.code === "404.db.select" ? this : reject(err))
      .then(res => {
        if (this.__validated) { resolve(res); }
        roles[key].save(users.server)
        .then(res => resolve(res))
        .catch(err => reject(err));
      });
    })
  ))
  .then(res => resolve(res))
  .catch(err => reject(err));
});
