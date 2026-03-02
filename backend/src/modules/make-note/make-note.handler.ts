import { Request, Response, NextFunction } from 'express';
import { upsertNote, getNotesByExcel, deleteNote } from './make-note.controller';
import { createError } from '../common/middleware/errorHandler';

export async function handleUpsertNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { excelId, rowIndex, note } = req.body as {
      excelId?: string;
      rowIndex?: unknown;
      note?: string;
    };

    if (!excelId) {
      throw createError('excelId is required', 400);
    }

    if (rowIndex === undefined || rowIndex === null) {
      throw createError('rowIndex is required', 400);
    }

    const parsedRowIndex = Number(rowIndex);
    if (isNaN(parsedRowIndex)) {
      throw createError('rowIndex must be a number', 400);
    }

    if (!note) {
      throw createError('note is required', 400);
    }

    const result = await upsertNote(excelId, parsedRowIndex, note);

    res.status(200).json({
      success: true,
      message: 'Note saved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetNotesByExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const excelId = String(req.params.excelId);
    const notesMap = await getNotesByExcel(excelId);

    res.json({
      success: true,
      data: notesMap,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    await deleteNote(id);

    res.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
