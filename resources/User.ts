import * as Promise from "bluebird";
import * as crypto from "crypto";
import * as express from "express";
import * as jwt from "jsonwebtoken";
import * as _ from "lodash";
import {env} from "../globals";
import {iApplicationRequest, iApplicationResponse} from "../interfaces/iApplication";
import {tNonFnPropsOptional, tObject} from "../interfaces/iAuxiliary";
import {eResourceType, iTableDefinition} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";
import * as Response from "../modules/Response";

const definition: iTableDefinition = {
  username:     {type: "varchar", length: 64, required: true, protected: true},
  email:        {type: "varchar", length: 128, required: true, protected: true, unique_index: "email"},
  salt:         {type: "binary", length: 64, required: true, protected: true, hidden: true},
  hash:         {type: "binary", length: 64, required: true, protected: true, hidden: true},
  time_login:   Resource.Table.toTimeColumn("time_login"),
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

export default class User extends Resource.Constructor {
  
  private static __login_callbacks: ((request: express.Request, response: express.Response, user: tObject<any> | User) => Promise<tObject<any> | User>)[] = [];
  
  public username: string;
  public email: string;
  public salt: Buffer;
  public hash: Buffer;
  public time_login: number;
  public time_created: number;
  public time_updated: number;
  
  constructor(initializer: tNonFnPropsOptional<User> = {}) {
    super(initializer);
    this.time_created = initializer.time_created ? initializer.time_created : Date.now();
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
  
  public static addLoginCallback(callback: (request: iApplicationRequest, response: iApplicationResponse, user: tObject<any> | User) => Promise<tObject<any> | User>): void {
    User.__login_callbacks.push(callback);
  }
  
  public static login(request: iApplicationRequest, response: iApplicationResponse): Promise<{jwt: string, object: Partial<User>}> {
    return Promise.reduce(User.login_callbacks, (user, fn) => fn(request, response, user).then(res => _.assign(user, res)), new User())
    .then(user => user instanceof User && user.exists ? user.toObject() : Promise.reject(Response.error(400, "login")))
    .then(user => ({jwt: jwt.sign(user, env.tokens.jwt), object: user}))
    .catch(err => Promise.reject(err.code && err.type ? err : Response.error(500, "any", err)));
  }
  
}

Resource<eResourceType>(eResourceType.USER, User, definition, options);
