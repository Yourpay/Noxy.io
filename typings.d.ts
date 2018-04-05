declare module "*env.json" {
  const value: {
    mode: string
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
    databases: {
      [key: string]: {
        user: string
        password: string
        host: string
        database: string
        pool?: number
      }
    }
  };
  export = value;
}

declare module "*.json"