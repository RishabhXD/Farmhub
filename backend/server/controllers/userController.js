import passport from "passport";
import path from "path";
import fs from "fs";
import Product from "../models/productModel";
import User from "../models/userModel";
require("dotenv").config();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
import twilio from "twilio";

// -------------------------------- User Authentication --------------------------------

export const currentUserDetails = (req, res) => {
  if (!req.user) {
    res.status(401).json({ message: "User not authenticated" });
  } else {
    res.status(200).json(req.user);
  }
};

export const login = (req, res, next) => {
  passport.authenticate("local", function (err, user, info) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.logIn(user, function (err) {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.status(200).json(user);
    });
  })(req, res, next);
};

export const logout = (req, res) => {
  req.logout(function (err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(200).json({ message: "User logged out" });
  });
};

// -------------------------------- Manage and View Users --------------------------------

const readImage = (file) => {
  let avatar = {};
  avatar.data = fs.readFileSync(
    path.join(__dirname, "..", "..", "uploads", String(file.filename))
  );
  avatar.contentType = file.mimetype;
  return avatar;
};

export const createUser = async (req, res) => {
  try {
    if (req.file) {
      req.body.avatar = readImage(req.file);
    }
    let newUser = new User(req.body);
    const user = await newUser.save();
    res.status(201).json(user); // 201 Created
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    if (req.file) {
      req.body.avatar = readImage(req.file);
    }
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { phoneNumber: req.body.phoneNumber },
      { password: req.body.password },
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const isMatch = await user.comparePassword(req.body.oldPassword);
    if (!isMatch)
      return res.status(400).json({ message: "Old password is incorrect" });
    req.body.phoneNumber = user.phoneNumber;
    changePassword(req, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndRemove(req.params.userId);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const displayUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const userList = async (req, res) => {
  try {
    const user = await User.find({});
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------- Manage User Addresses --------------------------------

export const addAddress = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $push: { addresses: req.body } },
      { new: true, runValidators: true }
    );
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, "addresses._id": req.params.addressId },
      { $set: { "addresses.$": req.body } },
      { new: true, runValidators: true }
    );
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, "addresses._id": req.params.addressId },
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true, runValidators: true }
    );
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// -------------------------------- Manage User Cart --------------------------------

export const addToCart = async (req, res) => {
  try {
    const product = await Product.findById(req.body.product);
    if (product.quantity < req.body.quantity) {
      res.status(400).json({ message: "Not sufficient quantity available" });
      return;
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.body.product,
      { $inc: { quantity: -req.body.quantity } },
      { new: true, runValidators: true }
    );
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $push: { cart: req.body } },
      { new: true, runValidators: true }
    );
    res.status(200).json({ product: updatedProduct, user: user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateInCart = async (req, res) => {
  try {
    if (req.body.quantity < 1) {
      deletefromCart(req, res);
      return;
    }
    const user = await User.findOne(
      { _id: req.params.userId, "cart.product": req.params.productId },
      { "cart.$": 1 }
    );
    const quantity = req.body.quantity - user.cart[0].quantity;
    const product = await Product.findById(req.params.productId);
    if (product.quantity < quantity) {
      res.status(400).json({ message: "Not sufficient quantity available" });
      return;
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      { $inc: { quantity: -quantity } },
      { new: true, runValidators: true }
    );
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.userId, "cart.product": req.params.productId },
      { $set: { "cart.$.quantity": req.body.quantity } },
      { new: true, runValidators: true }
    );
    res.status(200).json({ product: updatedProduct, user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletefromCart = async (req, res) => {
  try {
    const user = await User.findOne(
      { _id: req.params.userId, "cart.product": req.params.productId },
      { "cart.$": 1 }
    );
    const quantity = user.cart[0].quantity;
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { $inc: { quantity: +quantity } },
      { new: true, runValidators: true }
    );
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.userId, "cart.product": req.params.productId },
      { $pull: { cart: { product: req.params.productId } } },
      { new: true, runValidators: true }
    );
    res.status(200).json({ user: updatedUser, product: product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Forget password

export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ phoneNumber: req.body.phoneNumber });
  const phoneNumber = req.body.phoneNumber;
  const client = twilio(accountSid, authToken);
  const Otp = user.getResetPasswordOtp();
  const userUpdate = await User.findOneAndUpdate(
    { phoneNumber: req.body.phoneNumber },
    { resetPasswordOtp: Otp },
    { new: true, runValidators: true }
  );
  res.status(200).json({ user: userUpdate });

  if (!user) {
    res.status(404).json({ message: "User not found" }); // 404 Not Found
    return;
  }

  try {
    console.log(Otp);
    client.messages
      .create({
        body: ` ${Otp} This is your OTP for Farmhub password reset`,
        from: "+12708136198",
        to: `+91 ${phoneNumber}`,
      })
      .then((message) => {
        // console.log(message)
        // res.json(message)
      });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkOtp = async (req, res) => {
  const user = await User.findOne({ phoneNumber: req.body.phoneNumber });
  if (req.body.otp !== user.resetPasswordOtp) {
    return res.status(401).json({ message: "Invalid OTP" }); // 401 Unauthorized
  }
  res.status(200).json({ message: "Valid OTP" });
  // changePassword(req,res)
};
