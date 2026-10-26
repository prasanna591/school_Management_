import {
  Permission,
  attendanceSummaryQuerySchema,
  bulkAttendanceSchema,
  createAttendanceSchema,
  idSchema,
  listAttendancesQuerySchema,
  updateAttendanceSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { attendancesController } from './attendances.controller';

const idParamSchema = z.object({ id: idSchema });
export const attendancesRouter = Router();
attendancesRouter.use(authenticate);
attendancesRouter.get(
  '/',
  requirePermission(Permission.ATTENDANCE_READ),
  validate(listAttendancesQuerySchema, 'query'),
  asyncHandler(attendancesController.list),
);
attendancesRouter.get(
  '/summary',
  requirePermission(Permission.ATTENDANCE_READ),
  validate(attendanceSummaryQuerySchema, 'query'),
  asyncHandler(attendancesController.summary),
);
attendancesRouter.get(
  '/:id',
  requirePermission(Permission.ATTENDANCE_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(attendancesController.getById),
);
attendancesRouter.post(
  '/bulk',
  requirePermission(Permission.ATTENDANCE_MARK),
  validate(bulkAttendanceSchema),
  asyncHandler(attendancesController.createBulk),
);
attendancesRouter.post(
  '/',
  requirePermission(Permission.ATTENDANCE_MARK),
  validate(createAttendanceSchema),
  asyncHandler(attendancesController.create),
);
attendancesRouter.patch(
  '/:id',
  requirePermission(Permission.ATTENDANCE_MANAGE),
  validate(idParamSchema, 'params'),
  validate(updateAttendanceSchema),
  asyncHandler(attendancesController.update),
);
attendancesRouter.delete(
  '/:id',
  requirePermission(Permission.ATTENDANCE_MANAGE),
  validate(idParamSchema, 'params'),
  asyncHandler(attendancesController.remove),
);
