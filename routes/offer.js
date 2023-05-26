const express = require("express");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");
const convertToBase64 = require("../utiles/convertToBase64");

const router = express.Router();

const Offer = require("../modeles/Offer");
const User = require("../modeles/User");

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      // Destructuring de la requête
      const {
        product_name,
        product_description,
        product_price,
        condition,
        city,
        brand,
        size,
        color,
        token,
      } = req.body;

      // Identification du compte par le token
      const foundUser = await User.findOne({ token });

      if (foundUser) {
        if (
          product_name &&
          product_description &&
          product_price &&
          condition &&
          brand &&
          size &&
          color &&
          city
        ) {
          if (product_description.length >= 500) {
            return res
              .status(400)
              .json({ message: "Description must be under 500 characters" });
          }

          if (product_name.length >= 50) {
            return res
              .status(400)
              .json({ message: "Product name must be under 50 characters" });
          }

          if (product_price > 100000) {
            return res
              .status(400)
              .json({ message: "Product price must be under 100000" });
          }

          // Déclaration du tableau product_details
          const product_details = [];
          product_details.push(
            { ETAT: condition },
            { MARQUE: brand },
            { TAILLE: size },
            { COULEUR: color },
            { EMPLACEMENT: city }
          );

          // Déclaration de la nouvelle offre
          const newOffer = new Offer({
            product_name,
            product_description,
            product_price,
            product_details,
            owner: foundUser,
          });

          if (req.files) {
            // Enregistrement des fichiers images sur Cloudinary
            const arrayOfFilesUrl = [];
            const picturesToUpload = req.files.pictures;
            if (picturesToUpload.length) {
              // Si plusieurs images envoyées
              if (picturesToUpload.length <= 20) {
                const arrayOfPromises = picturesToUpload.map((picture) => {
                  return cloudinary.uploader.upload(convertToBase64(picture), {
                    folder: `vinted/offers/${newOffer._id}`,
                  });
                });
                const result = await Promise.all(arrayOfPromises);
                console.log(result);
                for (let i = 0; i < result.length; i++) {
                  arrayOfFilesUrl.push({
                    secure_url: result[i].secure_url,
                    public_id: result[i].public_id,
                  });
                }
              } else {
                res
                  .status(400)
                  .json({ message: "Cannot send more than 20 pictures" });
              }
            } else {
              // Si une seule image envoyée
              const result = await cloudinary.uploader.upload(
                convertToBase64(picturesToUpload),
                { folder: `vinted/offers/${newOffer._id}` }
              );
              arrayOfFilesUrl.push({
                secure_url: result.secure_url,
                public_id: result.public_id,
              });
            }

            // Déclaration de l'adresse des images uploadées
            newOffer.product_image = arrayOfFilesUrl;

            // Enregistrement de la nouvelle offre
            await newOffer.save();

            return res.status(201).json({
              _id: newOffer._id,
              product_name: newOffer.product_name,
              product_price: newOffer.product_price,
              product_details: newOffer.product_details,
              owner: {
                account: newOffer.owner.account,
                _id: newOffer.owner._id,
              },
              product_image: newOffer.product_image,
            });
          } else return res.status(400).json({ message: "Missing picture" });
        } else {
          return res.status(400).json({ message: "Missing parameters" });
        }
      } else {
        return res.status(401).json({ message: "Authentication error" });
      }
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.put("/offer/modify", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    // Destructuring de la requête
    const {
      token,
      offerID,
      product_name,
      product_description,
      product_price,
      condition,
      city,
      brand,
      size,
      color,
      pictureToDelete,
    } = req.body;

    if (product_description.length > 500) {
      return res
        .status(400)
        .json({ message: "Description must be under 500 characters" });
    }

    if (product_name.length > 50) {
      return res
        .status(400)
        .json({ message: "Product name must be under 50 characters" });
    }

    if (product_price > 100000) {
      return res
        .status(400)
        .json({ message: "Product price must be under 100000" });
    }

    const foundUser = await User.findOne({ token });
    const offerToEdit = await Offer.findById(offerID);

    const modifyingUser = foundUser._id.toString();
    const offerOwner = offerToEdit.owner.toString();

    if (modifyingUser === offerOwner) {
      if (product_name) {
        offerToEdit.product_name = product_name;
      }
      if (product_description) {
        offerToEdit.product_description = product_description;
      }
      if (product_price) {
        offerToEdit.product_price = product_price;
      }
      if (condition) {
        offerToEdit.product_details[0].ETAT = condition;
      }
      if (brand) {
        offerToEdit.product_details[1].MARQUE = brand;
      }
      if (size) {
        offerToEdit.product_details[2].TAILLE = size;
      }
      if (color) {
        offerToEdit.product_details[3].COULEUR = color;
      }
      if (city) {
        offerToEdit.product_details[4].EMPLACEMENT = city;
      }

      let numberOfPictures = offerToEdit.product_image.length;

      if (req.files) {
        // Enregistrement des fichiers images sur Cloudinary
        const arrayOfFilesUrl = [];
        const picturesToUpload = req.files.pictures;
        if (picturesToUpload.length) {
          // Si plusieurs images envoyées
          if (picturesToUpload.length + numberOfPictures <= 20) {
            try {
              for (let i = 0; i < picturesToUpload.length; i++) {
                const picture = picturesToUpload[i];
                const result = await cloudinary.uploader.upload(
                  convertToBase64(picture),
                  { folder: `vinted/offers/${offerToEdit._id}` }
                );
                arrayOfFilesUrl.push({
                  secure_url: result.secure_url,
                  public_id: result.public_id,
                });
              }
            } catch (error) {
              return res.status(500).json({ message: error.message });
            }
          } else {
            res
              .status(400)
              .json({ message: "Cannot send more than 20 pictures" });
          }
        } else {
          // Si une seule image envoyée
          try {
            if (numberOfPictures < 20) {
              const result = await cloudinary.uploader.upload(
                convertToBase64(picturesToUpload),
                { folder: `vinted/offers/${offerToEdit._id}` }
              );
              arrayOfFilesUrl.push({
                secure_url: result.secure_url,
                public_id: result.public_id,
              });
            } else {
              return res
                .status(400)
                .json({ message: "Cannot send more than 20 pictures" });
            }
          } catch (error) {
            return res.status(500).json({ message: error.message });
          }
        }
        for (let i = 0; i < arrayOfFilesUrl.length; i++) {
          offerToEdit.product_image.push(arrayOfFilesUrl[i]);
        }
      }

      numberOfPictures = offerToEdit.product_image.length;

      if (pictureToDelete) {
        if (numberOfPictures > 1) {
          console.log(offerToEdit.product_image);
          const indexToDelete = offerToEdit.product_image.findIndex(
            (element) => element.public_id === pictureToDelete
          );

          offerToEdit.product_image.splice(indexToDelete, 1);

          await cloudinary.uploader.destroy(pictureToDelete);
        } else {
          return res
            .status(400)
            .json({ message: "Cannot post an offer without picture" });
        }
      }

      offerToEdit.save();

      return res.status(201).json({
        _id: offerToEdit._id,
        product_name: offerToEdit.product_name,
        product_price: offerToEdit.product_price,
        product_details: offerToEdit.product_details,
        owner: {
          account: foundUser.account,
          _id: foundUser._id,
        },
        product_image: offerToEdit.product_image,
      });
    } else {
      return res
        .status(400)
        .json({ message: "You are not allowed to edit this offer" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findOne({ token: req.body.token });
    const offerToDelete = await Offer.findById(req.body.offerToDelete);

    const DeletingUser = user._id.toString();
    const offerOwner = offerToDelete.owner.toString();

    if (DeletingUser === offerOwner) {
      for (let i = 0; i < offerToDelete.product_image.length; i++) {
        const pictureToDelete = offerToDelete.product_image[i].public_id;
        await cloudinary.uploader.destroy(pictureToDelete);
      }
      await cloudinary.api.delete_folder(
        `vinted/offers/${req.body.offerToDelete}`
      );

      await Offer.findByIdAndDelete(req.body.offerToDelete);
    } else {
      return res
        .status(400)
        .json({ message: "You are not allowed to delete this offer" });
    }

    return res.status(200).json({ message: "Offer successfully deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
    let { title, priceMin, priceMax, sort, page } = req.query;

    if (!priceMax) {
      priceMax = 100000;
    }

    if (!priceMin) {
      priceMin = 0;
    }

    if (!page) {
      page = 1;
    }

    if (sort === "price-desc") {
      sort = "desc";
    } else if (sort === "price-asc") {
      sort = "asc";
    }

    const regexTitle = new RegExp(title, "i");

    const limit = 5;

    const filters = {
      product_name: regexTitle,
      product_price: { $gte: priceMin, $lte: priceMax },
    };
    const count = await Offer.countDocuments(filters);
    const offers = await Offer.find(filters)
      .sort({ product_price: sort })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "owner", select: "account -_id" })
      .select("-__v");
    res.status(200).json({ count, offers });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offerToDisplay = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account -_id",
    });
    if (offerToDisplay) {
      return res.status(200).json(offerToDisplay);
    } else {
      return res.status(400).json({ message: "This offer doesn't exist" });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
