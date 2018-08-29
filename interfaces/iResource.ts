export interface iResource {
  <Types extends keyof {[key: string]: string}, Type extends iConstructor>(type: Types & keyof iResourceType, constructor: Type): Type
  
  Table: cTable
  Constructor: cConstructor
  
  CONSTANTS: {
    TYPES: typeof iResourceType
  }
}

export interface cTable {
  new(): iTable
}

export interface iTable {

}

export interface cConstructor {
  new(): iConstructor
}

export interface iConstructor {

}

export enum iResourceType {
  "USER"       = "user",
  "ROLE"       = "role",
  "ROLE_USER"  = "role/user",
  "ROLE_ROUTE" = "role/route",
  "ROUTE"      = "route",
}
