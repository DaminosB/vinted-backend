require("dotenv").config();
const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");
const stripe = require("stripe")(process.env.STRIPE_SECRET_API_KEY);

const Offer = require("../modeles/Offer");
const User = require("../modeles/User");

const router = express.Router();

router.post("/payment", async (req, res) => {
  const { stripeToken, token, title, seller, price, offerID } = req.body;
  try {
    // console.log(req.body);
    const charge = await stripe.charges.create({
      amount: price * 100,
      currency: "eur",
      source: stripeToken,
      description: `Vinted.fr ${title} acheté à ${seller} pour ${price}€`,
    });
    // console.log(charge);

    const offerToEdit = await Offer.findById(offerID);
    const buyer = await User.findOne({ token });

    offerToEdit.buyer.buyerID = buyer._id;
    offerToEdit.buyer.orderPrice = price;
    offerToEdit.buyer.date = new Date();

    console.log(typeof offerToEdit.buyer.date);

    offerToEdit.save();

    res.status(200).json(charge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
