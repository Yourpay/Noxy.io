import * as crypto from "crypto";
import * as JWT from "jsonwebtoken";
import Promise from "aigle";
import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import ServerMessage from "../classes/ServerMessage";
import {env} from "../app";
import * as _ from "lodash";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  username:     {type: "varchar(32)", required: true, protected: true, unique_index: ["username"]},
  email:        {type: "varchar(128)", required: true, protected: true, unique_index: ["email"]},
  salt:         {type: "binary(64)", required: true, protected: true, hidden: true},
  hash:         {type: "binary(64)", required: true, protected: true, hidden: true},
  time_login:   Table.generateTimeColumn("time_login"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resources.implement<Resources.iResource>()
export default class User extends Resources.Constructor {
  
  public static readonly __type: string = "user";
  public static readonly __table: Table = new Table(User, options, columns);
  
  public username: string;
  public email: string;
  public salt: Buffer;
  public hash: Buffer;
  public time_login: number;
  public time_created: number;
  
  private __password: string;
  
  constructor(object?: iUserObject) {
    super(object);
    if (this.password) {
      this.salt = User.generateSalt();
      this.hash = User.generateHash(this.password, this.salt);
      delete this.password;
    }
    this.time_created = Date.now();
  }
  
  public set password(value) {
    this.salt = User.generateSalt();
    this.hash = User.generateHash(value, this.salt);
  }
  
  public static login(credentials: User | {username?: string, email?: string, password: string}): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      if (credentials instanceof User) { return resolve(credentials); }
      if (!(credentials.username || credentials.password) && !credentials.password) { return reject(reject(new ServerMessage(401, "any"))); }
      new User(credentials).validate()
      .then(res => !res.exists ? reject(new ServerMessage(401, "any")) : _.set(res, "time_login", Date.now()).save()
        .then(res => resolve(res))
        .catch(err => reject(err))
      )
      .catch(err => reject(err));
    })
    .then((res: User) => new ServerMessage(200, "any", JWT.sign(_.merge({id: res.uuid}, _.pick(res, ["username", "email", "time_login", "time_created"])), env.tokens.jwt, {expiresIn: "7d"})));
  }
  
  public static generateSalt(): Buffer {
    return crypto.randomBytes(64);
  }
  
  public static generateHash(password: string, salt: Buffer) {
    return crypto.pbkdf2Sync(password, salt.toString("base64"), 10000, 64, "sha512");
  }
  
}

interface iUserObject {
  id?: string
  username?: string
  email?: string
  password?: string
  salt?: Buffer
  hash?: Buffer
  time_login?: number
  time_created?: number
}
