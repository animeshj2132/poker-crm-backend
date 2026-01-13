# Database Structure Analysis - Supabase vs Backend Code

**Date:** January 9, 2026  
**Database:** Supabase PostgreSQL (mvxqemhzciocszdjcmqs)  
**Backend:** NestJS with TypeORM

---

## Executive Summary

✅ **Database Connection:** Successful  
📊 **Total Tables in Database:** 86 (46 in public schema)  
📁 **Total Entity Files in Code:** 40  
⚠️ **Discrepancies Found:** Yes

---

## Database Schemas

### Schema Breakdown:
- **public**: 46 tables (main application data)
- **auth**: 20 tables (Supabase authentication)
- **realtime**: 10 tables (Supabase realtime features)
- **storage**: 9 tables (Supabase file storage)
- **vault**: 1 table (Supabase secrets)

---

## Public Schema - All Tables (46 Total)

### ✅ Tables with Entities (38 tables)

| Table Name | Row Count | Entity File | Status |
|------------|-----------|-------------|--------|
| affiliate_transactions | 3 | ✅ affiliate-transaction.entity.ts | OK |
| affiliates | 11 | ✅ affiliate.entity.ts | OK |
| attendance_tracking | 2 | ✅ attendance-tracking.entity.ts | OK |
| buyin_requests | 0 | ✅ buyin-request.entity.ts | OK |
| buyout_requests | 0 | ✅ buyout-request.entity.ts | OK |
| chat_messages | 9 | ✅ chat-message.entity.ts | OK |
| chat_sessions | 2 | ✅ chat-session.entity.ts | OK |
| club_settings | 0 | ✅ club-settings.entity.ts | OK |
| clubs | 36 | ✅ club.entity.ts | OK |
| credit_requests | 22 | ✅ credit-request.entity.ts | OK |
| dealer_cashouts | 6 | ✅ dealer-cashout.entity.ts | OK |
| dealer_tips | 7 | ✅ dealer-tips.entity.ts | OK |
| financial_transactions | 23 | ✅ financial-transaction.entity.ts | OK |
| fnb_orders | 1 | ✅ fnb-order.entity.ts | OK |
| inventory_items | 4 | ✅ inventory-item.entity.ts | OK |
| kitchen_stations | 2 | ✅ kitchen-station.entity.ts | OK |
| leave_applications | 1 | ✅ leave-application.entity.ts | OK |
| leave_policies | 7 | ✅ leave-policy.entity.ts | OK |
| menu_categories | 160 | ✅ menu-category.entity.ts | OK |
| menu_items | 10 | ✅ menu-item.entity.ts | OK |
| notification_read_status | 2 | ✅ notification-read-status.entity.ts | OK |
| player_bonuses | 4 | ✅ player-bonus.entity.ts | OK |
| players | 53 | ✅ player.entity.ts | OK |
| push_notifications | 6 | ✅ push-notification.entity.ts | OK |
| rake_collections | 1 | ✅ rake-collection.entity.ts | OK |
| salary_payments | 3 | ✅ salary-payment.entity.ts | OK |
| shifts | 29 | ✅ shift.entity.ts | OK |
| staff | 55 | ✅ staff.entity.ts | OK |
| staff_bonuses | 4 | ✅ staff-bonus.entity.ts | OK |
| suppliers | 2 | ✅ supplier.entity.ts | OK |
| tables | 10 | ✅ table.entity.ts | OK |
| tenants | 40 | ✅ tenant.entity.ts | OK |
| tip_settings | 6 | ✅ tip-settings.entity.ts | OK |
| user_club_roles | 50 | ✅ user-club-role.entity.ts | OK |
| user_tenant_roles | 40 | ✅ user-tenant-role.entity.ts | OK |
| users_v1 | 98 | ✅ user.entity.ts | OK |
| vip_products | 13 | ✅ vip-product.entity.ts | OK |
| waitlist_entries | 15 | ✅ waitlist-entry.entity.ts | OK |

### ⚠️ Tables WITHOUT Entities (8 tables)

