import {init_chain, roles, elements, users} from "../../app";
import User from "../../objects/User";
import * as env from "../../env.json";
import * as _ from "lodash";
import * as Promise from "bluebird";
import * as fs from "fs";
import * as path from "path";

init_chain.addPromise("user", (resolve, reject) => {
  Promise.all(_.map(env.users, (user, key) =>
    new Promise((resolve, reject) => {
      users[key] = new User(user);
      const changed = !_.isEqual(user, users[key].toObject());
      users[key].validate()
      .catch(err => err.code === "404.db.select" ? this : reject(err))
      .then(res => {
        delete env.users[key].password;
        env.users[key].id = users[key].uuid;
        if (users[key].validated && !changed) { return resolve(res); }
        users[key].save()
        .then(res => resolve(res))
        .catch(err => reject(err));
      });
    })
  ))
  .then(res => resolve(res))
  .catch(err => reject(err))
  .finally(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)));
});
