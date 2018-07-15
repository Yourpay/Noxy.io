import Promise from "aigle";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import {env} from "../app";
import * as Resource from "../classes/Resource";
import * as Tables from "../classes/Table";
import Table from "../classes/Table";
import {publicize_queue} from "../init/publicize";
import * as Application from "../modules/Application";
import * as Responses from "../modules/Response";

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
  public time_created?: number;
  
  private __password: string;
  private static __login_callbacks: ((user: iUserJWTObject) => Promise<Object>)[] = [];
  
  constructor(object?: iUserObject) {
    super(object);
    if (this.password) {
      this.salt = User.generateSalt();
      this.hash = User.generateHash(this.password, this.salt);
      delete this.password;
    }
    this.time_created = object.time_created ? object.time_created : Date.now();
  }
  
  public set password(value) {
    this.salt = User.generateSalt();
    this.hash = User.generateHash(value, this.salt);
  }
  
  public static get login_callbacks() {
    return _.clone(User.__login_callbacks);
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
    return User.loginPW(credentials)
    .catch(err => jwt ? User.loginJWT(jwt) : Promise.reject(err));
  }
  
  private static loginPW(credentials: User | iUserCredentials): Promise<User> {
    return (credentials instanceof User ? credentials : new User(credentials)).validate()
    .then(user => user.exists ? Promise.resolve(user) : Promise.reject(new Responses.JSON(400, "any")))
    .then(user => _.isEqual(user.hash, User.generateHash(credentials.password, user.salt)) ? _.set(user, "time_login", Date.now()).save() : Promise.reject(new Responses.JSON(400, "any")));
  }
  
  private static loginJWT(token?: string): Promise<User> {
    return (<any>Promise.promisify(jwt.verify))(token, env.tokens.jwt)
    .then(decoded => new User(decoded).validate().then(user => _.set(user, "time_login", Date.now()).save()));
  }
  
}

publicize_queue.promise("setup", resolve => {
  Application.addRoute(env.subdomains.api, User.__type, "/login", "POST", (request, response) =>
    User.login(request.body, request.get("Authorization"))
    .then(user => _.merge({id: user.uuid}, _.pick(user, ["username", "email", "time_login"])))
    .then(user => Promise.map(User.login_callbacks, fn => fn(user)).reduce((result, value) => _.merge(result, value), user))
    .then(user => new Responses.JSON(200, "any", jwt.sign(user, env.tokens.jwt, {expiresIn: "7d"})))
    .catch(err => err instanceof Responses.JSON ? err : new Responses.JSON(500, "any", err))
    .then(res => response.status(res.code).json(res))
  );
  resolve();
});

interface iUserJWTObject {
  id: string
  username: string
  email: string
  time_login: number
}

interface iUserCredentials {
  username?: string
  email?: string
  password: string
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
