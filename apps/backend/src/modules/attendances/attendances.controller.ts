import type { ListAttendancesQuery } from '@smartschool/shared';
import type { Request, Response } from 'express';
import type { Actor } from '../users/users.service';
import { attendancesService } from './attendances.service';

function actorFrom(req: Request): Actor {
  return { id: req.user!.id, role: req.user!.role, schoolId: req.user!.schoolId };
}

export const attendancesController = {
  async summary(req: Request, res: Response) {
    const r = await attendancesService.summary(req.query as any, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async list(req: Request, res: Response) {
    const r = await attendancesService.list(req.query as any, actorFrom(req));
    res.status(200).json({
      success: true,
      data: r.items,
      meta: { total: r.total, page: r.page, limit: r.limit, totalPages: r.totalPages },
    });
  },
  async getById(req: Request, res: Response) {
    const r = await attendancesService.getById(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async create(req: Request, res: Response) {
    const r = await attendancesService.create(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async createBulk(req: Request, res: Response) {
    const r = await attendancesService.createBulk(req.body, actorFrom(req));
    res.status(201).json({ success: true, data: r });
  },
  async update(req: Request, res: Response) {
    const r = await attendancesService.update(req.params.id as string, req.body, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
  async remove(req: Request, res: Response) {
    const r = await attendancesService.remove(req.params.id as string, actorFrom(req));
    res.status(200).json({ success: true, data: r });
  },
};
