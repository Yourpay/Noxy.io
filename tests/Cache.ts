// Promise.map([
//   [true,
//    Cache.set("object", User.__type, 1, () => new User({email: "test", username: "test", password: "test"}).save(true)),
//    new User({email: "test", username: "test", password: "test"}).save(true)],
// ], (test, number) => {
//   const success = test[0] === _.isEqual(test[1], test[2]);
//   console[success ? "log" : "error"]("Test", number + 1, success ? "suceeded" : "failed (" + test[0] + ")");
// });
