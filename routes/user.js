const express = require("express");
const SHA256 = require("crypto-js/sha256");
const base64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const convertToBase64 = require("../utiles/convertToBase64");

const router = express.Router();

const User = require("../modeles/User");

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    // Destructuring de la requête
    const { username, email, password, newsletter } = req.body;
    // Définition des constantes à renseigner
    const salt = uid2(16);
    const hash = SHA256(password + salt).toString(base64);
    const token = uid2(64);

    // Vérification de l'unicité de l'email
    const isAccountExist = await User.findOne({ email });

    if (isAccountExist) {
      return res
        .status(400)
        .json({ message: "An account using this email already exists" });
    }

    // Vérification de la présence de tous les paramètres
    if (!username || !email || !password || newsletter === undefined) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    // Déclaration du nouveau compte
    const newUser = new User({
      email,
      account: {
        username,
      },
      newsletter,
      token,
      hash,
      salt,
    });

    // Enregistrement de l'avatar
    if (req.files) {
      const result = await cloudinary.uploader.upload(
        convertToBase64(req.files.avatar),
        { folder: `vinted/users/${newUser._id}` }
      );

      newUser.account.avatar.secure_url = result.secure_url;
      newUser.account.avatar.public_id = result.public_id;
    } else {
      // Si pas d'avatar, un avatar par défaut est affecté
      newUser.account.avatar.secure_url =
        "https://res.cloudinary.com/dwdykfhtf/image/upload/v1684566311/vinted/default_pictures/default-avatar.jpg";
      newUser.account.avatar.public_id =
        "vinted/default_pictures/default-avatar.jpg";
    }

    await newUser.save();
    return res.status(200).json({
      _id: newUser._id,
      token: newUser.token,
      account: {
        username: newUser.account.username,
        avatar: newUser.account.avatar.secure_url,
      },
    });
  } catch (error) {
    return res.status(400).json(error.message);
  }
});

router.post("/user/login", async (req, res) => {
  try {
    // Destructuring de la requête
    const { email, password } = req.body;

    // Identification du compte par l'email
    const user = await User.findOne({ email });

    if (!user) {
      // Si aucun compte n'est trouvé, alors :
      return res.status(400).json({ message: "Invalid email" });
    }

    // Reconstruction du hash avec le mot de passe renseigné
    const submittedHash = SHA256(password + user.salt).toString(base64);

    if (user.hash === submittedHash) {
      // Si le hash obtenu est le même que le hash enregistré en base, alors :
      return res.status(200).json({
        _id: user._id,
        token: user.token,
        account: { username: user.account.username },
      });
    } else {
      return res.status(400).json({ message: "Invalid password" });
    }
  } catch (error) {
    res.status(200).json({ message: error.message });
  }
});

module.exports = router;
