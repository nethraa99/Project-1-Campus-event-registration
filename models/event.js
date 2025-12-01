const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    location: { type: String },
    capacity: { type: Number, default: 0 },
    poster: { type: String }, // store image filename
    createdAt: { type: Date, default: Date.now },
      category: {
    type: String,
    enum: ["Sports", "Technical", "Cultural", "Other"],
    default: "Other"
  }

});

module.exports = mongoose.model('Event', eventSchema);
