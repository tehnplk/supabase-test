# Fitness Tracker - รายละเอียดโครงการและรายงานการพัฒนา

## 1. ภาพรวมโครงการ (Project Overview)
**ชื่อโครงการ:** supabase-test (Fitness Tracker Scope)  
**คำอธิบาย:** เว็บแอปพลิเคชัน Next.js ที่เชื่อมต่อกับ Supabase เพื่อจัดการระบบยืนยันตัวตน (Authentication), ระบบสมาชิก, และการติดตามกิจกรรมการออกกำลังกาย ระบบรองรับวงจรการใช้งานของผู้ใช้ตั้งแต่การสมัครสมาชิก, เข้าสู่ระบบ, จัดการโปรไฟล์, ไปจนถึงการบันทึกกิจกรรม โดยมีการรักษาความปลอดภัยข้อมูลด้วยนโยบาย Row Level Security (RLS) ที่เข้มงวด

## 2. เทคโนโลยีที่ใช้ (Technical Stack)

### Frontend & Framework
- **Framework:** Next.js 16.1.1 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Runtime:** Bun

### Backend & Database
- **Platform:** Supabase (Auth + Postgres)
- **Integration:** `@supabase/ssr`, `@supabase/supabase-js`
- **Security:** Postgres Row Level Security (RLS) policies

## 3. โครงสร้างฐานข้อมูล (Database Schema)

### `public.members`
เก็บข้อมูลโปรไฟล์ผู้ใช้ เชื่อมโยงกับ `auth.users`
- `id` (UUID, PK): อ้างอิง `auth.users.id`
- `email` (Text)
- `full_name` (Text)
- `avatar_url` (Text)
- `updated_at` (Timestamp)
- `status` (Enum: 'active', 'inactive'): สถานะบัญชี ใช้ควบคุมการเข้าใช้งาน

### `public.member_activity`
เก็บประวัติกิจกรรมการออกกำลังกายของสมาชิก
- `id` (UUID, PK)
- `member_id` (UUID, FK): อ้างอิง `members.id`
- `activity_type` (Text): เช่น วิ่ง (Run), ว่ายน้ำ (Swim), ปั่นจักรยาน (Cycle)
- `distance_km` (Float)
- `duration_minutes` (Float)
- `calories` (Float)
- `occurred_at` (Timestamp)
- `notes` (Text)

## 4. ฟีเจอร์หลัก (Key Features)

### Authentication & Authorization
- **Sign Up/Log In:** เข้าสู่ระบบด้วย Email & Password ผ่าน Supabase Auth
- **Member Status Logic:**
    - สมาชิกที่มีสถานะ `status = 'inactive'` จะถูกระงับสิทธิ์การเข้าใช้งาน
    - มีการตรวจสอบสถานะทันทีหลังจากยืนยันตัวตนสำเร็จ หากพบว่าเป็น inactive ระบบจะ logout และส่งไปหน้าแจ้งเตือน error
- **Session Management:** จัดการ session ผ่าน Next.js Middleware และ `@supabase/ssr`

### User Interface
- **Dashboard (`/`):**
    - หน้าแรก (Landing page) เข้าถึงได้ทั่วไป
    - แสดงสถิติรวมของทั้งระบบ (สมาชิกทั้งหมด, จำนวนกิจกรรม, ระยะทางรวม, แคลอรี่รวม)
    - แสดงรายการกิจกรรมล่าสุดของสมาชิกในระบบ
- **Account Page (`/account`):**
    - หน้าส่วนตัว (Protected route - ต้องล็อกอิน)
    - แสดงข้อมูลโปรไฟล์ (ชื่อ, อีเมล, สถานะ)
    - รายการประวัติกิจกรรมส่วนตัวของผู้ใช้
- **Auth Pages:** หน้า Login (`/login`) และ Signup (`/signup`) พร้อมระบบแจ้งเตือนข้อผิดพลาด

## 5. การรักษาความปลอดภัย (Security Implementation)

### Row Level Security (RLS)
- **ตาราง `members`:**
    - `SELECT`: ผู้ใช้ดูได้เฉพาะข้อมูลโปรไฟล์ของตนเอง (`auth.uid() = id`)
    - `INSERT/UPDATE`: จัดการผ่าน Triggers หรือ Admin API เท่านั้น
- **ตาราง `member_activity`:**
    - `SELECT`: ผู้ใช้ดูได้เฉพาะกิจกรรมของตนเอง (`auth.uid() = member_id`)

### Triggers & Functions
- **`handle_new_auth_user`:** สร้างข้อมูลใน `public.members` อัตโนมัติเมื่อมีการสมัครสมาชิกใหม่ใน `auth.users`
- **RPC Functions:**
    - `member_activity_summary`: คำนวณผลรวมสถิติทั้งระบบอย่างปลอดภัย (ใช้ `SECURITY DEFINER`)
    - `recent_member_activities`: ดึงข้อมูลกิจกรรมล่าสุดของระบบโดยไม่เปิดเผยข้อมูลส่วนตัวเกินจำเป็น

