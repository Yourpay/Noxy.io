import * as _ from "lodash";
import BaseObject from "../classes/BaseObject";
import * as crypto from "crypto";

export default class User extends BaseObject {
  
  public id: Buffer;
  public uuid: string;
  public username?: string;
  public email?: string;
  public salt?: Buffer;
  public hash?: Buffer;
  
  protected readonly __fields;
  protected readonly __validated;
  protected readonly __indexes;
  protected readonly __primary;
  
  public static __type = "user";
  public static __fields = _.merge({}, BaseObject.__fields, {
    username: {type: "varchar(32)", required: true},
    email: {type: "varchar(128)", required: true},
    password: {intermediate: true, protected: true, onInsert: (o: User, v) => typeof v === "string" && o.generateHash(v) && delete o.password},
    salt: {type: "binary(64)", required: true, protected: true},
    hash: {type: "binary(64)", required: true, protected: true}
  }, BaseObject.generateTimeFields());
  public static __indexes = _.merge({}, BaseObject.__indexes, {
    unique: {
      username: ["username"],
      email: ["email"]
    }
  }, BaseObject.generateTimeIndexes());
  
  constructor(object: any) {
    super();
    this.init(object);
    if (object.password) { this.__fields.password.onInsert(this, object.password); }
  }
  
  private generateHash(password?: string): this {
    const salt = this.generateSalt().salt;
    password = password || crypto.randomBytes(48).toString("base64");
    return _.set(this, "hash", crypto.pbkdf2Sync(password, salt.toString("base64"), 100000, 64, "sha512"));
  }
  
  private generateSalt(): this {
    return _.set(this, "salt", crypto.randomBytes(64));
  }
  
};
