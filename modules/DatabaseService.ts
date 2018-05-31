import * as mysql from "mysql";
import * as _ from "lodash";

export namespace DatabaseService {
  
  const __cluster = mysql.createPoolCluster();
  const __clusters: {[key: string]: mysql.Pool} = {};
  const __pools: {[key: string]: mysql.Pool} = {};
  
  export function register(key, options: DatabaseOptions | DatabaseOptions[]) {
    _.each(Array.isArray(options) ? options : [options], (o: DatabaseOptions) => {
      _.each(Array.isArray(o.database) ? o.database : [o.database], database => {
        const config = _.merge(_.mapKeys(options, (v, k) => _.camelCase(k)), {
          database:           database,
          multipleStatements: true
        });
        const id = `${key}-${config.socketPath || config.host}-${database}`;
        __cluster.add(id, config);
        __pools[id] = __cluster.of(id);
      });
    });
    __clusters[key] = __cluster.of(key);
  }
  
  class DatabaseCluster {
    
    public id: string;
    
    constructor(id) {
      this.id = id;
    }
    
  }
  
}

interface DatabaseOptions {
  user: string
  password: string
  database: string | string[]
  host?: "localhost" | string
  port?: 3306 | number
  socketPath?: string
  socket_path?: string
  localAddress?: string
  local_address?: string
  charset?: "UTF8_GENERAL_CI" | string
  timezone?: "local" | string
  connectTimeout?: 10000 | number
  connect_timeout?: 10000 | number
  stringifyObjects?: false | boolean
  stringify_objects?: false | boolean
  insecureAuth?: false | boolean
  insecure_auth?: false | boolean
  typeCast?: true
  type_cast?: true
  supportBigNumbers?: false | boolean
  support_big_numbers?: false | boolean
  bigNumberStrings?: false | boolean
  big_number_strings?: false | boolean
  debug?: false | boolean | string[]
  trace?: true | boolean
  flags?: string | string[]
  ssl?: any
}

const options = {
  "test":  [
    {
      host:     "localhost",
      user:     "user",
      password: "password",
      database: "testimonial"
    },
    {
      host:     "localhost",
      user:     "resu",
      password: "drowssap",
      database: ["testify", "testifyier"]
    }
  ],
  "debug": {
    host:     "localhost",
    user:     "user",
    password: "password",
    database: ["debuggery", "debugchery"]
  }
  
};