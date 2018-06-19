import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import Endpoint from "../classes/Endpoint";
import {env} from "../app";

const type = "role/user";
const options: Tables.iTableOptions = {
  junction: true
};
const columns: Tables.iTableColumns = {
  role_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: ["role_id"], relations: {table: "role"}},
  user_id: {type: "binary(16)", protected: true, required: true, primary_key: true, index: ["user_id"], relations: {table: "user"}}
};
const table = new Table(type, options, columns);
const endpoint = new Endpoint(env.subdomains.api, type);

@Resources.implement<Resources.iResource>()
export default class RoleUser extends Resources.Constructor {
  
  public static __table: Table = table;
  public static __endpoint: Endpoint = endpoint.addResource(RoleUser);
  
  public role_id: Buffer;
  public user_id: Buffer;
  
  constructor(object?: iRoleUserObject) {
    super(object);
  }
  
}

interface iRoleUserObject {
  role_id: string | Buffer
  user_id: string | Buffer
}
