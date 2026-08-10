# Recent Focus

## Overview

The **Recent Focus** analyzer examines the last 2-3 conversation turns to capture **immediate context** - what is being worked on right now. This provides "short-term memory" distinct from the broader session summary.

---

## Does It Use Nano Gemini?

**No.** The Recent Focus analyzer uses **pattern matching and heuristics** to analyze recent turns. Benefits:
- Instant execution
- No API costs
- Predictable results
- Works offline

---

## What It Does

1. **Extracts last 2-3 message pairs** from conversation
2. **Identifies current topic** from recent context
3. **Captures last user request** verbatim (truncated)
4. **Determines active task** (debugging, implementing, etc.)
5. **Analyzes momentum** (progressing, refining, struggling, concluding)
6. **Finds open items** (unresolved questions, pending steps)
7. **Extracts recent key terms** (what's being discussed NOW)
8. **Generates continuity hint** for next interaction

---

## How It Works

### Lookback Window
```javascript
_lookbackCount: 3 // Analyzes last 3 prompt-response pairs only
```

Why only 2-3 turns?
- Captures **immediate** context vs overall summary
- Short-term "what are we doing right now"
- Complements Topic Summarizer's session-wide view

### Current Topic Extraction

Searches for topic indicators in recent messages:
```javascript
patterns:
  "about/regarding/for {topic}"
  "working on/building/creating {topic}"
  "the {topic} function/component/file"
```

### Active Task Detection

| Detected Pattern | Task |
|------------------|------|
| debugging, fixing, resolving | Debugging |
| implementing, building, coding | Implementation |
| refactoring, optimizing | Refactoring |
| explaining, understanding, learning | Learning |
| writing, drafting | Writing |
| planning, designing | Planning |
| reviewing, checking | Review |
| testing, validating | Testing |

### Momentum Analysis

Detects conversation flow:

| Indicator Words | Momentum |
|-----------------|----------|
| next, now, then, also, additionally | `progressing` |
| actually, instead, wait, but, change | `refining` |
| confused, stuck, help, don't understand | `struggling` |
| thanks, perfect, got it, that works | `concluding` |
| (none of above) | `continuing` |

### Open Items Detection

Identifies potentially unresolved matters:
- Last prompt was a question → "Pending question"
- Response mentions TODO/next steps → "Action items mentioned"
- Response shows step 1/first without "finally" → "Multi-step in progress"

### Recent Key Terms

Extracts most frequent significant words from recent turns only:
```javascript
// Last 3 turns mention: "pagination", "cursor", "API", "offset"
recentKeyTerms: ["pagination", "cursor", "offset", "api"]
```

### Continuity Hint

Predicts what might come next:
```javascript
if (lastPrompt has ?) → "User asked a question; may need follow-up"
if (response > 500 chars) → "Detailed response; may want to drill down"
if (response has code) → "Code provided; may want modifications"
```

---

## Why It Matters

### For Context
- Provides **immediate continuity** - knows what's being worked on RIGHT NOW
- Different from session summary which captures OVERALL theme
- Enables natural conversation flow without losing track

### For Persona Building
- Active task determines **current persona mode**:
  - Debugging → Diagnostic, systematic
  - Implementation → Generative, constructive
  - Learning → Educational, patient
- Momentum informs **response approach**:
  - Progressing → Keep building forward
  - Struggling → Slow down, clarify
  - Refining → Adjust previous output

### Example Comparison

**Topic Summarizer** says:
> "Session about building a React dashboard with charts"

**Recent Focus** says:
> "Currently debugging the pagination function, last request was about cursor-based pagination, momentum is 'struggling'"

Both are valuable; Recent Focus gives the "live" state.

---

## Output Format

```javascript
{
    currentTopic: "cursor-based pagination implementation",
    lastRequest: "Why is the cursor not updating after fetch?",
    activeTask: "Debugging",
    momentum: "struggling",
    openItems: ["Pending question", "Multi-step process in progress"],
    recentKeyTerms: ["pagination", "cursor", "fetch", "update", "offset"],
    continuityHint: "User asked a question; may need follow-up or clarification",
    pairsAnalyzed: 3,
    analyzedAt: 1702486800000
}
```

---

## Memory Architecture Fit

Stored in memory as:
```javascript
memory.components["recent_focus"] = {
    current: { currentTopic, lastRequest, activeTask, momentum, ... },
    history: [...], // Previous states
    confidence: 0.9,
    updatedAt: timestamp
}
```

When context is assembled:
```markdown
## Recent Focus
- **Current Topic**: cursor-based pagination implementation
- **Active Task**: Debugging
- **Last Request**: Why is the cursor not updating after fetch?
- **Momentum**: struggling
- **Open Items**: Pending question, Multi-step process in progress
```

---

## Relationship to Other Analyzers

| Analyzer | Scope | Time Focus |
|----------|-------|------------|
| Topic Summarizer | Entire session | Historical |
| Intent Classifier | Entire session | Overall intent |
| **Recent Focus** | Last 2-3 turns | Immediate/Live |

Recent Focus is the "working memory" while others are "long-term memory".

---

## Limitations

- Only sees last N turns (may miss context from earlier)
- Pattern-based momentum detection
- Cannot understand nuanced emotional states
- Open items detection is heuristic

---

## Future Enhancement Potential

Could be enhanced to:
- Use nano Gemini for semantic understanding of recent context
- Track topic shifts more granularly
- Detect frustration or satisfaction levels
- Predict likely next questions
