const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// GET /api/orders
router.get('/', orderController.getAllOrders);

// GET /api/orders/:id
router.get('/:id', orderController.getOrderById);

// POST /api/orders
router.post('/', orderController.createOrder);

// PATCH /api/orders/:id/status
router.patch('/:id/status', orderController.updateOrderStatus);

// DELETE /api/orders/:id
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
