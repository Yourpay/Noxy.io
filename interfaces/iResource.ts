export interface iResource {
  <Types extends Object, Type extends iConstructor>(type: iResourceType | Types, constructor: Type): Type
  
  Table: cTable
  Constructor: cConstructor
  
  CONSTANTS: {
    TYPES: typeof iResourceType
  }
}

export enum iResourceType {
  "USER" = "user",
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
