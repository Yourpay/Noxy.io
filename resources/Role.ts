import * as _ from "lodash";
import {env} from "../app";
import * as Resource from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import User from "./User";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  user_created: Table.generateUserColumn("user_created"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn(null, true)
};

@Resource.implement<Resource.iResource>()
export default class Role extends Resource.Constructor {
  
  public static readonly __type: string = "role";
  public static readonly __table: Table = new Table(Role, options, columns);
  
  public name: string;
  public key: string;
  public user_created: Buffer;
  public time_created: number;
  public time_updated: number;
  
  constructor(object: iResourceObject = {}) {
    super(object);
    if (!object.key) { this.key = _.snakeCase(_.deburr(object.name)); }
    this.time_created = object.time_created ? object.time_created : Date.now();
    this.user_created = Resource.Constructor.bufferFromUuid(_.get(object, "user_created.id", env.users.server.id));
  }
  
}

interface iQueryObject {
  id?: string
  name?: string
  key?: string
  user_created?: User
  time_created?: number
  time_updated?: number
}

interface iResourceObject extends iQueryObject {

}
