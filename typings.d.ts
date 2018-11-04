type ModeEnvironmental = "development" | "production";

interface iUserEnvironmental {
  id?: string
  username: string
  password?: string
  email: string
}

interface iRoleEnvironmental {
  id?: string
  name: string
  key: string
}

interface iDatabaseEnvironmental {
  user: string
  password: string
  database: "master" | string
  host?: "localhost" | string
  port?: 3306 | number
  socket_path?: string
  local_address?: string
  charset?: "utf8mb4_unicode_ci" | string
  timezone?: "local" | string
  connect_timeout?: 10000 | number
  stringify_objects?: false | boolean
  insecure_auth?: false | boolean
  type_cast?: true
  support_big_numbers?: false | boolean
  big_number_strings?: false | boolean
  debug?: false | boolean | string[]
  trace?: true | boolean
  flags?: string[]
  ssl?: any
}

export interface iDatabaseMasterEnvironmental extends iDatabaseEnvironmental {
  slaves?: {[key: string]: iDatabaseEnvironmental} | iDatabaseEnvironmental[]
}

declare module "*env.json" {
  const value: {
    
    mode: ModeEnvironmental
    
    domains: {
      development: string
      production: string
    }
    
    databases: {
      [key: string]: iDatabaseMasterEnvironmental
      
      information_schema: iDatabaseMasterEnvironmental
      development: iDatabaseMasterEnvironmental
      production: iDatabaseMasterEnvironmental
    },
    
    ports: {
      [key: string]: number
      
      http: number
      https: number
    }
    
    subdomains: {
      [key: string]: string
      
      default: string
      api: string
    }
    
    certificates?: {
      [key: string]: string
      
      key?: string
      cert?: string
      ca?: string
    }
    
    tokens: {[key: string]: string}
    
    users: {
      [key: string]: iUserEnvironmental
      
      admin: iUserEnvironmental
      server: iUserEnvironmental
    }
    
    roles: {
      [key: string]: iRoleEnvironmental
      
      user: iRoleEnvironmental
      admin: iRoleEnvironmental
    }
    
  };
  export = value;
}
