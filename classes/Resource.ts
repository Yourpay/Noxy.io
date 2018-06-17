import {Table} from "./Table";
import * as _ from "lodash";
import Promise from "aigle";
import * as Database from "../modules/DatabaseService";
import uuid = require("uuid");

@implement<iResource>()
export class Constructor {
  
  public static __table: Table;
  
  public id: Buffer;
  public uuid: string;
  
  private __database: string = "master";
  private __exists: boolean = false;
  private __validated: boolean = false;
  
  constructor(object?) {
    const $this = (<typeof Constructor>this.constructor);
    if (!$this.__table) { throw Error("Cannot initialize an instance of 'Resource' lacking a table definition."); }
    _.assign(this, object);
    if (!$this.__table.__options.junction) { this.id = Constructor.bufferFromUuid(object.id ? (!Constructor.isUuid(object.id) ? object.id : this.uuid = object.id) : this.uuid = uuid.v4()); }
  }
  
  protected static isUuid(uuid: string): boolean {
    return !!`${uuid}`.match(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  }
  
  protected static bufferFromUuid(uuid: string): Buffer {
    return Buffer.alloc(16, uuid.replace(/-/g, ""), "hex");
  }
  
  protected static uuidFromBuffer(buffer: Buffer): string {
    const hex = buffer.toString("hex");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
  }
  
  public validate(db?: Database.Pool): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = db || Database.namespace("master");
    return new Promise((resolve, reject) => {
      if (this.__validated && database.id === this.__database) { resolve(this); }
      database.query($this.__table.validationSQL(this))
      .then(res => resolve(_.merge(_.reduce(res[0], (r, v, k) => _.set(r, k, v), this), {__validated: true, __exists: !!res[0], __database: database.id})))
      .catch(err => reject(err));
    });
  }
  
  public save(db?: Database.Pool): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = db || Database.namespace("master");
    return new Promise((resolve, reject) => {
      this.validate()
      .then(() => {
        const sql = _.invoke($this.__table, this.__exists ? "updateSQL" : "insertSQL", this);
        database.query(sql)
        .then(res => console.log("SUCCESS", res) || resolve(res))
        .catch(err => console.error("SAVE ERR", err) || reject(err));
      })
      .catch(err => console.error("VALIDATE ERR", err) || reject(err));
    });
  }
  
}

export function implement<T>() {
  return (constructor: T) => {};
}

export interface iResource {
  __table: Table;
  
  new(object?: {[key: string]: any}): iResourceInstance;
}

interface iResourceInstance {
  id: Buffer
  uuid?: string
  validate: (db: Database.Pool) => Promise<this>
}

interface iResourceObject {
  id?: Buffer
  uuid?: string
  
  [key: string]: any
}
