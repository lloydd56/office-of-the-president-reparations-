# API Structure & Middleware Documentation

## Folder Structure for Next.js API Routes

```
app/
├── api/
│   ├── auth/
│   │   ├── register/
│   │   │   └── route.ts       # POST: User registration
│   │   ├── login/
│   │   │   └── route.ts       # POST: User login
│   │   ├── logout/
│   │   │   └── route.ts       # POST: User logout
│   │   ├── refresh/
│   │   │   └── route.ts       # POST: Refresh JWT token
│   │   └── me/
│   │       └── route.ts       # GET: Current user info
│   │
│   ├── users/
│   │   ├── route.ts           # GET: List users, POST: Create user (admin)
│   │   ├── [id]/
│   │   │   ├── route.ts       # GET, PUT, DELETE: User CRUD
│   │   │   └── approve/
│   │   │       └── route.ts   # POST: Approve/reject user (admin)
│   │   └── pending/
│   │       └── route.ts       # GET: Pending approval users (admin)
│   │
│   ├── files/
│   │   ├── route.ts           # GET: List files, POST: Upload file
│   │   ├── [id]/
│   │   │   ├── route.ts       # GET, PUT, DELETE: File CRUD
│   │   │   ├── download/
│   │   │   │   └── route.ts   # GET: Download file
│   │   │   ├── versions/
│   │   │   │   └── route.ts   # GET: Version history, POST: New version
│   │   │   ├── star/
│   │   │   │   └── route.ts   # POST: Toggle star
│   │   │   ├── tags/
│   │   │   │   └── route.ts   # PUT: Update tags
│   │   │   ├── share/
│   │   │   │   └── route.ts   # POST: Create share link
│   │   │   └── move/
│   │   │       └── route.ts   # PUT: Move to folder
│   │   ├── bulk/
│   │   │   ├── delete/
│   │   │   │   └── route.ts   # POST: Bulk delete
│   │   │   └── move/
│   │   │       └── route.ts   # POST: Bulk move
│   │   └── search/
│   │       └── route.ts       # GET: Search files
│   │
│   ├── folders/
│   │   ├── route.ts           # GET: List folders, POST: Create folder
│   │   ├── [id]/
│   │   │   ├── route.ts       # GET, PUT, DELETE: Folder CRUD
│   │   │   └── contents/
│   │   │       └── route.ts   # GET: Folder contents
│   │   └── tree/
│   │       └── route.ts       # GET: Full folder tree
│   │
│   ├── trash/
│   │   ├── route.ts           # GET: Trashed files
│   │   ├── [id]/
│   │   │   ├── restore/
│   │   │   │   └── route.ts   # POST: Restore file
│   │   │   └── permanent/
│   │   │       └── route.ts   # DELETE: Permanent delete
│   │   └── empty/
│   │       └── route.ts       # DELETE: Empty trash
│   │
│   ├── shares/
│   │   ├── route.ts           # GET: List active shares
│   │   ├── [token]/
│   │   │   └── route.ts       # GET: Access shared file
│   │   └── verify/
│   │       └── route.ts       # POST: Verify share password
│   │
│   ├── tags/
│   │   ├── route.ts           # GET: List tags, POST: Create tag
│   │   └── [id]/
│   │       └── route.ts       # PUT, DELETE: Tag CRUD
│   │
│   ├── activity/
│   │   ├── route.ts           # GET: Activity logs
│   │   └── export/
│   │       └── route.ts       # GET: Export logs
│   │
│   └── admin/
│       ├── stats/
│       │   └── route.ts       # GET: System statistics
│       ├── users/
│       │   └── route.ts       # GET: All users with details
│       └── config/
│           └── route.ts       # GET, PUT: System configuration
```

## Core Authentication Middleware

```typescript
// lib/auth/middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  approved: boolean;
}

// Generate access token
export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Generate refresh token
export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Authentication middleware
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  // Get token from httpOnly cookie
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
  
  return handler(request, payload);
}

// Approval check middleware
export async function withApproval(
  request: NextRequest,
  handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req, user) => {
    if (!user.approved) {
      return NextResponse.json(
        { error: 'Account pending approval', code: 'PENDING_APPROVAL' },
        { status: 403 }
      );
    }
    return handler(req, user);
  });
}

// Role-based access control middleware
export function withRole(...allowedRoles: string[]) {
  return async function(
    request: NextRequest,
    handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>
  ): Promise<NextResponse> {
    return withApproval(request, async (req, user) => {
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      return handler(req, user);
    });
  };
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// Activity logging helper
export async function logActivity(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  resourceName: string,
  metadata?: Record<string, any>,
  request?: NextRequest
) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      resourceName,
      metadata,
      ipAddress: request?.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown',
    },
  });
}
```

## Authentication Routes Implementation

