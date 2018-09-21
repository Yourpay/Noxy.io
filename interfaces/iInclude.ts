export interface iIncludeService extends iIncludeFn {

}

export interface iIncludeFn {
  (directory: string, options?: iIncludeOptions & {sync: true}): any
  (directory: string, options?: iIncludeOptions & {sync: false}): Promise<any>
  (directory: string, options?: iIncludeOptions): Promise<any> | any
}

interface iIncludeOptions {
  sync: boolean
}

