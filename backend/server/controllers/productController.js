import Product from "../models/productModel";
import path from "path";
import fs from "fs";

const readImage = (files) => {
  let images = [];
  files.forEach((file) => {
    let image = {};
    image.data = fs.readFileSync(
      path.join(__dirname, "..", "..", "uploads", String(file.filename))
    );
    image.contentType = file.mimetype;
    images.push(image);
  });
  return images;
};

export const addProduct = async (req, res) => {
  try {
    if (req.files.length) req.body.images = readImage(req.files);
    let newProduct = new Product(req.body);
    const product = await newProduct.save();
    res.status(201).json(product); // 201 Created
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (req.files.length) req.body.images = readImage(req.files);
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndRemove(req.params.productId);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const displayProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.productId).populate(
      "reviews.user"
    );
    if (req.user) {
      product.reviews.sort((a, b) => {
        if (a.user._id.equals(req.user._id)) return -1;
        if (b.user._id.equals(req.user._id)) return 1;
        return 0;
      });
    }
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const productList = async (req, res) => {
  try {
    const products = await Product.find(
      { category: req.params.category },
      "name price images reviews brand"
    ).sort(req.params.sort !== "none" ? req.params.sort : "");
    const brands = await Product.find({
      category: req.params.category,
    }).distinct("brand");
    res.status(200).json({ products: products, brands: brands });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const productSearch = async (req, res) => {
  try {
    const products = await Product.find(
      { $text: { $search: req.params.term } },
      "name price images reviews brand"
    ).sort(req.params.sort !== "none" ? req.params.sort : "");
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTopProducts = async (req, res) => {
  try {
    const topProducts = [
      "6432960be07105bc0a7ebc1d",
      "643296e1e07105bc0a7ebc20",
      "643bdd29697478b49cc1de9a",
      "643bde8e697478b49cc1ded3",
      "643bdf5f697478b49cc1ded7",
      "643be2ec4885fe0b918bb12b",
      "643be5194885fe0b918bb15d",
      "643be5d64885fe0b918bb192",
    ];
    const products = await Product.find({ _id: { $in: topProducts } });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addReview = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { $push: { reviews: req.body } },
      { new: true, runValidators: true }
    );
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateReview = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, "reviews.user": req.params.userId },
      {
        $set: {
          "reviews.$.rating": req.body.rating,
          "reviews.$.description": req.body.description,
        },
      },
      { new: true }
    );
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, "reviews.user": req.params.userId },
      { $pull: { reviews: { user: req.params.userId } } },
      { new: true }
    );
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
