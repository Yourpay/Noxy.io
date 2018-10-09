import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import Role from "./Role";
import User from "./User";

const definition: iTableDefinition = {
  role_id: Resource.Table.toPrimaryColumn<eResourceType>(eResourceType.ROLE),
  user_id: Resource.Table.toPrimaryColumn<eResourceType>(eResourceType.USER)
};
const options = {resource: {junction: true}};

export default class RoleUser extends Resource.Constructor {
  
  public role_id: string | Buffer | Role;
  public user_id: string | Buffer | User;
  
  constructor(initializer: tNonFnPropsOptional<RoleUser> = {}) {
    super(initializer);
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_USER, RoleUser, definition, options);
