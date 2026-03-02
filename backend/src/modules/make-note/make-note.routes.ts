import { Router } from 'express';
import {
  handleUpsertNote,
  handleGetNotesByExcel,
  handleDeleteNote,
} from './make-note.handler';

const router = Router();

router.post('/', handleUpsertNote);
router.get('/excel/:excelId', handleGetNotesByExcel);
router.delete('/:id', handleDeleteNote);

export default router;
