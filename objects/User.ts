import * as Promise from "bluebird";
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
  
  constructor(user: DOUser) {
    super("user", user);
    this.__required.username = true;
    this.__required.email = true;
    this.__protected.salt = this.__required.salt = true;
    this.__protected.hash = this.__required.hash = true;
  }
  
  public save(password?: string): Promise<this> {
    return new Promise((resolve, reject) => {
      const promises = [];
      if (!this.__validated) { promises.push(this.validate().catch(err => err.code === "400.db.select" ? this : reject(err))); }
      Promise.all(promises).then(() => {
        if (password) { this.generateSalt() && this.generateHash(password); }
        this.__store().then(res => resolve(res), err => reject(err));
      });
    });
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

export interface DOUser {
  id?: string
  username?: string
  email?: string
  salt?: string
  hash?: string
  time_created?: number
  time_updated?: number
  time_deleted?: number
}
