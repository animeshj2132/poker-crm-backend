# 🔧 Render IPv6 Connection Fix

## ❌ **The Problem:**

```
Error: connect ENETUNREACH 2406:da1c:f42:ae04:7149:2570:8fe4:21c3:5432
```

**Root Cause:** 
- Render is trying to connect to Supabase via **IPv6** (`2406:da1c:...`)
- Render's network **cannot reach IPv6 addresses** (or this specific one)
- The DNS resolves to IPv6 first, causing connection failures

---

## ✅ **The Fix Applied:**

### **1. Force IPv4 DNS Resolution**

Added to `app.module.ts`:
```typescript
import * as dns from 'dns';

// Force IPv4 DNS resolution (Node.js 17.0+)
dns.setDefaultResultOrder('ipv4first');
```

This tells Node.js to **prefer IPv4 addresses** when resolving hostnames.

### **2. Parse DATABASE_URL and Use Individual Parameters**

Instead of using the URL directly, we now:
- Parse the connection string
- Extract host, port, username, password, database
- Use individual connection parameters
- Add SSL configuration explicitly

### **3. Added SSL Configuration**

```typescript
ssl: {
  rejectUnauthorized: false // Required for Supabase
}
```

---

## 🚀 **What Changed:**

**Before:**
```typescript
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    type: 'postgres',
    url: process.env.DATABASE_URL, // Direct URL - tries IPv6 first
    autoLoadEntities: true,
    synchronize: false
  })
})
```

**After:**
```typescript
TypeOrmModule.forRootAsync({
  useFactory: async () => {
    // Force IPv4 DNS resolution
    dns.setDefaultResultOrder('ipv4first');
    
    const dbUrl = process.env.DATABASE_URL;
    const url = new URL(dbUrl);
    
    return {
      type: 'postgres',
      host: url.hostname,        // Individual parameters
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: false // SSL for Supabase
      },
      extra: {
        connectionTimeoutMillis: 10000,
        max: 20,
        idleTimeoutMillis: 30000,
      }
    };
  }
})
```

---

## 🔍 **If Still Fails - Alternative Solutions:**

### **Option 1: Use Supabase Connection Pooler (Recommended)**

Supabase provides a **connection pooler** that uses IPv4. Update your `DATABASE_URL` in Render:

**Instead of:**
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

**Use the pooler:**
```
postgresql://postgres.xxxxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Or:**
```
postgresql://postgres.xxxxx:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

**How to find your pooler URL:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Look for "Connection Pooling" section
3. Copy the "Connection string" (use port `6543` for transaction mode or `5432` for session mode)

### **Option 2: Use Direct IPv4 Address**

If you know Supabase's IPv4 address, you can hardcode it:

```typescript
host: '52.66.xxx.xxx', // Supabase IPv4 (find via `nslookup db.xxxxx.supabase.co`)
```

**Not recommended** - IPs can change.

### **Option 3: Use Supabase's Transaction Pooler**

The transaction pooler (`:6543`) is specifically designed for serverless/cloud environments and handles IPv4/IPv6 better.

---

## 📋 **Verify the Fix:**

After deploying, check logs for:
```
✅ [TypeOrmModule] TypeORM connection established
✅ [NestFactory] Nest application successfully started
```

**No more `ENETUNREACH` errors!**

---

## 🎯 **Quick Checklist:**

- [x] Added `dns.setDefaultResultOrder('ipv4first')`
- [x] Parse DATABASE_URL into individual parameters
- [x] Added SSL configuration
- [x] Added connection pool settings
- [ ] Test deployment on Render
- [ ] If still fails, switch to Supabase Connection Pooler

---

## 🔗 **References:**

- [Node.js DNS setDefaultResultOrder](https://nodejs.org/api/dns.html#dns_dns_setdefaultresultorder_order)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [TypeORM SSL Configuration](https://typeorm.io/data-source-options#postgresql--cockroachdb-data-source-options)

---

**The fix is deployed! Test it now!** 🚀





