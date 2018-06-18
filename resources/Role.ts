import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import {Table} from "../classes/Table";
import User from "./User";
import {users} from "../app";
import * as _ from "lodash";

const options: Tables.iTableOptions = {};

const columns: Tables.iTableColumns = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: ["key"]},
  user_created: Table.generateUserColumn("user_created"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class Role extends Resources.Constructor {
  
  public static __table: Table = new Table("role", options, columns);
  public name: string;
  public key: string;
  public user_created: Buffer;
  public time_created: number;
  public time_updated: number;
  
  constructor(object?: iRoleObject) {
    super(object);
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
