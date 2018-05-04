import {init_chain, users} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as _ from "lodash";
import * as Promise from "bluebird";
import * as fs from "fs";
import * as path from "path";
import RoleUser from "../../objects/RoleUser";
import ServerError from "../../classes/ServerError";

init_chain.addPromise("user", (resolve, reject) => {
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
  .finally(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)));
});