```typescript
// app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { logActivity, rateLimit } from '@/lib/auth/middleware';

// Password strength validation
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain special character');
  
  return { valid: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!rateLimit(`register:${ip}`, 5, 300000)) { // 5 attempts per 5 minutes
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const { name, email, password } = await request.json();
    
    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: 'Weak password', details: passwordValidation.errors },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }
    
    // Check if this is the first user (will be admin)
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user with appropriate role and approval status
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: isFirstUser ? 'admin' : 'staff',
        approved: isFirstUser,
        approvalStatus: isFirstUser ? 'approved' : 'pending',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approved: true,
        approvalStatus: true,
        createdAt: true,
      },
    });
    
    // Log activity
    await logActivity(
      user.id,
      'register',
      'user',
      user.id,
      user.name,
      { isFirstUser },
      request
    );
    
    return NextResponse.json({
      message: isFirstUser 
        ? 'Admin account created successfully' 
        : 'Registration successful. Your account is pending approval.',
      user,
      requiresApproval: !isFirstUser,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  logActivity, 
  rateLimit 
} from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limiting - 10 attempts per 15 minutes
    if (!rateLimit(`login:${ip}`, 10, 900000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check if user is rejected
    if (user.approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: 'Your account has been rejected. Please contact an administrator.' },
        { status: 403 }
      );
    }
    
    // Generate tokens
    const accessToken = await generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      approved: user.approved,
    });
    
    const refreshToken = await generateRefreshToken(user.id);
    
    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Log activity
    await logActivity(
      user.id,
      'login',
      'user',
      user.id,
      user.name,
      {},
      request
    );
    
    // Create response with httpOnly cookies
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
        approvalStatus: user.approvalStatus,
        avatar: user.avatar,
      },
      // Return pending status for redirect handling
      requiresApproval: !user.approved,
    });
    
    // Set httpOnly cookies
    response.cookies.set('auth_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });
    
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Admin Approval Middleware

```typescript
// app/api/users/[id]/approve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRole, logActivity } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRole('admin')(request, async (req, adminUser) => {
    try {
      const { action } = await request.json(); // 'approve' or 'reject'
      const userId = params.id;
      
      if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json(
          { error: 'Invalid action. Use "approve" or "reject".' },
          { status: 400 }
        );
      }
      
      // Find user to approve/reject
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      if (user.approvalStatus !== 'pending') {
        return NextResponse.json(
          { error: 'User is not in pending state' },
          { status: 400 }
        );
      }
      
      // Update user approval status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approved: action === 'approve',
          approvalStatus: action === 'approve' ? 'approved' : 'rejected',
          approvedById: adminUser.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          approved: true,
          approvalStatus: true,
        },
      });
      
      // Log activity
      await logActivity(
        adminUser.userId,
        action === 'approve' ? 'approve_user' : 'reject_user',
        'user',
        userId,
        user.name,
        { action },
        request
      );
      
      return NextResponse.json({
        message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        user: updatedUser,
      });
      
    } catch (error) {
      console.error('Approval error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
```

## File Upload with Local Storage

```typescript
// app/api/files/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { withApproval, logActivity } from '@/lib/auth/middleware';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  return withApproval(request, async (req, user) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const folderId = formData.get('folderId') as string | null;
      const tags = formData.get('tags') as string | null;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 100MB.' },
          { status: 400 }
        );
      }
      
      // Create unique file ID and path
      const fileId = uuidv4();
      const ext = path.extname(file.name);
      const fileName = `${fileId}${ext}`;
      const userDir = path.join(UPLOAD_DIR, user.userId);
      const filePath = path.join(userDir, fileName);
      
      // Ensure directory exists
      if (!existsSync(userDir)) {
        await mkdir(userDir, { recursive: true });
      }
      
      // Write file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      
      // Parse tags
      const tagList = tags ? JSON.parse(tags) : [];
      
      // Create file record in database
      const fileRecord = await prisma.file.create({
        data: {
          id: fileId,
          name: file.name,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          path: filePath,
          uploaderId: user.userId,
          folderId: folderId || null,
          tags: {
            create: tagList.map((tagId: string) => ({
              tagId,
            })),
          },
          versions: {
            create: {
              version: 1,
              size: file.size,
              path: filePath,
              uploaderId: user.userId,
            },
          },
        },
        include: {
          tags: { include: { tag: true } },
          uploader: { select: { id: true, name: true } },
        },
      });
      
      // Log activity
      await logActivity(
        user.userId,
        'upload',
        'file',
        fileId,
        file.name,
        { size: file.size, mimeType: file.type },
        request
      );
      
      return NextResponse.json({
        message: 'File uploaded successfully',
        file: fileRecord,
      }, { status: 201 });
      
    } catch (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
  });
}
```
