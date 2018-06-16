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
  
  private __exists: boolean = false;
  private __validated: boolean = false;
  
  constructor(object?) {
    const $this = (<typeof Constructor>this.constructor);
    if (!$this.__table) { throw Error("Cannot initialize an instance of 'Resource' lacking a table definition."); }
    if (!$this.__table.__options.junction) { this.id = (this.uuid = object.id) || Constructor.bufferFromUuid(this.uuid = uuid.v4()); }
    _.assign(this, object);
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
    return new Promise((resolve, reject) => {
      (db || Database.namespace("master")).query($this.__table.validationSQL(this))
      .then(res => resolve(_.merge(this, res[0], {__validated: true, __exists: res[0]})))
      .catch(err => reject(err));
    });
  }
  
  public save(db?: Database.Pool): Promise<this> {
    return new Promise((resolve, reject) => {});
  }
  
}

export function implement<T>() {
  return (constructor: T) => {};
}

export interface iResource {
  __table: Table;
  
  new(object?: {[key: string]: any}): iResourceInstance;
}

interface iResourceObject {
  id?: Buffer
  uuid?: string
  
  [key: string]: any
}

interface iResourceInstance {
  uuid?: Buffer
  id: string
  validate: (db: Database.Pool) => Promise<this>
}

[key
:
string;
]:
any;
 
