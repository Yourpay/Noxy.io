type ModeEnvironmental = "development" | "production";

interface UserEnvironmental {
  id?: string
  username: string
  password?: string
  email: string
}

interface RoleEnvironmental {
  id?: string
  name: string
  key: string
}

interface DatabaseEnvironmental {
  user: string
  password: string
  database: string | string[]
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
  flags?: string | string[]
  ssl?: any
}

declare module "*env.json" {
  const value: {
  
    mode: ModeEnvironmental
  
    databases: {
      [key: string]: DatabaseEnvironmental | DatabaseEnvironmental[]
    
      master: DatabaseEnvironmental
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
      [key: string]: UserEnvironmental
    
      admin: UserEnvironmental
      server: UserEnvironmental
    }
  
    roles: {
      [key: string]: RoleEnvironmental
    
      user: RoleEnvironmental
      admin: RoleEnvironmental
    }
    
  };
  export = value;
}

declare module "*.json"

