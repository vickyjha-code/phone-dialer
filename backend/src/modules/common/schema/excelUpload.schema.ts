import mongoose, { Document, Schema } from 'mongoose';

export interface IContact {
  rowIndex: number;
  company: string;
  name: string;
  designation: string;
  number: string;
  email: string;
  location: string;
  linkedin: string;
  industry: string;
  employeeSize: string;
}

export interface IExcelUpload extends Document {
  fileName: string;
  originalName: string;
  uploadDate: Date;
  recordCount: number;
  records: IContact[];
}

const ContactSchema = new Schema<IContact>(
  {
    rowIndex: { type: Number, required: true },
    company: { type: String, default: '' },
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    number: { type: String, default: '' },
    email: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    industry: { type: String, default: '' },
    employeeSize: { type: String, default: '' },
  },
  { _id: false }
);

const ExcelUploadSchema = new Schema<IExcelUpload>(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    recordCount: { type: Number, required: true },
    records: { type: [ContactSchema], required: true },
  },
  { timestamps: true }
);

export const ExcelUpload = mongoose.model<IExcelUpload>('ExcelUpload', ExcelUploadSchema);
