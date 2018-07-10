import * as Resource from "../classes/Resource";
import * as Responses from "../modules/Response";
import * as Application from "../modules/Application";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import * as JWT from "jsonwebtoken";
import * as crypto from "crypto";
import * as _ from "lodash";
import Promise from "aigle";
import {env} from "../app";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  username:     {type: "varchar(64)", required: true, protected: true, unique_index: ["username"]},
  email:        {type: "varchar(128)", required: true, protected: true, unique_index: ["email"]},
  salt:         {type: "binary(64)", required: true, protected: true, hidden: true},
  hash:         {type: "binary(64)", required: true, protected: true, hidden: true},
  time_login:   Table.generateTimeColumn("time_login"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn()
};

@Resource.implement<Resource.iResource>()
export default class User extends Resource.Constructor {
  
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
  
  public static login(credentials: User | {username?: string, email?: string, password: string}): Promise<Responses.JSON> {
    let promise;
    if (credentials instanceof User && credentials.exists) { promise = Promise.resolve(credentials); }
    if (!(credentials.username || credentials.email) && !credentials.password) { promise = Promise.reject(new Responses.JSON(401, "any")); }
    return (promise || new User(<iUserObject>credentials).validate())
    .then(user => !user.exists ? Promise.reject(new Responses.JSON(401, "any")) : _.set(user, "time_login", Date.now()).save())
    .then(user => new Responses.JSON(200, "any", JWT.sign(_.merge({id: user.uuid}, _.pick(user, ["username", "email", "time_login", "time_created"])), env.tokens.jwt, {expiresIn: "7d"})));
  }
  
  public static generateSalt(): Buffer {
    return crypto.randomBytes(64);
  }
  
  public static generateHash(password: string, salt: Buffer) {
    return crypto.pbkdf2Sync(password, salt.toString("base64"), 10000, 64, "sha512");
  }
  
}

Application.addRoute(env.subdomains.api, User.__type, "/login", "POST", (request, response) => {
  User.login(request.body)
  .catch(err => err instanceof Responses.JSON ? err : new Responses.JSON(500, "any"))
  .then(res => response.status(res.code).json(res));
});

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
