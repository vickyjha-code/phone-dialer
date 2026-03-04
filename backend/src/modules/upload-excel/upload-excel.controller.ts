import ExcelJS from 'exceljs';
import { ExcelUpload, IContact } from '../common/schema/excelUpload.schema';
import { createError } from '../common/middleware/errorHandler';
import { Types } from 'mongoose';

type StringContactField = Exclude<keyof IContact, 'rowIndex'>;

const COLUMN_MAP: Record<string, StringContactField> = {
  company: 'company',
  'company name': 'company',
  name: 'name',
  'full name': 'name',
  designation: 'designation',
  title: 'designation',
  'job title': 'designation',
  number: 'number',
  phone: 'number',
  'phone number': 'number',
  mobile: 'number',
  'mobile number': 'number',
  contact: 'number',
  'contact no': 'number',
  'contact no.': 'number',
  'contact num': 'number',
  'contact number': 'number',
  email: 'email',
  'email id': 'email',
  'email address': 'email',
  location: 'location',
  city: 'location',
  address: 'location',
  linkedin: 'linkedin',
  'linkedin url': 'linkedin',
  'linkedin profile': 'linkedin',
  industry: 'industry',
  'industry type': 'industry',
  'employee size': 'employeeSize',
  employees: 'employeeSize',
  'company size': 'employeeSize',
};

function normalizeHeader(header: unknown): StringContactField | null {
  if (header === null || header === undefined) return null;
  const key = String(header).toLowerCase().trim();
  return COLUMN_MAP[key] ?? null;
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') {
    // CellHyperlinkValue: { text, hyperlink }
    if ('hyperlink' in value) return String((value as ExcelJS.CellHyperlinkValue).text ?? '').trim();
    // CellRichTextValue: { richText: RichText[] }
    if ('richText' in value) return (value as ExcelJS.CellRichTextValue).richText.map((r) => r.text ?? '').join('').trim();
    // CellFormulaValue: { formula, result }
    if ('result' in value) return cellToString((value as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
    // CellErrorValue or unknown object
    if ('error' in value) return '';
  }
  return String(value).trim();
}

async function parseExcelBuffer(buffer: Buffer): Promise<IContact[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw createError('Excel file is empty or has no sheets', 400);
  }

  const headerRow = worksheet.getRow(1);
  if (!headerRow.hasValues) {
    throw createError('Excel file has no header row', 400);
  }

  const headerMapping: Record<number, StringContactField> = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const mapped = normalizeHeader(cell.value);
    if (mapped) headerMapping[colNumber] = mapped;
  });

  const records: IContact[] = [];
  let rowIndex = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const contact: IContact = {
      rowIndex,
      company: '',
      name: '',
      designation: '',
      number: '',
      email: '',
      location: '',
      linkedin: '',
      industry: '',
      employeeSize: '',
    };

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = headerMapping[colNumber];
      if (field) (contact as Record<StringContactField, string>)[field] = cellToString(cell.value);
    });

    records.push(contact);
    rowIndex++;
  });

  if (records.length === 0) {
    throw createError('Excel file has no data rows', 400);
  }

  return records;
}

export async function uploadExcel(buffer: Buffer, originalName: string) {
  const records = await parseExcelBuffer(buffer);

  const fileName = `${Date.now()}-${originalName.replace(/\s+/g, '_')}`;

  const excelDoc = await ExcelUpload.create({
    fileName,
    originalName,
    recordCount: records.length,
    records,
  });

  return {
    id: excelDoc._id,
    fileName,
    originalName,
    recordCount: records.length,
    uploadDate: excelDoc.uploadDate,
  };
}

export async function getExcelList() {
  const list = await ExcelUpload.find({}, 'originalName fileName uploadDate recordCount').sort({
    uploadDate: -1,
  });

  return list.map((doc) => ({
    id: doc._id,
    originalName: doc.originalName,
    fileName: doc.fileName,
    uploadDate: doc.uploadDate,
    recordCount: doc.recordCount,
  }));
}

export async function getExcelContacts(excelId: string) {
  if (!Types.ObjectId.isValid(excelId)) {
    throw createError('Invalid Excel ID', 400);
  }

  const excelDoc = await ExcelUpload.findById(excelId);

  if (!excelDoc) {
    throw createError('Excel file not found', 404);
  }

  return {
    id: excelDoc._id,
    originalName: excelDoc.originalName,
    uploadDate: excelDoc.uploadDate,
    recordCount: excelDoc.recordCount,
    records: excelDoc.records,
  };
}

export async function generateTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contacts');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Designation', key: 'designation', width: 22 },
    { header: 'Phone Number', key: 'number', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Location', key: 'location', width: 18 },
    { header: 'LinkedIn', key: 'linkedin', width: 35 },
    { header: 'Industry', key: 'industry', width: 22 },
    { header: 'Employee Size', key: 'employeeSize', width: 16 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF1D4ED8' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0EAFF' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 20;

  sheet.addRow({
    name: 'John Doe',
    company: 'Acme Corp',
    designation: 'CTO',
    number: '9876543210',
    email: 'john@acme.com',
    location: 'Mumbai',
    linkedin: 'linkedin.com/in/johndoe',
    industry: 'Technology',
    employeeSize: '50-200',
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function deleteExcel(excelId: string) {
  if (!Types.ObjectId.isValid(excelId)) {
    throw createError('Invalid Excel ID', 400);
  }

  const excelDoc = await ExcelUpload.findByIdAndDelete(excelId);

  if (!excelDoc) {
    throw createError('Excel file not found', 404);
  }
}
