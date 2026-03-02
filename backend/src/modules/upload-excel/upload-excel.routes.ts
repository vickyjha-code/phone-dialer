import { Router } from 'express';
import { uploadMiddleware } from '../common/middleware/upload';
import {
  handleUploadExcel,
  handleGetExcelList,
  handleGetExcelContacts,
  handleDeleteExcel,
} from './upload-excel.handler';

const router = Router();

router.post('/upload', uploadMiddleware, handleUploadExcel);
router.get('/list', handleGetExcelList);
router.get('/:id/contacts', handleGetExcelContacts);
router.delete('/:id', handleDeleteExcel);

export default router;
