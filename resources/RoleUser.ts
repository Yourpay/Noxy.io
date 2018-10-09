import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import Role from "./Role";
import User from "./User";

const definition: iTableDefinition = {
  role_id: {type: "binary", length: 16, protected: true, required: true, primary_key: true, index: "role_id", reference: eResourceType.ROLE},
  user_id: {type: "binary", length: 16, protected: true, required: true, primary_key: true, index: "user_id", reference: eResourceType.USER}
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
