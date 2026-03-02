import { Note } from '../common/schema/note.schema';
import { ExcelUpload } from '../common/schema/excelUpload.schema';
import { createError } from '../common/middleware/errorHandler';
import { Types } from 'mongoose';

export async function upsertNote(excelId: string, rowIndex: number, noteText: string) {
  if (!Types.ObjectId.isValid(excelId)) {
    throw createError('Invalid Excel ID', 400);
  }

  if (typeof rowIndex !== 'number' || rowIndex < 0) {
    throw createError('Invalid row index', 400);
  }

  if (!noteText || noteText.trim().length === 0) {
    throw createError('Note text cannot be empty', 400);
  }

  const excelExists = await ExcelUpload.exists({ _id: excelId });
  if (!excelExists) {
    throw createError('Excel file not found', 404);
  }

  const note = await Note.findOneAndUpdate(
    { excelId: new Types.ObjectId(excelId), rowIndex },
    { note: noteText.trim() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return note;
}

export async function getNotesByExcel(excelId: string) {
  if (!Types.ObjectId.isValid(excelId)) {
    throw createError('Invalid Excel ID', 400);
  }

  const notes = await Note.find({ excelId: new Types.ObjectId(excelId) }).sort({ rowIndex: 1 });

  const notesMap: Record<number, { id: string; note: string; updatedAt: Date }> = {};
  for (const n of notes) {
    notesMap[n.rowIndex] = {
      id: (n._id as Types.ObjectId).toString(),
      note: n.note,
      updatedAt: n.updatedAt,
    };
  }

  return notesMap;
}

export async function deleteNote(noteId: string) {
  if (!Types.ObjectId.isValid(noteId)) {
    throw createError('Invalid note ID', 400);
  }

  const note = await Note.findByIdAndDelete(noteId);

  if (!note) {
    throw createError('Note not found', 404);
  }
}
