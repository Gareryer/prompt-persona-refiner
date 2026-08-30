# V4 7-Dimension Persona Memory Subsystem

## 📌 Architectural Overview
The V4 Memory Schema is a **verbatim-first** representation of persona knowledge. It decouples high-fidelity instruction text from structured UI filter metadata.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PERSONA V4 ROOT OBJECT                           │
├─────────────────┬────────────────────────────────────────────────────────┤
│ metadata        │ suggested_name, suggested_title, domain, intent, tags  │
├─────────────────┼────────────────────────────────────────────────────────┤
│ 1. persona      │ instruction: string (Role & Identity)                  │
│ 2. context      │ instruction: string + metadata (domain, scope_tags)    │
│ 3. tone         │ instruction: string + metadata (style, banned phrases) │
│ 4. framework    │ instruction: string + metadata (reasoning_type)        │
│ 5. constraints  │ instruction: string + metadata (rules, length)         │
│ 6. format       │ instruction: string + metadata (output_type)           │
│ 7. exemplar     │ instruction: string (Few-shot input/output pairs)      │
└─────────────────┴────────────────────────────────────────────────────────┘
```

## 🔒 Invariants & Contracts
1. **Instruction Preservation**: `instruction` is **mandatory** on all 7 dimensions and must preserve verbatim LLM text without truncation.
2. **Optional Metadata**: `metadata` is strictly helper data for UI chips, filters, and quick toggles. Missing metadata must not fail schema validation.
3. **Zod Validation**: All inbound LLM extractions and storage payloads must validate against `PersonaV4Schema`.
