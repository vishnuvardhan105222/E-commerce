const express = require('express');
const {
    createOrder,
    getOrders,
    getAllOrders,
    updateOrderStatus
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .post(protect, createOrder)
    .get(protect, getOrders);

router.route('/all')
    .get(protect, authorize('admin'), getAllOrders);

router.route('/:id')
    .put(protect, authorize('admin'), updateOrderStatus);

module.exports = router;