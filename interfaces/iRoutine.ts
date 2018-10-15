import * as Promise from "bluebird";

export interface iRoutineService extends iRoutineFn {

}

export interface iRoutineFn {
  (id: string | number, fn: (() => Promise<any>), delay?: number): any
}

export interface iRoutineStore {

}