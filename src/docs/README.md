# OFFICE OF THE PRESIDENT - REPARATIONS
## Enterprise File Management System

### Technical Specification & Implementation Guide

---

## 🏗️ Architecture Overview

This application is a comprehensive enterprise-grade file management system built with modern web technologies. It provides secure document, media, and research file management with robust authentication, role-based access control, and a complete approval workflow.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS 4 |
| **State Management** | Zustand with persist middleware |
| **Routing** | React Router v6 |
| **Icons** | Lucide React |
| **Date Handling** | date-fns |
| **Build Tool** | Vite 7 |

### Production Stack (Next.js Implementation)

For production deployment, we recommend:

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14+ (App Router) |
| **Database** | PostgreSQL with Prisma ORM |
| **Authentication** | JWT with httpOnly cookies |
| **File Storage** | Local disk storage (`./uploads/`) |
| **Password Hashing** | bcrypt (12 rounds) |

---

## 🔐 Authentication & Authorization

### JWT Token Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User Login                                              │
│     └─> Validate credentials                                │
│         └─> Generate Access Token (15 min)                  │
│             └─> Generate Refresh Token (7 days)             │
│                 └─> Store in httpOnly cookies               │
│                                                             │
│  2. API Request                                             │
│     └─> Extract token from cookie                           │
│         └─> Verify JWT signature                            │
│             └─> Check user approval status                  │
│                 └─> Process request                         │
│                                                             │
│  3. Token Refresh                                           │
│     └─> Use refresh token before expiry                     │
│         └─> Issue new access token                          │
│             └─> Rotate refresh token                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, approvals, all files |
| **Manager** | Team file management, folder creation, activity viewing |
| **Staff** | Upload/manage own files, view shared content |
| **Guest** | View shared files only, no upload permissions |

### User Approval Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Register │ ──> │ Pending  │ ──> │ Approved │
└──────────┘     └──────────┘     └──────────┘
                      │
                      v
                ┌──────────┐
                │ Rejected │
                └──────────┘
```

**Bootstrap Logic:**
- First user registered → `role: admin`, `approved: true`
- Subsequent users → `role: staff`, `approved: false`

---

## 📁 Application Routes

### Public Routes
| Route | Purpose |
|-------|---------|
| `/login` | User authentication with rate limiting |
| `/register` | New user registration with password validation |
| `/pending-approval` | Holding page for unapproved users |
| `/share/:token` | Public file viewing with optional password |

### Protected Routes
| Route | Purpose | Access |
|-------|---------|--------|
| `/dashboard` | Main file browser, folder navigation | All approved users |
| `/upload` | Drag-drop file upload with tagging | Staff+ |
| `/file/:id` | File preview, versions, sharing | File owner/shared |
| `/trash` | Deleted file recovery | All approved users |
| `/search` | Global search with filters | All approved users |
| `/starred` | Quick access to starred files | All approved users |
| `/activity` | Audit trail viewer | All approved users |
| `/settings` | Profile and preferences | All approved users |
| `/admin` | User management, stats | Admin only |

---

## 💾 Database Schema

See `PRISMA_SCHEMA.md` for the complete Prisma schema including:
- User management with approval workflow
- File versioning system
- Folder hierarchy (self-referential)
- Tag system with many-to-many relations
- Share links with password protection
- Activity logging for audit trails

---

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting
- Login: 10 attempts per 15 minutes
- Registration: 5 attempts per 5 minutes
- API requests: Configurable per endpoint

### File Security
- Files stored outside web root
- Access control per file/folder
- Checksum verification for uploads
- Soft delete with 30-day retention

---

## 📂 File Storage Architecture

```
uploads/
├── {userId}/
│   ├── {fileId}.{ext}           # Current version
│   └── versions/
│       ├── {fileId}_v1.{ext}
│       ├── {fileId}_v2.{ext}
│       └── ...
└── temp/
    └── {uploadId}/              # Chunked uploads
```

### Supported File Types
- Documents: PDF, DOCX, DOC, TXT, RTF, ODT
- Spreadsheets: XLSX, XLS, CSV, ODS
- Images: JPG, PNG, GIF, SVG, WEBP
- Video: MP4, MOV, AVI, MKV, WEBM
- Audio: MP3, WAV, OGG, FLAC
- Archives: ZIP, RAR, 7Z, TAR.GZ

---

## 🎨 UI Components

### Core Components
- `Button` - Primary, secondary, outline, ghost, danger variants
- `Input` - With icons, error states, labels
- `Card` - With header, content, footer sections
- `Modal` - With backdrop, close button, sizes
- `Badge` - For status, tags, counts

### Layout Components
- `MainLayout` - Protected wrapper with sidebar
- `Sidebar` - Navigation with folder tree
- `Header` - Search, notifications, user menu

---

## 📊 Activity Logging

All significant actions are logged:
- File operations (upload, download, delete, share)
- Folder operations (create, rename, delete)
- User actions (login, logout, register)
- Admin actions (approve, reject, role change)

Logs include:
- Timestamp
- User ID & name
- Action type
- Resource details
- IP address
- User agent

---

## 🚀 Deployment Notes

### Environment Variables
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-256-bit-secret"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=104857600  # 100MB
RATE_LIMIT_WINDOW=900000 # 15 minutes
```

### Database Setup
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

---

## 📱 Mobile Considerations

For Flutter mobile app integration:
- API is REST-based with JSON responses
- JWT tokens work with mobile secure storage
- File uploads support chunked transfer
- Responsive web UI for tablet preview

---

## 🔄 Future Enhancements

- [ ] Real-time collaboration (WebSockets)
- [ ] OCR for document search
- [ ] AI-powered auto-tagging
- [ ] Advanced analytics dashboard
- [ ] Two-factor authentication
- [ ] SSO integration (SAML/OAuth)
- [ ] Cloud storage migration path
- [ ] Full-text search (Elasticsearch)
