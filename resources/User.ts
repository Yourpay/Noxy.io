import * as crypto from "crypto";
import * as JWT from "jsonwebtoken";
import Promise from "aigle";
import * as Resources from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import Endpoint from "../classes/Endpoint";
import ServerMessage from "../classes/ServerMessage";
import {env} from "../app";
import * as _ from "lodash";

const type = "user";
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
const table = new Table(type, options, columns);
const endpoint = new Endpoint(env.subdomains.api, type)
.addRoute("POST", "/login", Endpoint.auth, (request, response) => User.login(response.locals.user || request.body).then(res => Endpoint.response(response, res), err => Endpoint.response(response, err)));

@Resources.implement<Resources.iResource>()
export default class User extends Resources.Constructor {
  
  public static __table: Table = table;
  public static __endpoint: Endpoint = endpoint.addResource(User);
  
  public username: string;
  public email: string;
  public salt: Buffer;
  public hash: Buffer;
  public time_login: number;
  public time_created: number;
  
  public __password: string;
  
  constructor(object?: iUserObject) {
    super(object);
    if (this.password) {
      this.salt = User.generateSalt();
      this.hash = User.generateHash(this.password, this.salt);
      delete this.password;
    }
    this.time_created = Date.now();
  }
  
  public get password() {
    return this.__password;
  }
  
  public set password(pw) {
    this.salt = User.generateSalt();
    this.hash = User.generateHash(pw, this.salt);
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
