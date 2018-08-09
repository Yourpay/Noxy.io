import Promise from "aigle";
import * as _ from "lodash";

Promise.map([
  [true, "SELECT * FROM `payment`", "SELECT * FROM `payment`"]
], (test, number) => {
  const success = test[0] === _.isEqual(test[1], test[2]);
  console[success ? "log" : "error"]("Test", number + 1, success ? "suceeded" : "failed (" + test[0] + ")");
});
