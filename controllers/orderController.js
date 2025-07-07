const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create new order from cart
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res, next) => {
    const { shippingAddress, paymentMethod } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
        return next(new ErrorResponse('No items in cart', 400));
    }

    // Check stock for all items
    for (const item of cart.items) {
        const product = await Product.findById(item.product._id);
        if (product.stock < item.quantity) {
            return next(new ErrorResponse(`Not enough stock for ${product.name}`, 400));
        }
    }

    // Create order items array
    const orderItems = cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price
    }));

    // Create order
    const order = await Order.create({
        user: req.user.id,
        items: orderItems,
        total: cart.total,
        shippingAddress,
        paymentMethod
    });

    // Update product stock
    for (const item of cart.items) {
        await Product.findByIdAndUpdate(item.product._id, {
            $inc: { stock: -item.quantity }
        });
    }

    // Clear cart
    await Cart.findByIdAndDelete(cart._id);

    res.status(201).json({
        success: true,
        data: order
    });
});

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find({ user: req.user.id }).populate('items.product');

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Get all orders (admin)
// @route   GET /api/orders/all
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find().populate('user', 'name email').populate('items.product');

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders
    });
});

// @desc    Update order status
// @route   PUT /api/orders/:id
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    order.status = status;
    await order.save();

    res.status(200).json({
        success: true,
        data: order
    });
});