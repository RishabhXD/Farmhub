import Order from "../models/orderModel";
import User from "../models/userModel";

export const createOrder = async (req, res) => {
  try {
    console.log(req.body);
    const user = await User.findById(req.params.userId).populate(
      "cart.product"
    );
    let newOrders = [];
    for (const item of user.cart) {
      const subtotal = item.product.price * item.quantity;
      const newOrder = new Order({
        product: item.product._id,
        quantity: item.quantity,
        subtotal: subtotal,
        shippingCharges: subtotal > 1500 ? 0 : 60,
        tax: subtotal * 0.18,
        total: subtotal + subtotal * 0.18 + (subtotal > 1500 ? 0 : 60),
        paymentInfo: req.body.paymentInfo,
        user: req.params.userId,
        address: req.body.address,
      });
      newOrders.push(newOrder);
    }
    const orders = await Order.insertMany(newOrders, { populate: "product" });
    await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { cart: [] } },
      { runValidators: true }
    );
    res.status(201).json(orders); // 201 Created
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const orderInfo = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("product");
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    let dd;
    if (req.body.status === "Delivered") dd = new Date();
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: req.body.status, dateDelivered: dd },
      { new: true, runValidators: true }
    );
    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const orderList = async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const userOrder = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.params.userId })
      .populate("product")
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
