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
  host: string
  database: string
  pool?: number
}

declare module "*env.json" {
  const value: {
    mode: ModeEnvironmental
    websockets: boolean
    databases: {
      [key: string]: DatabaseEnvironmental
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
    users: {
      [key: string]: UserEnvironmental
    }
    roles: {
      [key: string]: RoleEnvironmental
      
    }
    tokens: { [key: string]: string }
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

