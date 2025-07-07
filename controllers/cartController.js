const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');

    if (!cart) {
        return res.status(200).json({
            success: true,
            data: { items: [], total: 0 }
        });
    }

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = asyncHandler(async (req, res, next) => {
    const { productId, quantity } = req.body;

    // Get product to check if it exists and get price
    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${productId}`, 404));
    }

    // Check if product is in stock
    if (product.stock < quantity) {
        return next(new ErrorResponse(`Not enough stock available`, 400));
    }

    // Find user's cart or create one if it doesn't exist
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
        cart = await Cart.create({
            user: req.user.id,
            items: [],
            total: 0
        });
    }

    // Check if item already exists in cart
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
        // Update quantity if item exists
        cart.items[itemIndex].quantity += quantity;
    } else {
        // Add new item to cart
        cart.items.push({
            product: productId,
            quantity,
            price: product.price
        });
    }

    // Save cart
    await cart.save();

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res, next) => {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity < 1) {
        return next(new ErrorResponse('Quantity must be at least 1', 400));
    }

    // Find user's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
        return next(new ErrorResponse('Cart not found', 404));
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
        return next(new ErrorResponse('Item not found in cart', 404));
    }

    // Get product to check stock
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product) {
        return next(new ErrorResponse('Product not found', 404));
    }

    // Check stock
    if (product.stock < quantity) {
        return next(new ErrorResponse('Not enough stock available', 400));
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res, next) => {
    const { itemId } = req.params;

    // Find user's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
        return next(new ErrorResponse('Cart not found', 404));
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
        return next(new ErrorResponse('Item not found in cart', 404));
    }

    // Remove item
    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({
        success: true,
        data: cart
    });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOneAndDelete({ user: req.user.id });

    res.status(200).json({
        success: true,
        data: {}
    });
});