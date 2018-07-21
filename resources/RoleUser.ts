import * as Resource from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";

const options: Tables.iTableOptions = {
  junction: true
};
const columns: Tables.iTableColumns = {
  role_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: ["role_id"], relation: {table: "role"}},
  user_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: ["user_id"], relation: {table: "user"}}
};

@Resource.implement<Resource.iResource>()
export default class RoleUser extends Resource.Constructor {
  
  public static readonly __type: string = "role/user";
  public static readonly __table: Table = new Table(RoleUser, options, columns);
  
  public role_id: Buffer;
  public user_id: Buffer;
  
  constructor(object?: iRoleUserObject) {
    super(object);
    this.role_id = typeof object.role_id === "string" ? Resource.Constructor.bufferFromUuid(object.role_id) : object.role_id;
    this.user_id = typeof object.user_id === "string" ? Resource.Constructor.bufferFromUuid(object.user_id) : object.user_id;
  }
  
}

interface iRoleUserObject {
  role_id: string | Buffer
  user_id: string | Buffer
}
