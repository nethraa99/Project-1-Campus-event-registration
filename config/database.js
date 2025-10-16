const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/mini_project2");
const db = mongoose.connection;
 
db.on('connected', (err) => {
    if(!err){
        console.log("Database connected successfully");
    }
})

module.exports = db;