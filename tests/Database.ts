import * as _ from "lodash";
import * as Database from "../modules/Database";

_.map([
  [true, Database.parse2("SELECT * FROM ??", "payment"), "SELECT * FROM `payment`"],
  [false, Database.parse2("SELECT * FROM ?? WHERE id = ?", "payment"), "SELECT * FROM `payment`"],
  [true, Database.parse2("SELECT * FROM ?? WHERE id = ?", ["payment", 1]), "SELECT * FROM `payment`"],
  [true, Database.parse2("SELECT * FROM ?? WHERE id IN (?)", ["payment", [1, 2, 3]]), "SELECT * FROM `payment` IN (1, 2, 3)"],
  [true, Database.parse2("SELECT * FROM ?? WHERE ?", ["payment", {id: [1, 2, 3]}]), "SELECT * FROM `payment` IN (1, 2, 3)"],
  [true, Database.parse2("INSERT INTO ?? SET ?", ["payment", {id: 1, order_id: 2, manager: "Jake"}]), "INSERT INTO `payment` SET id = 1, order_id = 2, manager = 'Jake'"]
], (test, number) => {
  const success = test[0] === _.isEqual(test[1], test[2]);
  console[success ? "log" : "error"]("Test", number, success ? "suceeded" : "failed (" + test[0] + ")");
});
