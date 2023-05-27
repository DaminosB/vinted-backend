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
        user,
      } = req.body;

      // Vérification de la présence des paramètres
      if (
        !product_name ||
        !product_description ||
        !product_price ||
        !condition ||
        !brand ||
        !size ||
        !color ||
        !city ||
        !req.files
      ) {
        return res.status(400).json({ message: "Missing parameters" });
      }

      // Vérification de la validité des paramètres
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
        owner: user,
      });

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
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);

router.put("/offer/modify", isAuthenticated, fileUpload(), async (req, res) => {
  try {
    // Destructuring de la requête
    const {
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
      user,
    } = req.body;

    // Vérification des autorisations de l'utilisateur
    const offerToEdit = await Offer.findById(offerID);

    const modifyingUser = user._id.toString();
    const offerOwner = offerToEdit.owner.toString();

    if (modifyingUser !== offerOwner) {
      return res
        .status(400)
        .json({ message: "You are not allowed to edit this offer" });
    }

    // Modification du nom
    if (product_name) {
      if (product_name.length <= 50) {
        offerToEdit.product_name = product_name;
      } else {
        return res
          .status(400)
          .json({ message: "Product name must be under 50 characters" });
      }
    }

    // Modification de la description
    if (product_description) {
      if (product_description.length <= 500) {
        offerToEdit.product_description = product_description;
      } else {
        return res
          .status(400)
          .json({ message: "Description must be under 500 characters" });
      }
    }

    // Modification du prix
    if (product_price) {
      if (product_price <= 100000) {
        offerToEdit.product_price = product_price;
      } else {
        return res
          .status(400)
          .json({ message: "Product price must be under 100000" });
      }
    }

    // Modification des product_details
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

    // Upload de nouvelles photos
    if (req.files) {
      let numberOfPictures = offerToEdit.product_image.length;
      // Enregistrement des fichiers images sur Cloudinary
      const arrayOfFilesUrl = [];
      const picturesToUpload = req.files.pictures;
      if (picturesToUpload.length) {
        // Si plusieurs images envoyées
        if (picturesToUpload.length + numberOfPictures <= 20) {
          const arrayOfPromises = picturesToUpload.map((picture) => {
            return cloudinary.uploader.upload(convertToBase64(picture), {
              folder: `vinted/offers/${offerToEdit._id}`,
            });
          });
          const result = await Promise.all(arrayOfPromises);
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
      }
      for (let i = 0; i < arrayOfFilesUrl.length; i++) {
        offerToEdit.product_image.push(arrayOfFilesUrl[i]);
      }
    }

    // Mise à jour du nombre de photos dans le tableau product_image
    numberOfPictures = offerToEdit.product_image.length;

    // Suppression de photos
    if (typeof pictureToDelete === "string") {
      if (numberOfPictures > 1) {
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
    } else if (typeof pictureToDelete === "object") {
      if (numberOfPictures - pictureToDelete.length >= 1) {
        const arrayOfPromises = pictureToDelete.map((picture) => {
          return cloudinary.uploader.destroy(picture);
        });
        await Promise.all(arrayOfPromises);
        for (let i = 0; i < pictureToDelete.length; i++) {
          const indexToDelete = offerToEdit.product_image.findIndex(
            (element) => element.public_id === pictureToDelete[i]
          );
          offerToEdit.product_image.splice(indexToDelete, 1);
        }
      }
    }

    offerToEdit.save();

    return res.status(200).json({
      _id: offerToEdit._id,
      product_name: offerToEdit.product_name,
      product_price: offerToEdit.product_price,
      product_details: offerToEdit.product_details,
      owner: {
        account: user.account,
        _id: user._id,
      },
      product_image: offerToEdit.product_image,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const { user, offerToDeleteID } = req.body;
    const offerToDelete = await Offer.findById(offerToDeleteID);

    const deletingUser = user._id.toString();
    const offerOwner = offerToDelete.owner.toString();

    if (deletingUser === offerOwner) {
      for (let i = 0; i < offerToDelete.product_image.length; i++) {
        const pictureToDelete = offerToDelete.product_image[i].public_id;
        await cloudinary.uploader.destroy(pictureToDelete);
      }
      await cloudinary.api.delete_folder(`vinted/offers/${offerToDeleteID}`);

      await Offer.findByIdAndDelete(offerToDeleteID);
      return res.status(200).json({ message: "Offer successfully deleted" });
    } else {
      return res
        .status(400)
        .json({ message: "You are not allowed to delete this offer" });
    }
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
