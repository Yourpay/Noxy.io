import * as Promise from "bluebird";
import * as _ from "lodash";
import * as uuid from "uuid";
import {tEnum, tEnumKeys, tEnumValue, tPromiseFn} from "../interfaces/iAuxiliary";
import {cPromisePipe, ePromisePipeStatus, iPromisePipe, iPromisePipeFn, iPromisePipeService} from "../interfaces/iPromisePipe";
import * as Response from "../modules/Response";

const Service: iPromisePipeFn = Default;

function Default<T>(stages: tEnum<T>): iPromisePipe<T> {
  return new PromisePipe(stages);
}

const PromisePipe: cPromisePipe = class PromisePipe<T extends tEnum<T>> implements iPromisePipe<T> {
  
  private status: ePromisePipeStatus;
  public readonly stages: T;
  public readonly promises: { [K in tEnumKeys<T>]?: {[key: string]: tPromiseFn<any>} };
  
  constructor(stages: T) {
    this.status = ePromisePipeStatus.READY;
    this.stages = stages;
    Object.defineProperty(this, "promises", {
      enumerable: true,
      value:      _.reduce(stages, (result, value, key) => Object.defineProperty(result, key, {
        enumerable: true,
        writable:   true,
        value:      {}
      }), {})
    });
  }
  
  public add<K>(stage: { [K in keyof T]: T[K] }[K], fn: tPromiseFn<K>): string {
    const key = uuid.v4();
    this.promises[stage][key] = fn;
    return key;
  }
  
  public remove(stage: tEnumValue<T>, key: string): boolean {
    if (this.status !== ePromisePipeStatus.READY) { throw new Response.error(409, "promise-pipe"); }
    return delete this.promises[stage][key];
  }
  
  public fork(): PromisePipe<T> {
    return _.set(_.clone(this), "status", ePromisePipeStatus.READY);
  }
  
  public unlock(): this {
    if (this.status !== ePromisePipeStatus.RESOLVED && this.status !== ePromisePipeStatus.REJECTED) { throw new Response.error(400, "promise-pipe"); }
    this.status = ePromisePipeStatus.READY;
    return this;
  }
  
  public resolve(): Promise<any> {
    this.status = ePromisePipeStatus.RESOLVING;
    return PromisePipe.resolve(this);
  }
  
  private static resolve<T extends tEnum<T>>(pipe: PromisePipe<any>, promises?: {[key: string]: tPromiseFn<any>}[]): Promise<any> {
    if (!promises) { promises = _.values(pipe.promises); }
    const [stage, remaining] = [_.head(promises), _.tail(promises)];
    return Promise.map(_.values(stage), fn => fn())
    .then(res => remaining.length > 0 ? PromisePipe.resolve(pipe, remaining) : Promise.resolve(res))
    .catch(err => console.log(err) || Promise.reject(new Response.error(500, "promise-pipe", err)));
  }
  
};

const exported: iPromisePipeService = _.assign(
  Service,
  {
    Constructor: PromisePipe
  }
);

export = exported;
