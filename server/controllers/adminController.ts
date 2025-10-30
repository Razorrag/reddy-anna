
import * as adminQueries from '../db/queries/adminQueries';
import { Request, Response } from 'express';

export const getPendingPaymentRequests = async (req: Request, res: Response) => {
  try {
    const requests = await adminQueries.getPendingPaymentRequests();
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const approvePaymentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const result = await adminQueries.approvePaymentRequest(requestId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const rejectPaymentRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const result = await adminQueries.rejectPaymentRequest(requestId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
