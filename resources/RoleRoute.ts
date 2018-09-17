import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import Role from "./Role";

const definition: iTableDefinition = {
  role_id:  Resource.Table.toReferenceColumn<eResourceType>(eResourceType.ROLE),
  route_id: Resource.Table.toReferenceColumn<eResourceType>(eResourceType.ROUTE)
};
const options = {resource: {junction: true}};

export default class RoleRoute extends Resource.Constructor {
  
  public role_id: string | Buffer | Role;
  public route_id: string | Buffer | Role;
  
  constructor(initializer: tNonFnPropsOptional<RoleRoute> = {}) {
    super(initializer);
    if (initializer.role_id) {
      if (typeof initializer.role_id === "string") { this.role_id = Resource.bufferFromUUID(initializer.role_id); }
      else if (initializer.role_id instanceof Buffer) { this.role_id = initializer.role_id; }
      else { this.role_id = initializer.role_id.id; }
    }
    if (initializer.route_id) {
      if (typeof initializer.route_id === "string") { this.route_id = Resource.bufferFromUUID(initializer.route_id); }
      else if (initializer.route_id instanceof Buffer) { this.route_id = initializer.route_id; }
      else { this.route_id = initializer.route_id.id; }
    }
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_ROUTE, RoleRoute, definition, options);
