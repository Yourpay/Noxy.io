import * as _ from "lodash";
import BaseObject from "./BaseObject";
import * as crypto from "crypto";

export default class User extends BaseObject {
  
  public id: Buffer;
  public uuid: string;
  public username?: string;
  public email?: string;
  public salt?: Buffer;
  public hash?: Buffer;
  
  constructor(user: any) {
    super("user");
    this.__fields.username = {type: "varchar(32)", required: true};
    this.__fields.email = {type: "varchar(128)", required: true};
    this.__fields.password = {intermediate: true};
    this.__fields.salt = {type: "binary(64)", required: true, protected: true};
    this.__fields.hash = {type: "binary(64)", required: true, protected: true};
    this.addTimeFields();
    this.init(user);
  }
  
  private generateHash(password?: string): this {
    const salt = this.generateSalt().salt;
    password = password || crypto.randomBytes(48).toString("base64");
    return _.set(this, "hash", crypto.pbkdf2Sync(password, salt.toString("base64"), 100000, 64, "sha512"));
  }
  
  private generateSalt(): this {
    return _.set(this, "salt", crypto.randomBytes(64));
  }
  
}
