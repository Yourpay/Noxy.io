import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

const definition: iTableDefinition = {
  role_id:  {type: "binary(16)", protected: true, required: true, primary_key: true, index: "role_id", reference: "role"},
  route_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: "route_id", reference: "route"}
};
const options = {resource: {junction: true}};

export default class RoleRoute extends Resource.Constructor {
  
  public role_id: Buffer | string;
  public route_id: Buffer | string;
  
  constructor(initializer: tNonFnPropsOptional<RoleRoute> = {}) {
    super(initializer);
    this.role_id = typeof initializer.role_id === "string" ? Resource.bufferFromUUID(initializer.role_id) : initializer.role_id;
    this.route_id = typeof initializer.route_id === "string" ? Resource.bufferFromUUID(initializer.route_id) : initializer.route_id;
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_ROUTE, RoleRoute, definition, options);
