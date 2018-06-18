import {Table} from "./Table";
import * as _ from "lodash";
import Promise from "aigle";
import * as Database from "../modules/DatabaseService";
import {Endpoint} from "./Endpoint";
import uuid = require("uuid");

@implement<iResource>()
export class Constructor {
  
  public static __table: Table;
  public static __endpoint: Endpoint = new Endpoint();
  
  public id: Buffer;
  public uuid: string;
  
  protected __exists: boolean = false;
  protected __validated: boolean = false;
  protected __database: string = "master";
  
  constructor(object?) {
    const $this = (<typeof Constructor>this.constructor);
    if (!$this.__table) { throw Error("Cannot initialize an instance of 'Resource' lacking a table definition."); }
    _.assign(this, object);
    if (!$this.__table.__options.junction) { this.id = Constructor.bufferFromUuid(object.id ? (!Constructor.isUuid(object.id) ? object.id : this.uuid = object.id) : this.uuid = uuid.v4()); }
    this.__database = <string>$this.__table.__options.database;
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
  
  public get exists() {
    return this.__exists;
  }
  
  public get validated() {
    return this.__validated;
  }
  
  public get database() {
    return this.__database;
  }
  
  public static get(db?: Database.Pool): Promise<Constructor[]> {
    return new Promise((resolve, reject) => resolve());
  }
  
  public validate(db?: Database.Pool): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = db || Database.namespace("master");
    return new Promise((resolve, reject) => {
      if (this.__validated && database.id === this.__database) { return resolve(this); }
      database.query($this.__table.validationSQL(this))
      .then(res => resolve(_.merge(_.reduce(res[0], (r, v, k) => $this.__table.__columns[k].protected ? _.set(r, k, v) : r, this), {__validated: true, __exists: !!res[0], __database: database.id})))
      .catch(err => reject(err));
    });
  }
  
  public save(db?: Database.Pool): Promise<this> {
    const $this = (<typeof Constructor>this.constructor);
    const database = db || Database.namespace("master");
    return new Promise((resolve, reject) =>
      this.validate()
      .then(res => {
        const sql = _.invoke($this.__table, this.__exists ? "updateSQL" : "insertSQL", this);
        return database.query(sql)
        .then(() => resolve(res))
        .catch(err => console.error("SAVE ERR", err) || reject(err));
      })
      .catch(err => console.error("VALIDATE ERR", err) || reject(err))
    );
  }
  
  public delete(db?: Database.Pool): Promise<this> {
    return new Promise((resolve, reject) => { return resolve(this); });
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
