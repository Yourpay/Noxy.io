import DBConnection from "../../classes/DBConnection";
import {db, init_chain, roles, users} from "../../app";
import * as Promise from "bluebird";
import * as env from "../../env.json";
import * as _ from "lodash";
import Role from "../../objects/Role";
import * as fs from "fs";
import * as path from "path";
import User from "../../objects/User";

// export default init_chain.addPromise("role", (resolve, reject) => {
//   db[env.mode].link()
//   .then((link: DBConnection) => {
//     Promise.all(_.map(env.roles, (r: any) => new Role(r).save(users["server"])))
//     .then(res => {
//       _.each(res, (role: Role, i) => {
//         const index = _.keys(env.roles)[i];
//         env.roles[index] = _.pick((roles[index] = role), ["uuid", "name", "key"]);
//       });
//       fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env));
//       resolve(res);
//     })
//     .catch(err => reject(err))
//     .finally(() => link.close());
//   })
//   .catch(err => reject(err));
// });
