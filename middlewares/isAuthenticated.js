const User = require("../modeles/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const sentToken = req.headers.authorization.replace("Bearer ", "");
      const foundUser = await User.findOne({ token: sentToken });
      if (foundUser) {
        req.body.user = foundUser;
        next();
      } else {
        return res.status(400).json({ message: "Unauthorised" });
      }
    } else {
      res
        .status(401)
        .json({ message: "You must be connected to edit an offer" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = isAuthenticated;
