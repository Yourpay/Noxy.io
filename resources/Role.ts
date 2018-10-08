import {env} from "../globals";
import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import User from "./User";

const definition = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  user_created: Resource.Table.toReferenceColumn<eResourceType>(eResourceType.USER),
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class Role extends Resource.Constructor {
  
  public name: string;
  public key: string;
  public user_created: User | Buffer | string;
  public time_created: number;
  public time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<Role> = {}) {
    super(initializer);
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
    if (!initializer.key) { this.key = Resource.toKey(initializer.name); }
    if (!initializer.user_created) { this.user_created = Resource.bufferFromUUID(env.users.server.id); }
  }
  
}

Resource<eResourceType>(eResourceType.ROLE, Role, definition, options);
