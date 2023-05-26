const User = require("../modeles/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const sentToken = req.headers.authorization.replace("Bearer ", "");
      const foundUser = await User.findOne({ token: sentToken });
      req.body.user = foundUser;
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = isAuthenticated;
