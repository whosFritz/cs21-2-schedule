const cron = require("node-cron");
const crawlScheduleData = require("../helpers/crawlScheduleData.helpers");
const checkPwd = require("../helpers/checkPwd.helpers");
const getEndTime = require("../helpers/endTime.helpers");
const { connectDB } = require("./db.service");
const bcrypt = require("bcryptjs");
const userModel = require("../models/userModel");
const https = require("https");
const fs = require("fs");
const path = require("path");
const checkUserExistence = require("../helpers/checkUserExistence.helpers");
const createNewUser = require("../helpers/createNewUser.helpers");
const updateUserLastLogin = require("../helpers/updateUserLastLogin");
const checkUserRegistered = require("../helpers/checkUserRegistered.helpers");

let data;

(async () => {
  await connectDB();
  data = await crawlScheduleData();
})();

async function getData(req) {
  if (!data)
    return {
      status: 502,

      json: "no data",
    };
  const pwd = req.query.pwd;
  const userID = req.query.userID;
  const isUserRegistered = await checkUserRegistered(userID);
  if (!userID) {
    const isPwdValid = await checkPwd(pwd, { checkUserHash: false });
    if (!isPwdValid) return { status: 401, json: "not authorized" };
    return { status: 200, json: data };
  } else {
    const isPwdValid = await checkPwd(pwd, {
      checkUserHash: isUserRegistered.get("hash").trim(),
    });
    if (!isPwdValid) return { status: 401, json: "not authorized" };
    return { status: 200, json: data };
  }
}

async function login(req) {
  const pwd = req.body.pwd;
  const isPwdValid = await checkPwd(pwd, { checkUserHash: false });
  if (!isPwdValid) return { status: 401, json: "login failed" };
  return { status: 200, json: "login success" };
}

async function userLogin(req) {
  const userID = req.body.userID;
  const userHash = req.body.hash;
  const isUserExisting = await checkUserExistence(userID, userHash);

  if (!isUserExisting)
    return { status: 401, json: "login failed, user does not exist" };

  const isUserRegistered = await checkUserRegistered(userID);

  if (isUserRegistered) {
    const isHashValid = await checkPwd(userHash, {
      checkUserHash: isUserRegistered.get("hash").trim(),
    });

    if (!isHashValid) return { status: 401, json: "login failed" };

    try {
      await updateUserLastLogin(userID);
      return { status: 200, json: "login success" };
    } catch (error) {
      console.error(error);
      return { status: 500, json: "login failed" };
    }
  } else {
    const hash = await bcrypt.hashSync(userHash);

    try {
      await createNewUser(userID, hash);
      return { status: 200, json: "registration success" };
    } catch (error) {
      console.error(error);
      return { status: 500, json: "registration failed" };
    }
  }
}
async function getEndTimeOfCurrentDay(req) {
  if (!data)
    return {
      status: 502,

      json: "no data",
    };
  let endtime = getEndTime(data);
  return { status: 200, json: endtime };
}

cron.schedule("*/5 * * * *", async () => {
  data = await crawlScheduleData();
});

module.exports = {
  getData,
  login,
  getEndTimeOfCurrentDay,
  userLogin,
};
