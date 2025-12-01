const mongoose = require("mongoose");

const registerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    section: {
        type: String,
        enum: ["EV-1", "EV-2", "EV-3", "EV-4", "EV-5"], // <-- your section codes
        required: true
    }
});

module.exports = mongoose.model("Register", registerSchema);