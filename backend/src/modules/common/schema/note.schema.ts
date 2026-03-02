import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INote extends Document {
  excelId: Types.ObjectId;
  rowIndex: number;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    excelId: {
      type: Schema.Types.ObjectId,
      ref: 'ExcelUpload',
      required: true,
    },
    rowIndex: { type: Number, required: true },
    note: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

NoteSchema.index({ excelId: 1, rowIndex: 1 }, { unique: true });

export const Note = mongoose.model<INote>('Note', NoteSchema);
