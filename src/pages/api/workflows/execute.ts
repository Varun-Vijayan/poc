import { NextApiRequest, NextApiResponse } from 'next';
import { temporalClient } from '../../../temporal/client';
import { WorkflowSpecSchema } from '../../../types/workflow';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workflowId, spec } = req.body;
    
    if (!workflowId || !spec) {
      return res.status(400).json({ error: 'workflowId and spec are required' });
    }

    // Validate the spec
    const validationResult = WorkflowSpecSchema.safeParse(spec);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid workflow specification',
        details: validationResult.error.errors
      });
    }

    // Start the Distributed Temporal workflow
    const temporalWorkflowId = await temporalClient.startDistributedWorkflow({
      workflowId,
      spec: validationResult.data
    });

    res.status(200).json({
      workflowId: temporalWorkflowId,
      message: 'Distributed workflow execution started successfully'
    });

  } catch (error: any) {
    console.error('Error starting workflow execution:', error);
    
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ 
        error: 'Workflow with this ID is already running',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to start workflow execution',
      details: error.message
    });
  }
} 