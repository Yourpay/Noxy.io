import * as _ from "lodash";
import * as Promise from "bluebird";

/**
 * PromiseList handles generating a list of promises with stages of
 *
 *
 */

export default class PromiseList {
  
  private __resolution_order: PromiseStage[];
  private __stages: {[stage: string]: PromiseStage} = {};
  
  constructor(stages: string[] | string) {
    if (!Array.isArray(stages)) { stages = [stages]; }
    _.each(_.uniq(stages), stage => {
      this.__resolution_order.push(this.__stages[stage] = new PromiseStage(stage));
    });
  }
  
  public stage(stage_id: string): PromiseStage {
    if (!this.__stages[stage_id]) {
      this.__resolution_order.push(this.__stages[stage_id] = new PromiseStage(stage_id));
    }
    return this.__stages[stage_id];
  }
  
  public promise(stage_id: string, fn: PromiseFunction): PromiseWrapper {
    return this.stage(stage_id).add(new PromiseWrapper(fn));
  }
  
  public execute() {
  
  }
  
}

class PromiseStage {
  
  private __id: string;
  private __promise: Promise<any>;
  private __resolve: Function;
  private __reject: Function;
  private __promises: PromiseWrapper[];
  
  constructor(id) {
    this.__id = id;
    this.__promise = new Promise((resolve, reject) => {
      this.__resolve = resolve;
      this.__reject = reject;
    });
  }
  
  public get promise() {
    return this.__promise;
  }
  
  public add(promise: PromiseWrapper) {
    return _.last(_.concat(this.__promises, promise));
  }
  
}

class PromiseWrapper {
  
  private __function: (resolve, reject) => any;
  private __promise: Promise<any>;
  private __resolve: Function;
  private __reject: Function;
  
  constructor(fn: PromiseFunction) {
    this.__function = fn;
  }
  
}

type PromiseFunction = (resolve: Function, reject: Function) => any;
