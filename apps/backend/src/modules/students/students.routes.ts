import {
  Permission,
  Role,
  createStudentSchema,
  idSchema,
  listStudentsQuerySchema,
  updateStudentPhotoSchema,
  updateStudentSchema,
} from '@smartschool/shared';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authorize, requirePermission } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { studentsController } from './students.controller';

const idParamSchema = z.object({ id: idSchema });
export const studentsRouter = Router();

studentsRouter.use(authenticate);

// The signed-in student's own profile and self-service data, declared before
// "/:id" so "me" is never parsed as a student id.
studentsRouter.get(
  '/me',
  authorize(Role.STUDENT),
  asyncHandler(studentsController.me),
);
studentsRouter.get(
  '/me/attendance',
  authorize(Role.STUDENT),
  asyncHandler(studentsController.meAttendance),
);
studentsRouter.get(
  '/me/homework',
  authorize(Role.STUDENT),
  asyncHandler(studentsController.meHomework),
);
studentsRouter.get(
  '/me/timetable',
  authorize(Role.STUDENT),
  asyncHandler(studentsController.meTimetable),
);
studentsRouter.get(
  '/me/results',
  authorize(Role.STUDENT),
  asyncHandler(studentsController.meResults),
);

studentsRouter.get(
  '/',
  requirePermission(Permission.STUDENT_READ),
  validate(listStudentsQuerySchema, 'query'),
  asyncHandler(studentsController.list),
);
studentsRouter.get(
  '/:id',
  requirePermission(Permission.STUDENT_READ),
  validate(idParamSchema, 'params'),
  asyncHandler(studentsController.getById),
);
studentsRouter.post(
  '/',
  requirePermission(Permission.STUDENT_CREATE),
  validate(createStudentSchema),
  asyncHandler(studentsController.create),
);
studentsRouter.patch(
  '/:id',
  requirePermission(Permission.STUDENT_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateStudentSchema),
  asyncHandler(studentsController.update),
);
studentsRouter.patch(
  '/:id/photo',
  requirePermission(Permission.STUDENT_UPDATE),
  validate(idParamSchema, 'params'),
  validate(updateStudentPhotoSchema),
  asyncHandler(studentsController.updatePhoto),
);
studentsRouter.delete(
  '/:id',
  requirePermission(Permission.STUDENT_DELETE),
  validate(idParamSchema, 'params'),
  asyncHandler(studentsController.remove),
);
