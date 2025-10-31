/**
 * Story 4.0c: Validation API Routes
 * Express routes for validation service
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '../../generated/client';
import { DataValidationService } from './DataValidationService';

const router = Router();
const prisma = new PrismaClient();
const validationService = new DataValidationService(prisma);

/**
 * POST /api/validation/validate
 * Validate market data
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { data, options } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'data must be an array',
      });
    }

    const result = await validationService.validateMarketData(data, options);

    res.json({
      valid: result.isValid(),
      score: result.calculateScore(),
      summary: result.getSummary(),
      violations: result.getViolations(),
    });
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/validation/metrics
 * Get validation metrics for dashboard
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const metrics = await validationService.getValidationMetrics(days);

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/validation/quarantine
 * Get quarantined data for review
 */
router.get('/quarantine', async (req: Request, res: Response) => {
  try {
    const reviewed = req.query.reviewed === 'true';
    const quarantined = await validationService.getQuarantinedData(reviewed);

    res.json(quarantined);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch quarantined data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/validation/quarantine/:id/review
 * Review and take action on quarantined data
 */
router.post('/quarantine/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, reviewedBy } = req.body;

    if (!action || !['approved', 'rejected', 'modified'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'action must be one of: approved, rejected, modified',
      });
    }

    if (!reviewedBy) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'reviewedBy is required',
      });
    }

    const updated = await validationService.reviewQuarantinedData(id, action, reviewedBy);

    res.json(updated);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to review data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/validation/rules
 * Get all validation rules
 */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const rules = await prisma.validationRule.findMany({
      orderBy: {
        category: 'asc',
      },
    });

    res.json(rules);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch rules',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/validation/rules
 * Create a new validation rule
 */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const { name, category, severity, enabled, config, description } = req.body;

    if (!name || !category || !severity || !config) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'name, category, severity, and config are required',
      });
    }

    const rule = await prisma.validationRule.create({
      data: {
        name,
        category,
        severity,
        enabled: enabled !== undefined ? enabled : true,
        config,
        description,
      },
    });

    res.json(rule);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create rule',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * PUT /api/validation/rules/:id
 * Update a validation rule
 */
router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, severity, enabled, config, description } = req.body;

    const rule = await prisma.validationRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(severity && { severity }),
        ...(enabled !== undefined && { enabled }),
        ...(config && { config }),
        ...(description !== undefined && { description }),
      },
    });

    res.json(rule);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update rule',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/validation/rules/:id
 * Delete a validation rule
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.validationRule.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete rule',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
