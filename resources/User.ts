import * as crypto from "crypto";
import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import {Table} from "../classes/Table";

const options: Tables.iTableOptions = {};

const columns: Tables.iTableColumns = {
  username:     {type: "varchar(32)", required: true, unique_index: ["username"]},
  email:        {type: "varchar(128)", required: true, unique_index: ["email"]},
  salt:         {type: "binary(64)", required: true, protected: true},
  hash:         {type: "binary(64)", required: true, protected: true},
  time_login:   Table.generateTimeColumn("time_login"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export class User extends Resources.Constructor {
  
  public static __table: Table = new Table("user", options, columns);
  public id: Buffer;
  public uuid: string;
  public username: string;
  public email: string;
  public password: string;
  public salt: Buffer;
  public hash: Buffer;
  public time_login: number;
  public time_created: number;
  
  constructor(object?: iUserObject) {
    super(object);
    if (this.password) {
      this.salt = User.generateSalt();
      this.hash = User.generateHash(this.password, this.salt);
      delete this.password;
    }
    this.time_created = Date.now();
  }
  
  public static generateSalt(): Buffer {
    return crypto.randomBytes(64);
  }
  
  public static generateHash(password: string, salt: Buffer) {
    return crypto.pbkdf2Sync(password, salt.toString("base64"), 10000, 64, "sha512");
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
