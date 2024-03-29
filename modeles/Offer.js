const mongoose = require("mongoose");

const Offer = mongoose.model("Offer", {
  product_name: String,
  product_description: String,
  product_price: Number,
  product_details: Array,
  product_image: [{ public_id: String, secure_url: String }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  buyer: {
    buyerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    orderPrice: Number,
    date: Date,
  },
});

module.exports = Offer;
