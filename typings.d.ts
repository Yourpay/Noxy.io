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
  
    websockets: boolean
  
    databases: {
      [key: string]: DatabaseEnvironmental | DatabaseEnvironmental[]
    },
  
    tables: {
      default: {
        names: {
          [key: string]: string
          
          user: string
          route: string
          role: string
          role_user: string
          role_route: string
        }
      }
    }
  
    users: {[key: string]: UserEnvironmental}
  
    roles: {[key: string]: RoleEnvironmental}
  
    tokens: {[key: string]: string}
    
    ports: {
      [key: string]: number
      
      http: number
      https: number
    }
  
    certificates?: {
      [key: string]: string
      
      key?: string
      cert?: string
      ca?: string
    }
  
  };
  export = value;
}

declare module "*.json"