## 6. ความสามารถเชิงเทคนิคของ Supabase ที่นำมาใช้ (Supabase Technical Capabilities)

โครงการนี้ใช้ประโยชน์จากฟีเจอร์ระดับสูงของ Supabase เพื่อลดความซับซ้อนของ Backend code และเพิ่มความปลอดภัย:

### 6.1 Database & Security Layer
- **Postgres Triggers:** ใช้ Trigger (`handle_new_auth_user`) ในการทำงานแบบ Event-driven เมื่อมีผู้ใช้สมัครใหม่ ข้อมูลจะถูก replicate ไปยังตาราง `members` โดยอัตโนมัติ ลดปัญหาสถานะข้อมูลไม่ตรงกัน (Data inconsistency)
- **Row Level Security (RLS) Policies:** การกำหนดสิทธิ์การเข้าถึงข้อมูลที่ระดับ Database Engine ทำให้มั่นใจได้ว่าแม้ Code ฝั่ง Application จะมีข้อผิดพลาด แต่ข้อมูลของผู้ใช้จะไม่รั่วไหลข้ามกัน
- **Custom Enum Types:** การใช้ create type enum สำหรับ `member_status` ช่วยควบคุม Data Integrity ของสถานะบัญชี

### 6.2 Remote Procedure Calls (RPC)
- **Security Definer Functions:** การใช้ RPC (`member_activity_summary`) ที่ทำงานด้วยสิทธิ์เจ้าของฐานข้อมูล ช่วยให้สามารถดึงข้อมูลสถิติรวม (Aggregate) ของทั้งระบบมาแสดงที่ Dashboard ได้ โดยไม่ต้องเปิดสิทธิ์ Read ให้ users เข้าถึงข้อมูลดิบของคนอื่น
- **Logic Encapsulation:** ซ่อน Logic การ Query ข้อมูลที่ซับซ้อนไว้ใน Database Function ทำให้ Frontend code สะอาดและเรียกใช่ง่าย

### 6.3 Admin & Auth API
- **Service Role Access:** การใช้ Service Role Key ใน Seed Script ช่วยให้สามารถ bypass RLS เพื่อจัดการข้อมูล mock data, สร้างผู้ใช้, และกำหนดสถานะบัญชีได้โดยตรง
- **Auth Hooks/Middleware:** การผสาน Auth state เข้ากับ Next.js Middleware ช่วยให้จัดการ Protected Routes ได้อย่างมีประสิทธิภาพที่ Edge

## 7. สรุปผลการพัฒนา (Development Summary)

### Phase 1: การวางรากฐานระบบ
- ขึ้นโครงสร้างโปรเจกต์ Next.js ด้วย Tailwind CSS และ Bun
- ตั้งค่า Supabase SSR clients (Server/Browser/Middleware)

### Phase 2: ฐานข้อมูลและระบบสมาชิก
- ออกแบบ schema ตาราง `members` และเปิดใช้งาน RLS
- สร้าง Trigger สำหรับ sync ข้อมูลผู้ใช้จาก `auth.users`
- สร้างหน้า UI สำหรับ Login/Signup ด้วย Server Actions

### Phase 3: ระบบติดตามกิจกรรม
- เพิ่มตาราง `member_activity`
- พัฒนาระบบ Dashboard แสดงผลรวมข้อมูลทั้งระบบ
- สร้างหน้า Account เพื่อดูประวัติกิจกรรมส่วนตัว

### Phase 4: การจัดการบัญชีและความปลอดภัยขั้นสูง
- เพิ่มฟิลด์ `status` ในตาราง `members` (Active/Inactive)
- ปรับปรุง seed script (`seed:auth`) ให้รองรับการสร้างข้อมูลจำลองพร้อมสถานะ
- **Feature:** การระงับบัญชี (Account Suspension)
    - เพิ่ม logic ตรวจสอบสถานะ `inactive` บล็อกไม่ให้เข้าสู่ระบบ
    - ทดสอบด้วยการปรับสถานะ mock user ผ่าน SQL

## 8. รายงานผลการทดสอบ (Testing Report)
- **ข้อมูลจำลอง:** สร้างผู้ใช้จำลอง 5 ราย (`user1` ถึง `user5`)
- **ข้อมูลกิจกรรม:** สร้างกิจกรรมจำลอง 3 รายการต่อผู้ใช้ (Run, Swim, Cycle)
- **ผลการทดสอบ:**
    - `user1`, `user2`, `user3` (Active): เข้าสู่ระบบได้ปกติ ใช้งาน Dashboard และหน้า Account ได้ครบถ้วน
    - `user4`, `user5` (Inactive): เมื่อพยายามเข้าสู่ระบบ -> ถูกส่งไปหน้า Login พร้อมแจ้งเตือน "Account Suspended"
    - ผู้ใช้ไม่มีในระบบ: แจ้งเตือน Credential Error ตามปกติ

---
*วันที่รายงาน: 10 มกราคม 2569*
