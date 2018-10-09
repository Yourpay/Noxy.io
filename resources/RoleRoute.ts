import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import Role from "./Role";

const definition: iTableDefinition = {
  role_id:  Resource.Table.toPrimaryColumn<eResourceType>(eResourceType.ROLE),
  route_id: Resource.Table.toPrimaryColumn<eResourceType>(eResourceType.ROUTE)
};
const options = {resource: {junction: true}};

export default class RoleRoute extends Resource.Constructor {
  
  public role_id: string | Buffer | Role;
  public route_id: string | Buffer | Role;
  
  constructor(initializer: tNonFnPropsOptional<RoleRoute> = {}) {
    super(initializer);
  }
  
}

Resource<eResourceType>(eResourceType.ROLE_ROUTE, RoleRoute, definition, options);
