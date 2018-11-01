import * as Promise from "bluebird";
import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";
import {env, init_pipe} from "../globals";
import {ePromisePipeStagesInit} from "../interfaces/iPromisePipe";
import * as PromisePipe from "../modules/PromisePipe";
import Role from "../resources/Role";
import User from "../resources/User";
import UserRole from "../resources/UserRole";

export enum ePromisePipeStagesInitResource {
  USER      = 0,
  ROLE      = 1,
  ROLE_USER = 2,
  PLUGIN    = 3,
}

export const resource_pipe = PromisePipe(ePromisePipeStagesInitResource);

resource_pipe.add(ePromisePipeStagesInitResource.USER, () =>
  Promise.props(_.mapValues(env.users, (user, key) =>
    new User(user).validate()
    .then(resource => {
      if (!user.password && _.isEqual(_.assign({}, resource, user), resource)) { return resource; }
      return resource.save({update_protected: true})
      .tap(resource => {
        delete env.users[key].password;
        env.users[key].id = resource.uuid;
      });
    }))
  )
  .tap(() => fs.writeFileSync(path.resolve(process.cwd(), "./env.json"), JSON.stringify(env, null, 2)))
);

resource_pipe.add(ePromisePipeStagesInitResource.ROLE, () =>
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
);

resource_pipe.add(ePromisePipeStagesInitResource.ROLE_USER, () =>
  Promise.map(_.values(env.roles), role =>
    Promise.map(_.values(env.users), user =>
      new UserRole({role_id: role.id, user_id: user.id})
      .save({update_protected: true})
    )
  )
);

init_pipe.add(ePromisePipeStagesInit.RESOURCE, () => resource_pipe.resolve());
