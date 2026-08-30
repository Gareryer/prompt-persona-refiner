# Messaging & RPC Protocol Subsystem

## 📌 Architectural Overview
Provides a strongly-typed, synchronous event bus connecting Content Scripts, Sidepanel, Options, and the Background Service Worker.

### Invariants:
1. **Top-Level Synchronous Listeners**: Background listeners are registered synchronously at initial module evaluation.
2. **ProtocolMap Contract**: All messages are strictly typed request/response pairs.
3. **Async Return True**: All async message handlers return `true` to maintain the message channel until response resolution.
