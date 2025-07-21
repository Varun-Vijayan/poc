import { NextApiRequest, NextApiResponse } from 'next';
import { temporalClient } from '../../../../temporal/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workflowId } = req.query;
    
    if (!workflowId || typeof workflowId !== 'string') {
      return res.status(400).json({ error: 'Valid workflowId is required' });
    }

    const status = await temporalClient.getWorkflowStatus(workflowId);
    
    res.status(200).json(status);

  } catch (error: any) {
    console.error(`Error getting workflow status for ${req.query.workflowId}:`, error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({ 
        error: 'Workflow not found',
        workflowId: req.query.workflowId
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to get workflow status',
      details: error.message
    });
  }
} 