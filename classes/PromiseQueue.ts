import * as _ from "lodash";
import Promise from "aigle";

export default class PromiseQueue {
  
  private __order: PromiseStage[] = [];
  private __stages: {[stage: string]: PromiseStage} = {};
  private __state: number = 0;
  
  constructor(stages: string[] | string) {
    if (!Array.isArray(stages)) { stages = [stages]; }
    _.each(_.uniq(stages), stage => {
      this.__order.push(this.__stages[stage] = new PromiseStage(stage));
    });
  }
  
  public stage(): {[stage: string]: Promise<any>}
  public stage(stage_id: string): Promise<any>
  public stage(stage_id?: string): Promise<any> | {[stage: string]: Promise<any>} {
    if (!stage_id) { return _.mapValues(this.__stages, stage => stage.promise); }
    if (!this.__stages[stage_id]) { this.__order.push(this.__stages[stage_id] = new PromiseStage(stage_id)); }
    return this.__stages[stage_id].promise;
  }
  
  public promise(stage_id: string, fn: PromiseFunction): Promise<any> {
    if (!this.__stages[stage_id]) { this.__order.push(this.__stages[stage_id] = new PromiseStage(stage_id)); }
    return this.__stages[stage_id].add(fn).promise;
  }
  
  public execute(): Promise<any> {
    if (this.__state > 0) { throw new Error("Cannot execute a promise chain which has already been executed."); }
    return PromiseQueue.resolve(_.clone(this.__order));
  }
  
  private static resolve(promise_list: PromiseStage[]): Promise<any> {
    const stage = promise_list.pop();
    return promise_list.length === 0 ? stage.execute() : new Promise((resolve, reject) => {
      return this.resolve(promise_list)
      .then(res1 =>
        stage.execute()
        .then(res2 => resolve(_.concat(res1, res2)))
        .catch(err => reject(err))
      )
      .catch(err => reject(err));
    });
  }
  
}

class PromiseStage {
  
  private __id: string;
  private __promise: Promise<any>;
  private __resolve: Function;
  private __reject: Function;
  private __promises: Deferred[] = [];
  
  constructor(id) {
    this.__id = id;
    this.__promise = new Promise((resolve, reject) => {
      this.__resolve = resolve;
      this.__reject = reject;
    });
  }
  
  public get promise(): Promise<any> {
    return this.__promise;
  }
  
  public get id(): string {
    return this.__id;
  }
  
  public add(promise: PromiseFunction): Deferred {
    this.__promises.push(new Deferred(promise));
    return _.last(this.__promises);
  }
  
  public execute() {
    Promise.map(this.__promises, deferred => deferred.execute())
    .then(res => this.__resolve(res))
    .catch(err => this.__reject(err));
    return this.__promise;
  }
  
}

class Deferred {
  
  private __function: PromiseFunction;
  private __promise: Promise<any>;
  private __resolve: Function;
  private __reject: Function;
  
  constructor(fn: PromiseFunction) {
    this.__function = fn;
    this.__promise = new Promise((resolve, reject) => {
      this.__resolve = resolve;
      this.__reject = reject;
    });
  }
  
  public get promise(): Promise<any> {
    return this.__promise;
  }
  
  public execute() {
    this.__function(this.__resolve, this.__reject);
    return this.__promise;
  }
  
}

type PromiseFunction = (resolve: Function, reject?: Function) => any;
