import {tNonFnPropsOptional} from "../interfaces/iAuxiliary";
import {cResourceConstructor, eResourceType} from "../interfaces/iResource";
import * as Resource from "../modules/Resource";

const definition = {
  name:         {type: "varchar(32)", required: true},
  key:          {type: "varchar(32)", required: true, protected: true, unique_index: "key"},
  user_created: Resource.Table.toRelationColumn<eResourceType>(eResourceType.USER),
  time_created: Resource.Table.toTimeColumn("time_created"),
  time_updated: Resource.Table.toTimeColumn(null, true)
};
const options = {};

class Test extends Resource.Constructor {
  
  constructor(initializer: tNonFnPropsOptional<Test> = {}) {
    super(initializer);
  }
  
}

const a = Resource<eResourceType, cResourceConstructor>(
  eResourceType.TEST,
  Test,
  definition,
  options
);

console.log(a.table.toSQL())

const b = new a();
b.validate()
.then(res => {
  console.log(res);
})
.catch(err => {
  console.log(err);
});

console.log("Resource", a);
console.log("Instance", b, b.id, b.uuid);
// console.log("ID", b.id, b.uuid);
console.log("Table", a.table);
