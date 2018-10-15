import * as Promise from "bluebird";
import * as _ from "lodash";
import {iRoutineFn, iRoutineService, iRoutineStore} from "../interfaces/iRoutine";
import * as Response from "./Response";

const Service: iRoutineFn = Default;
const store: iRoutineStore = {};

function Default<T>(id: string | number, fn: (() => Promise<any>), delay: number = 5000) {
  if (store[id]) { throw Response.error(409, "routine", {id: id}); }
}

class Routine {
  
  private id: string | number;
  private delay: number;
  private active: boolean;
  private health: number;
  private handler: NodeJS.Timer;
  
  private fn: () => Promise<any>;
  private listeners: ((err: Error, result: any) => any)[] = [];
  
  constructor(id: string | number, fn: (() => Promise<any>), delay: number = 5000) {
    this.id = id;
    this.fn = fn;
    this.delay = delay;
  }
  
  public listen(listener: () => {}): this {
    this.listeners.push(listener);
    return this;
  }
  
  public start() {
    this.active = true;
    this.health = 5;
    this.handler = setTimeout(() => {
      this.fn()
      .tap(res => Promise.map(this.listeners, listener => listener(undefined, res)))
      .tap(() => this.handler.refresh())
      .catch(err => {
        const error = --this.health === 0 ? Response.error(500, "routine", {health: this.health}) : Response.error(err.code, err.type, err);
        return Promise.map(this.listeners, listener => listener(error, undefined))
        .then(() => Promise.reject(error));
      });
    }, this.delay);
    return this;
  }
  
  public stop(): this {
    this.active = false;
    return this;
  }
  
}

const exported: iRoutineService = _.assign(
  Service,
  {}
);

export = exported;
