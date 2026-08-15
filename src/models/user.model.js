const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required for creating a user'],
  },
  email: {
    type: String,
    required: [true, 'Email is required for creating a user'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    unique: [true, 'Email already exists. Please use a different email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required for creating a user'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false, // Exclude password from query results by default

  },
},{
    timestamps: true, // Automatically adds createdAt and updatedAt fields
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return;
  }

  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;
 

});


userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
}

const User = mongoose.model('User', userSchema);
module.exports = User;