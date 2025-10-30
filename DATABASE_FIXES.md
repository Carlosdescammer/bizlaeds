# Database Fixes Applied

## Ambiguous Column Reference Fix (2025-10-30)

### Issue
PostgreSQL error when inserting into `api_usage_log` and fetching businesses:
```
Error: column reference "service" is ambiguous
Detail: It could refer to either a PL/pgSQL variable or a table column.
```

### Root Cause
Database triggers and functions had ambiguous column references:
1. **Trigger**: `trigger_check_limits_after_log` on INSERT to `api_usage_log`
2. **Functions**:
   - `check_limits_after_log()` - Had unqualified `service` column in WHERE clause
   - `check_usage_limits()` - Had multiple unqualified `service` references
   - `increment_api_usage()` - Had ambiguous references in ON CONFLICT clause

### Solution
Explicitly qualified all table column references in PL/pgSQL functions:
- Changed `WHERE service = 'hunter_io'` to `WHERE api_usage.service = 'hunter_io'`
- Applied to all references in `check_limits_after_log()` and `check_usage_limits()`
- Kept explicit table qualifications in `increment_api_usage()` ON CONFLICT UPDATE clause

### Functions Fixed
1. **check_usage_limits()** - All `api_usage` table references now explicitly qualified
2. **check_limits_after_log()** - All `usage_alerts` table references now explicitly qualified
3. **increment_api_usage()** - Dropped and recreated with proper column qualifications

### Testing
- ✓ Successfully inserted test record into `api_usage_log` table
- ✓ Successfully fetched business record with includes (photos, emailCampaigns)
- ✓ Verified all triggers fire without errors

### Files Modified
- Database functions directly via SQL (no code changes required)
- Functions will remain fixed unless database is recreated
