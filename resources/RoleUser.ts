import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import Role from "./Role";
import User from "./User";

const definition: iTableDefinition = {
  role_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: "role_id", reference: eResourceType.ROLE},
  user_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: "user_id", reference: eResourceType.USER}
};
const options = {resource: {junction: true}};

export default class RoleUser extends Resource.Constructor {
  
  public role_id: string | Buffer | Role;
  public user_id: string | Buffer | User;
  
  constructor(initializer: tNonFnPropsOptional<RoleUser> = {}) {
    super(initializer);
    if (initializer.role_id) {
      if (typeof initializer.role_id === "string") { this.role_id = Resource.bufferFromUUID(initializer.role_id); }
      else if (initializer.role_id instanceof Buffer) { this.role_id = initializer.role_id; }
      else { this.role_id = initializer.role_id.id; }
    }
    if (initializer.user_id) {
      if (typeof initializer.user_id === "string") { this.user_id = Resource.bufferFromUUID(initializer.user_id); }
      else if (initializer.user_id instanceof Buffer) { this.user_id = initializer.user_id; }
      else { this.user_id = initializer.user_id.id; }
    }
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_USER, RoleUser, definition, options);
