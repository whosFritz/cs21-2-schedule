const userModel = require("../models/user.model");

const updateUserToken = async (userID = null, token) => {
  await userModel.findOneAndUpdate({
    userID: userID,
    token: token,
  });
};

module.exports = updateUserToken;
