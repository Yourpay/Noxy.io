import * as Promise from "bluebird";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import {env} from "../app";
import * as Resource from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import {publicize_queue} from "../init/publicize";
import * as Application from "../modules/Application";
import * as Cache from "../modules/Cache";
import * as Response from "../modules/Response";
import Route from "./Route";

const options: Tables.iTableOptions = {};
const columns: Tables.iTableColumns = {
  username:     {type: "varchar(64)", required: true, protected: true},
  email:        {type: "varchar(128)", required: true, protected: true, unique_index: "email"},
  salt:         {type: "binary(64)", required: true, protected: true, hidden: true},
  hash:         {type: "binary(64)", required: true, protected: true, hidden: true},
  time_login:   Table.generateTimeColumn("time_login"),
  time_created: Table.generateTimeColumn("time_created"),
  time_updated: Table.generateTimeColumn(null, true)
};

@Resource.implement<Resource.iResource>()
export default class User extends Resource.Constructor {
  
  public static readonly __type: string = "user";
  public static readonly __table: Table = new Table(User, options, columns);
  private static __login_callbacks: ((user: iUserJWTObject) => Promise<Object>)[] = [];
  public username: string;
  public email: string;
  public salt: Buffer;
  public hash: Buffer;
  public time_login: number;
  public time_created?: number;
  private __password: string;
  
  constructor(object: iResourceObject = {}) {
    super(object);
    if (this.password) {
      this.salt = User.generateSalt();
      this.hash = User.generateHash(this.password, this.salt);
      delete this.password;
    }
    this.time_created = object.time_created ? object.time_created : Date.now();
  }
  
  public static get login_callbacks() {
    return _.clone(User.__login_callbacks);
  }
  
  public set password(value) {
    this.salt = User.generateSalt();
    this.hash = User.generateHash(value, this.salt);
  }
  
  public static generateSalt(): Buffer {
    return crypto.randomBytes(64);
  }
  
  public static generateHash(password: string, salt: Buffer) {
    return crypto.pbkdf2Sync(password, salt.toString("base64"), 10000, 64, "sha512");
  }
  
  public static addLoginCallback(callback: (user: iUserJWTObject) => Promise<Object>): void {
    User.__login_callbacks.push(callback);
  }
  
  public static login(credentials: User | iUserCredentials, jwt?: string): Promise<User> {
    return User.loginPW(credentials).catch(err => jwt ? User.loginJWT(jwt) : Promise.reject(err));
  }
  
  private static loginPW(credentials: User | iUserCredentials): Promise<User> {
    return (credentials instanceof User ? credentials : new User(credentials)).validate()
    .then(user => {
      if (!user.exists) { return Promise.reject(new Response.json(400, "any")); }
      return Promise.resolve(user);
    })
    .then(user => {
      if (!_.isEqual(user.hash, User.generateHash(credentials.password, user.salt))) { return Promise.reject(new Response.json(400, "any")); }
      return _.set(user, "time_login", Date.now()).save({update_protected: true});
    });
  }
  
  private static loginJWT(token?: string): Promise<User> {
    return (<any>Promise.promisify(jwt.verify))(token, env.tokens.jwt)
    .then(decoded => new User(decoded).validate())
    .then(user => _.set(user, "time_login", Date.now()).save());
  }
  
}

publicize_queue.promise("setup", resolve => {
  Application.addRoute(env.subdomains.api, User.__type, "/login", "POST", (request, response) =>
    User.login(request.body, request.get("Authorization"))
    .then(user => _.merge({id: user.uuid}, _.pick(user, ["username", "email", "time_login"])))
    .then(user => Promise.map(User.login_callbacks, fn => fn(user)).reduce((result, value) => _.merge(result, value), user))
    .then(user => new Response.json(200, "any", jwt.sign(user, env.tokens.jwt, {expiresIn: "7d"})))
    .catch(err => err instanceof Response.json ? err : new Response.json(500, "any", err))
    .then(res => response.status(res.code).json(res))
  )
  .finally(() => resolve());
});

publicize_queue.promise("publish", (resolve, reject) => {
  Promise.all([
    Cache.getOne<Route>(Cache.types.RESOURCE, Route.__type, Cache.toKey([env.subdomains.api, "/user/login", "POST"])).then(route => Application.updateRoute(_.set(route, "flag_active", 1)))
  ])
  .then(res => resolve(res))
  .catch(err => reject(err));
});

interface iUserJWTObject {
  id: string
  username: string
  email: string
  time_login: number
}

interface iUserCredentials {
  email: string
  password: string
}

interface iQueryObject {
  id?: string
  username?: string
  email?: string
  salt?: Buffer
  hash?: Buffer
  time_login?: number
  time_created?: number
}

interface iResourceObject extends iQueryObject {
  password?: string
}
