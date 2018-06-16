import * as _ from "lodash";
import * as crypto from "crypto";

import Element from "../classes/Element";

export default class User extends Element {
  
  public id: Buffer;
  public uuid: string;
  public username?: string;
  public email?: string;
  public salt?: Buffer;
  public hash?: Buffer;
  
  public static __type = "user";
  
  public static __fields = _.assign({},
    Element.__fields,
    {
      username:   {type: "varchar(32)", required: true},
      email:      {type: "varchar(128)", required: true},
      salt:       {type: "binary(64)", required: true, protected: true},
      hash:       {type: "binary(64)", required: true, protected: true},
      password:   {intermediate: true, protected: true, onCreate: ($this, value) => typeof value === "string" && $this.generateHash(value)},
      time_login: {type: "bigint(14)", default: null, protected: true}
    },
    Element.generateTimeFields()
  );
  
  public static __indexes = _.assign({},
    Element.__indexes,
    {
      unique_key: {
        username: ["username"],
        email:    ["email"]
      }
    },
    Element.generateTimeIndexes()
  );
  
  constructor(object: any) {
    super();
    this.init(object);
  }
  
  private generateHash(password?: string): void {
    const salt = this.generateSalt().salt;
    password = password || crypto.randomBytes(48).toString("base64");
    _.set(this, "hash", crypto.pbkdf2Sync(password, salt.toString("base64"), 100000, 64, "sha512"));
  }
  
  public static generateHash(password: string, salt: Buffer) {
    return crypto.pbkdf2Sync(password, salt.toString("base64"), 100000, 64, "sha512");
  }
  
  private generateSalt(): this {
    return _.set(this, "salt", crypto.randomBytes(64));
  }
  
};
