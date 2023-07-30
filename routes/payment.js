require("dotenv").config();
const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");
const stripe = require("stripe")(process.env.STRIPE_SECRET_API_KEY);

const router = express.Router();

router.post("/payment", async (req, res) => {
  const { stripeToken, title, seller, price } = req.body;
  try {
    console.log(req.body);
    const charge = await stripe.charges.create({
      amount: price * 100,
      currency: "eur",
      source: stripeToken,
      description: `Vinted.fr ${title} acheté à ${seller} pour ${price}€`,
    });
    console.log(charge);
    res.status(200).json(charge);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
