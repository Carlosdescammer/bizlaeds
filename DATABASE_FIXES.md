# Database Fixes Applied

## Ambiguous Column Reference Fix (2025-10-30)

### Issue
PostgreSQL error when inserting into `api_usage_log`:
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

### Solution
Explicitly qualified all table column references in PL/pgSQL functions:
- Changed `WHERE service = 'hunter_io'` to `WHERE api_usage.service = 'hunter_io'`
- Applied to all references in both `check_limits_after_log()` and `check_usage_limits()`

### Functions Fixed
1. **check_usage_limits()** - All `api_usage` table references now explicitly qualified
2. **check_limits_after_log()** - All `usage_alerts` table references now explicitly qualified

### Testing
Verified fix by successfully inserting test record into `api_usage_log` table.

### Files Modified
- Database functions directly via SQL (no code changes required)
- Functions will remain fixed unless database is recreated
