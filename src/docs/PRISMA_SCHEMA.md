# Database Schema (Prisma ORM)

This document contains the complete Prisma schema for the OFFICE OF THE PRESIDENT - REPARATIONS file management system.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

enum UserRole {
  admin
  manager
  staff
  guest
}

enum ApprovalStatus {
  pending
  approved
  rejected
}

model User {
  id             String         @id @default(uuid())
  email          String         @unique
  name           String
  password       String         // bcrypt hashed
  role           UserRole       @default(staff)
  approved       Boolean        @default(false)
  approvalStatus ApprovalStatus @default(pending)
  avatar         String?
  lastLoginAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // Relations
  files          File[]         @relation("FileUploader")
  folders        Folder[]       @relation("FolderOwner")
  activities     ActivityLog[]  @relation("ActivityUser")
  shares         ShareLink[]    @relation("ShareCreator")
  approvedBy     User?          @relation("UserApprover", fields: [approvedById], references: [id])
  approvedById   String?
  approvedUsers  User[]         @relation("UserApprover")
  sessions       Session[]

  @@index([email])
  @@index([role])
  @@index([approvalStatus])
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}

// ============================================================================
// FILE MANAGEMENT
// ============================================================================

model File {
  id           String        @id @default(uuid())
  name         String
  originalName String
  mimeType     String
  size         BigInt
  path         String        // Local storage path: uploads/{userId}/{folderId}/{fileId}
  checksum     String?       // MD5/SHA256 for deduplication
  starred      Boolean       @default(false)
  isPublic     Boolean       @default(false)
  
  // Soft delete
  deletedAt    DateTime?
  
  // Relations
  folderId     String?
  folder       Folder?       @relation(fields: [folderId], references: [id], onDelete: SetNull)
  uploaderId   String
  uploader     User          @relation("FileUploader", fields: [uploaderId], references: [id])
  versions     FileVersion[]
  tags         FileTag[]
  shares       ShareLink[]
  activities   ActivityLog[] @relation("FileActivity")
  
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([name])
  @@index([mimeType])
  @@index([uploaderId])
  @@index([folderId])
  @@index([starred])
  @@index([deletedAt])
  @@index([createdAt])
}

model FileVersion {
  id        String   @id @default(uuid())
  fileId    String
  file      File     @relation(fields: [fileId], references: [id], onDelete: Cascade)
  version   Int
  size      BigInt
  path      String
  comment   String?
  
  uploaderId String
  createdAt DateTime @default(now())

  @@unique([fileId, version])
  @@index([fileId])
}

model Folder {
  id        String   @id @default(uuid())
  name      String
  path      String   // Full path: /root/folder1/subfolder
  color     String?
  icon      String?
  
  // Self-relation for hierarchy
  parentId  String?
  parent    Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children  Folder[] @relation("FolderHierarchy")
  
  // Owner
  ownerId   String
  owner     User     @relation("FolderOwner", fields: [ownerId], references: [id])
  
  // Files in folder
  files     File[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([parentId, name, ownerId])
  @@index([ownerId])
  @@index([parentId])
  @@index([path])
}

// ============================================================================
// TAGGING SYSTEM
// ============================================================================

model Tag {
  id        String    @id @default(uuid())
  name      String    @unique
  color     String    @default("#6366f1")
  files     FileTag[]
  createdAt DateTime  @default(now())

  @@index([name])
}

model FileTag {
  id      String @id @default(uuid())
  fileId  String
  file    File   @relation(fields: [fileId], references: [id], onDelete: Cascade)
  tagId   String
  tag     Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([fileId, tagId])
  @@index([fileId])
  @@index([tagId])
}

// ============================================================================
// SHARING
// ============================================================================

model ShareLink {
  id          String    @id @default(uuid())
  fileId      String
  file        File      @relation(fields: [fileId], references: [id], onDelete: Cascade)
  token       String    @unique @default(uuid())
  password    String?   // bcrypt hashed, optional password protection
  expiresAt   DateTime?
  maxAccess   Int?      // Maximum number of accesses
  accessCount Int       @default(0)
  
  createdById String
  createdBy   User      @relation("ShareCreator", fields: [createdById], references: [id])
  
  createdAt   DateTime  @default(now())

  @@index([token])
  @@index([fileId])
  @@index([expiresAt])
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

enum ActivityAction {
  upload
  download
  view
  edit
  delete
  restore
  share
  unshare
  move
  rename
  star
  unstar
  tag
  untag
  create_folder
  delete_folder
  login
  logout
  register
  approve_user
  reject_user
  update_role
  password_change
}

enum ResourceType {
  file
  folder
  user
  share
  system
}

model ActivityLog {
  id           String         @id @default(uuid())
  userId       String
  user         User           @relation("ActivityUser", fields: [userId], references: [id])
  action       ActivityAction
  resourceType ResourceType
  resourceId   String
  resourceName String
  metadata     Json?
  ipAddress    String?
  userAgent    String?
  
  fileId       String?
  file         File?          @relation("FileActivity", fields: [fileId], references: [id], onDelete: SetNull)
  
  createdAt    DateTime       @default(now())

  @@index([userId])
  @@index([action])
  @@index([resourceType])
  @@index([createdAt])
  @@index([fileId])
}

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

model SystemConfig {
  id        String   @id @default(uuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt

  @@index([key])
}
```

## Bootstrap Logic

When initializing the system, implement this logic in a seed script:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Check if any users exist
  const userCount = await prisma.user.count();
  
  if (userCount === 0) {
    // Create the first admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    
    await prisma.user.create({
      data: {
        email: 'admin@reparations.gov',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'admin',
        approved: true,
        approvalStatus: 'approved',
      },
    });
    
    console.log('✅ Initial admin user created');
  }
  
  // Create root folders
  const rootFolders = ['Documents', 'Research', 'Media', 'Archives'];
  
  for (const folderName of rootFolders) {
    await prisma.folder.upsert({
      where: {
        parentId_name_ownerId: {
          parentId: null,
          name: folderName,
          ownerId: 'system',
        },
      },
      update: {},
      create: {
        name: folderName,
        path: `/${folderName}`,
        ownerId: 'system',
      },
    });
  }
  
  // Create default tags
  const defaultTags = [
    { name: 'Important', color: '#ef4444' },
    { name: 'Research', color: '#3b82f6' },
    { name: 'Legal', color: '#8b5cf6' },
    { name: 'Financial', color: '#10b981' },
    { name: 'Historical', color: '#f59e0b' },
    { name: 'Confidential', color: '#ec4899' },
  ];
  
  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  
  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Migrations

Run these commands to set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Seed the database
npx prisma db seed
```
