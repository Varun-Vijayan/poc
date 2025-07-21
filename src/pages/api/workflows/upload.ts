import { NextApiRequest, NextApiResponse } from 'next';
import { WorkflowSpecSchema } from '../../../types/workflow';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { spec } = req.body;
    
    if (!spec) {
      return res.status(400).json({ error: 'Workflow specification is required' });
    }

    // Validate the spec against our schema
    const validationResult = WorkflowSpecSchema.safeParse(spec);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid workflow specification',
        details: validationResult.error.errors
      });
    }

    const validatedSpec = validationResult.data;
    
    // Additional validation: check for circular dependencies
    const stageIds = new Set(validatedSpec.stages.map(stage => stage.id));
    for (const stage of validatedSpec.stages) {
      if (stage.dependsOn) {
        for (const depId of stage.dependsOn) {
          if (!stageIds.has(depId)) {
            return res.status(400).json({
              error: `Stage ${stage.id} depends on non-existent stage: ${depId}`
            });
          }
        }
      }
    }

    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function hasCycle(stageId: string): boolean {
      if (recursionStack.has(stageId)) return true;
      if (visited.has(stageId)) return false;
      
      visited.add(stageId);
      recursionStack.add(stageId);
      
      const stage = validatedSpec.stages.find(s => s.id === stageId);
      if (stage?.dependsOn) {
        for (const depId of stage.dependsOn) {
          if (hasCycle(depId)) return true;
        }
      }
      
      recursionStack.delete(stageId);
      return false;
    }
    
    for (const stage of validatedSpec.stages) {
      if (hasCycle(stage.id)) {
        return res.status(400).json({
          error: 'Circular dependency detected in workflow specification'
        });
      }
    }

    // Generate a unique workflow ID
    const workflowId = uuidv4();

    // In a real application, you might store this in a database
    // For now, we'll just return the validated spec with an ID
    
    res.status(200).json({
      workflowId,
      spec: validatedSpec,
      message: 'Workflow specification uploaded and validated successfully'
    });

  } catch (error: any) {
    console.error('Error processing workflow upload:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 