import * as Promise from "bluebird";
import * as uuid from "uuid";
import {tEnum, tEnumKeys, tEnumValue, tPromiseFn} from "../interfaces/iAuxiliary";
import {iPromisePipe} from "../interfaces/iPromisePipe";
import * as Response from "../modules/Response";

const pipes = {};

function Default<T extends tEnum<T>>(stages: T): PromisePipe<T> {
  return pipes[uuid.v4()] = new PromisePipe(stages);
}

class PromisePipe<T extends tEnum<T>> {
  
  public flag_execute: boolean;
  
  public readonly stages: T;
  public readonly promises: { [K in tEnumKeys<T>]?: {[key: string]: tPromiseFn<any>} };
  
  constructor(stages: T) {
    this.flag_execute = false;
    this.stages = stages;
    Object.defineProperty(this, "promises", {value: _.reduce(stages, (result, value, key) => Object.defineProperty(result, key, {value: {}}), {})});
  }
  
  public promise<K>(stage: tEnumValue<T>, fn: tPromiseFn<K>): string {
    const key = uuid.v4();
    this.promises[stage][key] = fn;
    return key;
  }
  
  public fulfill<K>(stage: tEnumValue<T>, key: string): Promise<K> {
    if (!this.promises[stage][key]) { return Promise.reject(new Response.error(404, "promise_pipe")); }
    return Promise.resolve(this.promises[stage][key]());
  }
  
  public execute() {
    this.flag_execute = true;
    PromisePipe.execute(this);
  }
  
  private static execute(pipe: PromisePipe<any>, stages?: string[]) {
    const [stage, remaining] = _.partition(stages || _.values(pipe.stages), v => _.isEqual(v, _.head(v)));
    console.log(stage, remaining);
  }
  
}

Object.defineProperty(Default, "list", {value: pipes});

const exported = <iPromisePipe>(<any>Default);
export = exported;
