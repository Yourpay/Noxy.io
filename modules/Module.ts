import * as Promise from "bluebird";
import * as _ from "lodash";
import {tObject} from "../interfaces/iAuxiliary";
import {cModule, iModule, iModuleConfiguration, iModuleFn, iModuleService} from "../interfaces/iModule";
import * as Response from "../modules/Response";

const store: tObject<iModule> = {};

function Default(config: iModuleConfiguration): iModule {
  return store[config.name] = new Module(config);
}

const Service: iModuleFn = Default;

const Module: cModule = class Module implements iModule {
  
  public readonly name: string;
  public readonly version: string;
  public readonly node_dependencies: tObject<string>;
  public readonly module_dependencies: tObject<string>;
  
  private deep_dependencies: string[];
  
  private flag_setup: boolean;
  private flag_activated: boolean;
  private module_setup_fn: (dependency_values: tObject<any>) => Promise<any>;
  private module_activate_fn: (dependency_values: tObject<any>) => Promise<any>;
  
  private promise_setup: Promise<any>;
  private promise_activate: Promise<any>;
  
  constructor(config: iModuleConfiguration) {
    this.name = config.name;
    this.version = config.version;
    this.node_dependencies = config.node_dependencies;
    this.module_dependencies = config.module_dependencies;
    
    this.flag_setup = false;
    this.flag_activated = false;
    this.module_setup_fn = config.module_setup;
    this.module_activate_fn = config.module_activate;
  }
  
  public setup(): Promise<any> {
    if (this.promise_setup) { return this.promise_setup; }
    if (!this.deep_dependencies) { this.deep_dependencies = _.tail(getDeepModuleDependencies(this)); }
    
    return this.promise_setup = Promise.props(_.reduce(this.deep_dependencies, (result, name) => _.set(result, name, store[name].setup()), {}))
    .then(res => this.module_setup_fn(res))
    .finally(() => this.flag_setup = true);
  }
  
  public activate(): Promise<any> {
    if (!this.flag_setup) { return Promise.reject(Response.error(409, "module", {setup: false, module: this.name})); }
    if (this.promise_activate) { return this.promise_activate; }
    if (!this.deep_dependencies) { this.deep_dependencies = _.tail(getDeepModuleDependencies(this)); }
    
    return this.promise_activate = Promise.props(_.reduce(this.deep_dependencies, (result, name) => _.set(result, name, store[name].activate()), {}))
    .then(res => this.module_activate_fn(res))
    .finally(() => this.flag_activated = true);
  }
  
};

function getDeepModuleDependencies(module: iModule, dependencies: string[] = []): string[] {
  if (_.includes(dependencies, module.name)) {
    throw new Error("Loop exists through " + _.join(_.concat(module.name, _.takeWhile(dependencies, v => v !== module.name), module.name), " => "));
  }
  
  return _.uniq(_.concat(module.name, _.reduce(module.module_dependencies, (result, version, name) => {
    const dependency = store[name];
    if (!dependency) { throw new Error("Module missing"); }
    return _.concat(result, getDeepModuleDependencies(dependency, _.concat(module.name, dependencies)));
  }, dependencies)));
  
}

function setup(): Promise<tObject<any>> {
  return Promise.props(_.mapValues(store, module => module.setup()));
}

function activate(): Promise<tObject<any>> {
  return Promise.props(_.mapValues(store, module => module.activate()));
}

const exported: iModuleService = _.assign(
  Service,
  {
    Constructor: Module,
    register:    Service,
    setup:       setup,
    activate:    activate
  }
);

export = exported;
