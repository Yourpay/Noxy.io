import * as Promise from "bluebird";
import {tObject} from "./iAuxiliary";

export interface iModuleService extends iModuleFn {
  Constructor: cModule
  register: iModuleFn
  setup: () => Promise<tObject<any>>
  activate: () => Promise<tObject<any>>
}

export interface iModuleFn {
  (config: iModuleConfiguration): iModule
}

export interface cModule {
  new(config: iModuleConfiguration): iModule
}

export interface iModule {
  name: string
  version: string
  
  node_dependencies: tObject<string>
  module_dependencies: tObject<string>
  
  setup: () => Promise<any>
  activate: () => Promise<any>
}

export interface iModuleDependency {
  version: string
  module: any
}

export interface iModuleStore {
  [key: string]: {
    module: iModule
    activated: boolean
    dependants: {[key: string]: string}
    dependencies: {[key: string]: string}
  }
}

export interface iModuleStoreUnit {

}

export interface iModuleConfiguration {
  name: string
  version: string
  node_dependencies: tObject<string>
  module_dependencies: tObject<string>
  module_setup: (setup_values: tObject<any>) => Promise<any>
  module_activate: (setup_values: tObject<any>) => Promise<any>
}