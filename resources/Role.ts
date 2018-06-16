import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import {Table} from "../classes/Table";

const options: Tables.iTableOptions = {};

const columns: Tables.iTableColumns = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: ["key"]},
  user_created: Table.generateUserColumn("user_created"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export class User extends Resources.Constructor {
  
  public static __table: Table = new Table("role", options, columns);
  public name: string;
  public key: string;
  public user_created: User;
  public time_created: boolean;
  public time_updated: boolean;
  
  constructor(object?: iUserObject) {
    super(object);
  }
  
  public static get() {
  
  }
  
}

interface iUserObject {
  id?: string
  username: string
  email: string
  password?: string
  salt?: string
  hash?: string
  time_login?: number
  time_created?: number
}
