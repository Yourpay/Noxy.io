import DBConnection from "../../classes/DBConnection";
import {db, init_chain, users} from "../../app";
import * as Promise from "bluebird";
import * as env from "../../env.json";
import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";
import User from "../../objects/User";

init_chain.addPromise("user", (resolve, reject) => {
  db[env.mode].link()
  .then((link: DBConnection) => {
    Promise.all(_.map(env.users, (u: any) => new User(_.omit(u, "password")).save(u.password)))
    .then(res => {
      _.each(res, (user: User, i) => {
        const index = _.keys(env.users)[i];
        env.users[index] = _.pick((users[index] = user), ["uuid", "username", "email"]);
      });
      fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env));
      resolve(res);
    })
    .catch(err => reject(err))
    .finally(() => link.close());
  })
  .catch(err => reject(err));
});
