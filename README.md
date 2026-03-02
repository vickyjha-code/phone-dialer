# Phone Dialer

A mobile-first web app to upload Excel contact lists, browse contacts, tap-to-call, and add call notes — all stored in MongoDB.

---

## Features

- Upload `.xlsx`, `.xls`, or `.csv` contact files
- Select from previously uploaded files via dropdown
- Search contacts by name, company, designation, number, or industry
- Filter contacts — **All / With Note / No Note**
- Tap any phone number to dial directly from mobile
- Multiple numbers per contact (separated by `/`) shown as individual call buttons
- **Call in sequence** — dials numbers one after the other with a between-call prompt
- LinkedIn URL normalisation — handles missing `https://`, country subdomains (`in.linkedin.com`), blank cells, and `NF` values
- Add / edit / delete call notes per contact, stored in MongoDB
- Notes persist across sessions and are visible inline on contact cards

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js · TypeScript · Express 5 |
| Database | MongoDB (Mongoose 9) |
| File parsing | ExcelJS |
| File upload | Multer (in-memory) |
| Frontend | Plain HTML · CSS · Vanilla JS |

---

## Project Structure

```
phone-dialer/
├── backend/
│   ├── src/
│   │   ├── server.ts                        # Express entry point
│   │   └── modules/
│   │       ├── common/
│   │       │   ├── db/connection.ts         # MongoDB connection
│   │       │   ├── middleware/
│   │       │   │   ├── errorHandler.ts      # Global error handler
│   │       │   │   └── upload.ts            # Multer config
│   │       │   └── schema/
│   │       │       ├── excelUpload.schema.ts
│   │       │       └── note.schema.ts
│   │       ├── upload-excel/
│   │       │   ├── upload-excel.routes.ts
│   │       │   ├── upload-excel.handler.ts
│   │       │   └── upload-excel.controller.ts
│   │       └── make-note/
│   │           ├── make-note.routes.ts
│   │           ├── make-note.handler.ts
│   │           └── make-note.controller.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## Setup

### 1. Clone and install

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/phone-dialer
```

### 3. Run (development)

```bash
npm run dev
```

Server starts at `http://localhost:3000` and serves the frontend as static files.

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/excel/upload` | Upload Excel file (multipart, field: `file`) |
| `GET` | `/api/excel/list` | List all uploaded files |
| `GET` | `/api/excel/:id/contacts` | Get all contacts for a file |
| `DELETE` | `/api/excel/:id` | Delete a file and its contacts |
| `POST` | `/api/notes` | Create or update a note (`excelId`, `rowIndex`, `note`) |
| `GET` | `/api/notes/excel/:excelId` | Get all notes for a file (keyed by `rowIndex`) |
| `DELETE` | `/api/notes/:id` | Delete a note |

---

## Excel Column Mapping

The parser recognises these column headers (case-insensitive):

| Field | Accepted headers |
|-------|-----------------|
| Company | `company`, `company name` |
| Name | `name`, `full name` |
| Designation | `designation`, `title`, `job title` |
| Phone | `number`, `phone`, `phone number`, `mobile`, `mobile number`, `contact`, `contact no`, `contact no.`, `contact num`, `contact number` |
| Email | `email`, `email id`, `email address` |
| Location | `location`, `city`, `address` |
| LinkedIn | `linkedin`, `linkedin url`, `linkedin profile` |
| Industry | `industry`, `industry type` |
| Employee Size | `employee size`, `employees`, `company size` |

Multiple phone numbers or emails in a single cell should be separated by `/`.

---

## Mobile Usage

1. Make sure your Mac and phone are on the **same Wi-Fi network**
2. Find your Mac's local IP: `ipconfig getifaddr en0`
3. Open `http://<mac-ip>:3000` in your phone's browser
