import {env} from "../app";
import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {cResourceConstructor, eResourceType} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import User from "./User";

const definition = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  type:         {type: "int(11)", index: "type", default: 0},
  template:     {type: "int(11)", index: "type", default: 0},
  user_created: Resource.Table.toRelationColumn<eResourceType>(eResourceType.USER),
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class Test extends Resource.Constructor {
  
  name: string;
  key: string;
  type: number;
  template: number;
  user_created: Buffer | string;
  time_created: number;
  time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<Test> = {}) {
    super(initializer);
    if (initializer.user_created) {
      if (initializer.user_created instanceof User) {
        this.user_created = initializer.user_created.id;
      }
      else {
        this.user_created = typeof initializer.user_created === "string" ? Resource.bufferFromUUID(initializer.user_created) : initializer.user_created;
      }
    }
    else {
      this.user_created = Resource.bufferFromUUID(env.users.server.id);
    }
  }
  
}

Resource<eResourceType>(eResourceType.TEST, Test, definition, options);
