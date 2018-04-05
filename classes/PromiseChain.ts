import * as Promise from "bluebird";
import * as _ from "lodash";

export default class PromiseChain {
  
  private links: { [key: string]: PromiseChainLink } = {};
  private queue: PromiseChainLink[] = [];
  
  constructor() {
  }
  
  public addLink(key: string): PromiseChain {
    if (!this.links[key]) {
      this.queue.push(this.links[key] = new PromiseChainLink(key));
    }
    return this;
  }
  
  public addPromise(key: string, fnPromise: (resolve, reject) => void): Promise<any> {
    if (!this.links[key]) {
      this.queue.push(this.links[key] = new PromiseChainLink(key));
    }
    return this.links[key].addPromise(fnPromise);
  }
  
  public cycle(): Promise<any> {
    return new Promise((resolve, reject) => {
      _.each(this.queue, (link: PromiseChainLink, index: number) => {
        if (link.promises.length === 0) { link.addPromise(resolve => resolve()); }
        Promise.all(link.promises)
        .then(res => (index + 1 === this.queue.length) ? resolve(res) : this.queue[index + 1].initialize(res))
        .catch(err => reject(err));
      });
      _.first(this.queue).initialize();
    });
  }
  
}

export class PromiseChainLink {
  
  public key: string;
  public promises: Promise<any>[] = [];
  public initialize: (result?) => void;
  public initializer: Promise<any>;
  
  constructor(key: string) {
    this.key = key;
    this.initializer = new Promise(resolve => this.initialize = resolve);
  }
  
  public addPromise(fnPromise: (resolve, reject) => void): Promise<any> {
    this.promises.push(new Promise((resolve, reject) => {
      this.initializer
      .then(() => fnPromise(resolve, reject))
      .catch(err => reject(err));
    }));
    return _.last(this.promises);
  }
  
}