| Table Name | Row Count | Status | Reason |
|------------|-----------|--------|--------|
| **audit_logs** | 98 | 🟡 PARTIAL | Entity exists but not detected (uses `@Entity('name')` format) |
| **fnb_menu** | 8 | 🔴 MISSING | No entity file found |
| **player_feedback** | 3 | 🔴 MISSING | No entity file found |
| **player_profile_change_requests** | 2 | 🔴 MISSING | No entity file found |
| **staff_offers** | 12 | 🔴 MISSING | No entity file found |
| **tournament_players** | 0 | 🔴 MISSING | No entity file found |
| **tournament_registrations** | 3 | 🔴 MISSING | No entity file found |
| **tournaments** | 5 | 🔴 CRITICAL | Entity file exists but is EMPTY (0 bytes) |

---

## Critical Issues

### 🔴 **Issue #1: Empty Tournament Entity File**
- **File:** `src/clubs/entities/tournament.entity.ts`
- **Size:** 0 bytes
- **Database Table:** `tournaments` (5 rows exist)
- **Impact:** HIGH - Cannot manage tournaments through TypeORM
- **Action Required:** Create proper entity definition

### 🔴 **Issue #2: Missing Tournament Related Entities**
- **Missing:** `tournament_players` entity
- **Missing:** `tournament_registrations` entity
- **Database Tables:** Both exist with schema defined
- **Impact:** HIGH - Tournament system incomplete
- **Action Required:** Create entity definitions for both tables

### 🔴 **Issue #3: Missing Player & Staff Management Entities**
- **Missing:** `player_feedback` entity (3 rows in DB)
- **Missing:** `player_profile_change_requests` entity (2 rows in DB)
- **Missing:** `staff_offers` entity (12 rows in DB)
- **Missing:** `fnb_menu` entity (8 rows in DB - note: menu_items exists separately)
- **Impact:** MEDIUM - Features exist in DB but not accessible via TypeORM
- **Action Required:** Create entity definitions

---

## Detailed Table Structures

### 🏆 Tournaments Table Structure

```sql
tournaments (5 rows)
├── id (uuid, PK)
├── club_id (uuid, FK → clubs)
├── name (varchar 200)
├── description (text)
├── buy_in (numeric, default 0)
├── prize_pool (numeric, default 0)
├── max_players (integer, default 100)
├── current_players (integer, default 0)
├── start_time (timestamp)
├── end_time (timestamp)
├── status (varchar 50, default 'upcoming')
├── structure (jsonb)
├── created_at (timestamp, default now())
├── updated_at (timestamp, default now())
├── rummy_variant (varchar 100) -- Rummy support
├── number_of_deals (integer)
├── points_per_deal (integer)
├── drop_points (integer)
├── max_points (integer)
├── deal_duration (integer)
└── min_players (integer, default 2)
```

### 🎮 Tournament Players Table Structure

```sql
tournament_players (0 rows)
├── id (uuid, PK)
├── tournament_id (uuid, FK → tournaments)
├── player_id (uuid, FK → players)
├── registered_at (timestamp, default now())
├── seat_number (integer)
├── table_number (integer)
├── is_active (boolean, default true)
├── busted_at (timestamp)
├── finishing_position (integer)
└── prize_amount (numeric)
```

### 📝 Tournament Registrations Table Structure

```sql
tournament_registrations (3 rows)
├── id (uuid, PK)
├── tournament_id (uuid, FK → tournaments)
├── player_id (uuid, FK → players)
├── club_id (uuid, FK → clubs)
├── status (varchar 50, default 'registered')
├── registered_at (timestamp, default now())
├── created_at (timestamp, default now())
└── updated_at (timestamp, default now())
```

### 📊 Staff Offers Table Structure

```sql
staff_offers (12 rows)
├── id (uuid, PK)
├── club_id (uuid, FK → clubs)
├── title (varchar 200)
├── description (text)
├── offer_type (varchar 50)
├── value (varchar 100)
├── validity_start (timestamp)
├── validity_end (timestamp)
├── is_active (boolean, default true)
├── terms (text)
├── image_url (varchar 2048)
├── target_audience (varchar 50, default 'all')
├── created_by (uuid)
├── created_at (timestamp, default now())
└── updated_at (timestamp, default now())
```

### 💬 Player Feedback Table Structure

