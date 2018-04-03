import * as Promise from "bluebird";
import * as _ from "lodash";
import BaseObject from "./BaseObject";
import * as crypto from "crypto";

export default class Role extends BaseObject {
  
  public id: Buffer;
  public name?: string;
  public key?: string;
  
  constructor(role: DORole) {
    super("role");
    this.__required.name = true;
    this.__protected.key = this.__required.key = true;
    this.__protected.user_created = this.__required.user_created = true;
    this.__protected.user_updated = this.__required.user_updated = true;
    this.__protected.user_deleted = this.__required.user_deleted = true;
  }
  
}

export interface DORole {
  id?: string
  name?: string
  key?: string
  user_created?: string
  user_updated?: string
  user_deleted?: string
  time_created?: number
  time_updated?: number
  time_deleted?: number
}