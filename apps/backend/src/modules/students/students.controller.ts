import type { ListStudentsQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { studentsService } from './students.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const studentsController = {
  async me(req: Request, res: Response) {
    const r = await studentsService.me(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async meAttendance(req: Request, res: Response) {
    const r = await studentsService.meAttendance(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async meHomework(req: Request, res: Response) {
    const r = await studentsService.meHomework(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async meTimetable(req: Request, res: Response) {
    const r = await studentsService.meTimetable(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async meResults(req: Request, res: Response) {
    const r = await studentsService.meResults(actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async list(req: Request, res: Response) {
    const result = await studentsService.list(
      req.query as unknown as ListStudentsQuery,
      actorFrom(req),
    );
    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  },
  async getById(req: Request, res: Response) {
    const result = await studentsService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
  async create(req: Request, res: Response) {
    const result = await studentsService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: result });
  },
  async update(req: Request, res: Response) {
    const result = await studentsService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
  async updatePhoto(req: Request, res: Response) {
    const { photoUrl } = req.body as { photoUrl: string | null };
    const result = await studentsService.updatePhoto(
      req.params.id as string,
      photoUrl,
      actorFrom(req),
    );
    res.status(200).json({ success: true, data: result });
  },
  async remove(req: Request, res: Response) {
    const result = await studentsService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: result });
  },
};
