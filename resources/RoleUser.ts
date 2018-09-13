import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

const definition: iTableDefinition = {
  role_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: "role_id", reference: eResourceType.ROLE},
  user_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: "user_id", reference: eResourceType.USER}
};
const options = {resource: {junction: true}};

export default class RoleUser extends Resource.Constructor {
  
  public role_id: Buffer | string;
  public user_id: Buffer | string;
  
  constructor(initializer: tNonFnPropsOptional<RoleUser> = {}) {
    super(initializer);
    this.role_id = typeof initializer.role_id === "string" ? Resource.bufferFromUUID(initializer.role_id) : initializer.role_id;
    this.user_id = typeof initializer.user_id === "string" ? Resource.bufferFromUUID(initializer.user_id) : initializer.user_id;
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_USER, RoleUser, definition, options);
