import * as _ from "lodash";
import Element from "../classes/Element";
import * as crypto from "crypto";

export default class User extends Element {
  
  public id: Buffer;
  public uuid: string;
  public username?: string;
  public email?: string;
  public salt?: Buffer;
  public hash?: Buffer;
  
  public static __type = "user";
  public static __fields = _.merge({}, Element.__fields, Element.generateTimeFields(), {
    username: {type: "varchar(32)", required: true},
    email: {type: "varchar(128)", required: true},
    salt: {type: "binary(64)", required: true, protected: true},
    hash: {type: "binary(64)", required: true, protected: true},
    password: {
      intermediate: true,
      protected: true,
      onCreate: ($this, value) => {
        if (typeof value === "string") {$this.generateHash(value);}
        return null;
      }
    },
    time_login: {type: "bigint(14)", default: null, protected: true},
  });
  public static __indexes = _.merge({}, Element.__indexes, Element.generateTimeIndexes(), {
    unique_key: {
      username: ["username"],
      email: ["email"]
    }
  });
  
  constructor(object: any) {
    super();
    this.init(object);
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
