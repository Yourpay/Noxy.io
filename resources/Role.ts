import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import User from "./User";
import {env, users} from "../app";
import * as _ from "lodash";
import Endpoint from "../classes/Endpoint";

const type = "role";
const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: ["key"]},
  user_created: Table.generateUserColumn("user_created"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};
const table = new Table(type, options, columns);
const endpoint = new Endpoint(env.subdomains.api, type);

@Resources.implement<Resources.iResource>()
export default class Role extends Resources.Constructor {
  
  public static __table: Table = table;
  public static __endpoint: Endpoint = endpoint.addResource(Role);
  
  public name: string;
  public key: string;
  public user_created: Buffer;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iRoleObject) {
    super(object);
    this.time_created = Date.now();
    this.user_created = _.get(object, "user_created.id", users["server"].id);
  }
  
}

interface iRoleObject {
  id?: string
  name: string
  key: string
  user_created?: User
  time_created?: number
  time_updated?: number
}
