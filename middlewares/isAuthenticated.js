const isAuthenticated = (req, res, next) => {
  if (req.headers.authorization) {
    const sentToken = req.headers.authorization.replace("Bearer ", "");
    // Si un token a bien été envoyé, alors :
    req.body.token = sentToken;
    next();
  } else {
    res.status(401).json("Unauthorized");
  }
};

module.exports = isAuthenticated;
