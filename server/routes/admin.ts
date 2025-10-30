


import { Router } from 'express';

import {

  getAllUsers,

  getUserDetails,

  createUserManually,

  updateUserStatus,

  updateUserBalance,

} from '../user-management';

import {

  getPendingPaymentRequests,

  approvePaymentRequest,

  rejectPaymentRequest,

} from '../controllers/adminController';

import { validateAdminAccess } from '../security';



const router = Router();



// All routes in this file are protected by the validateAdminAccess middleware

router.use(validateAdminAccess);



// User management routes

router.get('/users', async (req, res) => {

  try {

    const filters = req.query;

    const result = await getAllUsers(filters);

    if (result.success) {

      res.json(result);

    } else {

      res.status(400).json(result);

    }

  } catch (error) {

    res.status(500).json({ success: false, error: 'Internal server error' });

  }

});



router.get('/users/:userId', async (req, res) => {

  try {

    const { userId } = req.params;

    const result = await getUserDetails(userId);

    if (result.success) {

      res.json(result);

    } else {

      res.status(404).json(result);

    }

  } catch (error) {

    res.status(500).json({ success: false, error: 'Internal server error' });

  }

});



router.post('/users/create', async (req, res) => {

  try {

    const adminId = req.user?.id;

    if (!adminId) {

      return res.status(401).json({ success: false, error: 'Unauthorized' });

    }

    const result = await createUserManually(adminId, req.body);

    if (result.success) {

      res.status(201).json(result);

    } else {

      res.status(400).json(result);

    }

  } catch (error) {

    res.status(500).json({ success: false, error: 'Internal server error' });

  }

});



router.patch('/users/:userId/status', async (req, res) => {

  try {

    const { userId } = req.params;

    const { status, reason } = req.body;

    const adminId = req.user?.id;

    if (!adminId) {

      return res.status(401).json({ success: false, error: 'Unauthorized' });

    }

    const result = await updateUserStatus(userId, status, adminId, reason);

    if (result.success) {

      res.json(result);

    } else {

      res.status(400).json(result);

    }

  } catch (error) {

    res.status(500).json({ success: false, error: 'Internal server error' });

  }

});



router.patch('/users/:userId/balance', async (req, res) => {

  try {

    const { userId } = req.params;

    const { amount, reason, type } = req.body;

    const adminId = req.user?.id;

    if (!adminId) {

      return res.status(401).json({ success: false, error: 'Unauthorized' });

    }

    const result = await updateUserBalance(userId, amount, adminId, reason, type);

    if (result.success) {

      res.json(result);

    }

    else {

      res.status(400).json(result);

    }

  } catch (error) {

    res.status(500).json({ success: false, error: 'Internal server error' });

  }

});



// Payment request routes

router.get('/payment-requests/pending', getPendingPaymentRequests);

router.patch('/payment-requests/:requestId/approve', approvePaymentRequest);

router.patch('/payment-requests/:requestId/reject', rejectPaymentRequest);



export default router;


