# Storage & Cloud Sync Subsystem

## 📌 Architectural Overview
Provides resilient, strongly-typed storage across local persistent partitions and Supabase cloud synchronization.

### Modules:
- `items.ts`: Type-safe storage definitions with fallbacks and migrations.
- `repository.ts`: High-level CRUD repository for personas, drafts, settings, and ratings.
- `supabase-client.ts`: Cloud persistence adapter.
