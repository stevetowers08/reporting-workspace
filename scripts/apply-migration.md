# Apply Database Migrations

## Install Supabase CLI

### Windows (with npm)
```bash
npm install -g supabase
```

### Or using Scoop
```bash
scoop install supabase
```

## Link to Your Project

```bash
cd c:\Dev\reporting-workspace
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > General
4. Copy the "Reference ID"

## Apply the Migration

```bash
supabase db push
```

This will apply all migrations in the `supabase/migrations` folder to your remote database.

## Verify the Migration

```bash
# Check if tables were created
supabase db diff
```

Or connect to your database and run:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('groups', 'group_clients', 'share_tokens', 'group_summary');
```
