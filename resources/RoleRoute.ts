import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";

const options: Tables.iTableOptions = {
  junction: true
};
const columns: Tables.iTableColumns = {
  role_id:  {type: "binary(16)", protected: true, required: true, primary_key: true, index: ["role_id"], relations: {table: "role"}},
  route_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: ["route_id"], relations: {table: "route"}}
};

@Resources.implement<Resources.iResource>()
export default class RoleRoute extends Resources.Constructor {
  
  public static readonly __type: string = "role/route";
  public static readonly __table: Table = new Table(RoleRoute, options, columns);
  
  public role_id: Buffer;
  public route_id: Buffer;
  
  constructor(object?: iRoleUserObject) {
    super(object);
  }
  
}

interface iRoleUserObject {
  role_id: string | Buffer
  route_id: string | Buffer
}