```sql
player_feedback (3 rows)
├── id (uuid, PK)
├── player_id (uuid, FK → players)
├── club_id (uuid, FK → clubs)
├── message (text)
├── rating (integer)
└── created_at (timestamp, default now())
```

### 📝 Player Profile Change Requests Table Structure

```sql
player_profile_change_requests (2 rows)
├── id (uuid, PK)
├── player_id (uuid, FK → players)
├── club_id (uuid, FK → clubs)
├── field_name (varchar)
├── current_value (text)
├── requested_value (text)
├── status (varchar, default 'pending')
├── admin_notes (text)
├── processed_by (uuid)
├── processed_at (timestamp)
├── created_at (timestamp, default now())
└── updated_at (timestamp, default now())
```

### 🍕 FNB Menu Table Structure

```sql
fnb_menu (8 rows)
├── id (uuid, PK)
├── club_id (uuid, FK → clubs)
├── name (varchar 200)
├── description (text)
├── category (varchar 50)
├── price (numeric)
├── is_available (boolean, default true)
├── image_url (varchar 2048)
├── created_at (timestamp, default now())
└── updated_at (timestamp, default now())
```

---

## Key Database Statistics

### Tables by Row Count (Top 15)

1. **menu_categories**: 160 rows
2. **users_v1**: 98 rows
3. **audit_logs**: 98 rows (⚠️ no entity)
4. **staff**: 55 rows
5. **players**: 53 rows
6. **user_club_roles**: 50 rows
7. **tenants**: 40 rows
8. **user_tenant_roles**: 40 rows
9. **clubs**: 36 rows
10. **shifts**: 29 rows
11. **financial_transactions**: 23 rows
12. **credit_requests**: 22 rows
13. **waitlist_entries**: 15 rows
14. **vip_products**: 13 rows
15. **staff_offers**: 12 rows (⚠️ no entity)

### Empty Tables (0 rows)

- buyin_requests
- buyout_requests
- club_settings
- tournament_players

---

## Recommendations

### Priority 1 (CRITICAL - Blocking Features)

1. **Create tournament.entity.ts** - The file is empty but tournaments exist in DB
2. **Create tournament-players.entity.ts** - For managing tournament participants
3. **Create tournament-registrations.entity.ts** - For tournament registration flow

### Priority 2 (HIGH - Missing Features)

4. **Create staff-offer.entity.ts** - 12 offers exist in DB but not accessible
5. **Create player-feedback.entity.ts** - Feedback system exists but not in code
6. **Create player-profile-change-request.entity.ts** - Profile change approval flow exists

### Priority 3 (MEDIUM - Code Quality)

7. **Create fnb-menu.entity.ts** - Separate from menu_items, used for different purpose
8. **Fix audit-log.entity.ts detection** - Update to use consistent @Entity() format
9. **Review empty tables** - Determine if club_settings, buyin/buyout_requests need data

---

## Backend Module Structure

The backend is organized into these main modules:

```
src/
├── auth/                   # Authentication & authorization
├── clubs/                  # Main club management
│   ├── entities/          # 35 entity files
│   ├── services/          # 25 service files
│   └── dto/              # 81 DTO files
├── users/                 # User management (3 entities)
├── tenants/               # Multi-tenancy support
├── player-*/              # Player-specific features (5 modules)
├── events/                # WebSocket events
└── storage/               # File storage (Supabase)
```

---

## Connection Details Used

- **Database:** PostgreSQL (Supabase)
- **Connection:** Direct connection (not pooler)
- **Host:** db.mvxqemhzciocszdjcmqs.supabase.co
- **Port:** 5432
- **Database:** postgres
- **Schema:** public (primary)

---

## Files Generated During Analysis

1. `check-supabase-db.js` - Database structure extraction script
2. `compare-db-and-code.js` - Database vs code comparison script
3. `db-structure-complete.txt` - Complete database structure dump
4. `DATABASE_ANALYSIS_SUMMARY.md` - This document

---

## Next Steps

1. Create missing entity files (tournament system priority)
2. Update TypeORM configuration if needed
3. Create missing DTOs for new entities
4. Create services and controllers for new features
5. Update API documentation
6. Add tests for new entities

---

**Analysis Complete** ✅  
*All data verified directly from Supabase database*
