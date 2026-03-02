import { Request, Response, NextFunction } from 'express';
import { uploadExcel, getExcelList, getExcelContacts, deleteExcel } from './upload-excel.controller';
import { createError } from '../common/middleware/errorHandler';

export async function handleUploadExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const result = await uploadExcel(req.file.buffer, req.file.originalname);

    res.status(201).json({
      success: true,
      message: `Excel uploaded successfully. ${result.recordCount} contacts imported.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetExcelList(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const list = await getExcelList();

    res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetExcelContacts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    const data = await getExcelContacts(id);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);
    await deleteExcel(id);

    res.json({
      success: true,
      message: 'Excel file deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}
