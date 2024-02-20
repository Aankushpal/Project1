var mongoose = require('mongoose');

var plm = require('passport-local-mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/passsjsdb");

var userSchema = mongoose.Schema({
  username: String,
  name: String,
  bio: String,
  email: String,
  image:{
    type: String,
    default: "def.png"
  },
  password: String,
  age: String,
  posts:[
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post"
    }
  ]
})

userSchema.plugin(plm);

module.exports = mongoose.model('user', userSchema)