import * as _ from "lodash";
import * as Database from "../modules/Database";

_.map([
  [true, Database.parse("SELECT * FROM ??", "payment"), "SELECT * FROM `payment`"],
  [false, Database.parse("SELECT * FROM ?? WHERE id = ?", "payment"), "SELECT * FROM `payment`"],
  [true, Database.parse("SELECT * FROM ?? WHERE id = ?", ["payment", 1]), "SELECT * FROM `payment` WHERE id = 1"],
  [true, Database.parse("SELECT * FROM ?? WHERE id IN (?)", ["payment", [1, 2, 3]]), "SELECT * FROM `payment` WHERE id IN (1, 2, 3)"],
  [true, Database.parse("SELECT * FROM ?? WHERE ?", ["payment", {id: [1, 2, 3]}]), "SELECT * FROM `payment` WHERE `id` IN (1, 2, 3)"],
  [true, Database.parse("INSERT INTO ?? SET ?", ["payment", {id: 1, order_id: 2, manager: "Jake"}]), "INSERT INTO `payment` SET `id` = 1, `order_id` = 2, `manager` = 'Jake'"],
  [true, Database.parse("user_id = ?", Buffer.from("eb8befe2938a4ea7b47bef5bf3f57922", "hex")), "user_id = X'eb8befe2938a4ea7b47bef5bf3f57922'"],
  [
    true,
    Database.parse("UPDATE `role/user` SET ?", {
      role_id: Buffer.from("eb8befe2938a4ea7b47bef5bf3f57922", "hex"),
      user_id: Buffer.from("7827e2f992bc480e985e981f57051d97", "hex")
    }),
    "UPDATE `role/user` SET `role_id` = X'eb8befe2938a4ea7b47bef5bf3f57922', `user_id` = X'7827e2f992bc480e985e981f57051d97'"
  ]
], (test, number) => {
  const success = test[0] === _.isEqual(test[1], test[2]);
  console[success ? "log" : "error"]("Test", number + 1, success ? "suceeded" : "failed (" + test[0] + ")");
});
