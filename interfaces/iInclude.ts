import * as Promise from "bluebird";

export interface iIncludeService extends iIncludeFn {
  sync(directory: string, options?: Exclude<iIncludeOptions, "sync">): any
  async(directory: string, options?: Exclude<iIncludeOptions, "sync">): Promise<any>
}

export interface iIncludeFn {
  (directory: string, options?: iIncludeOptions & {sync?: boolean & true}): any
  (directory: string, options?: iIncludeOptions & {sync?: boolean & false}): Promise<any>
  (directory: string, options?: iIncludeOptions & {sync?: boolean}): Promise<any> | any
}

export interface iIncludeOptions {
  sync?: boolean
  hierarchy?: boolean
  transform?: (path: string) => string
  filter?: string | ((path: string) => boolean)
  recursive?: boolean
}
