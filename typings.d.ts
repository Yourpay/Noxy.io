declare module "*env.json" {
  const value: {
    mode: string
    databases: {
      [key: string]: {
        user: string
        password: string
        host: string
        database: string
        pool?: number
      }
    },
    tables: {
      default: {
        names: {
          [key: string]: string
        }
      }
    }
    users: {
      [key: string]: {
        id?: string
        username: string
        password?: string
        email: string
      }
    }
    roles: {
      [key: string]: {
        id?: string
        name: string
        key: string
      }
    }
    tokens: { [key: string]: string }
    
  };
  export = value;
}

declare module "*.json"

