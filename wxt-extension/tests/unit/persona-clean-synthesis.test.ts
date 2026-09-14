import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import JSZip from 'jszip';
import { setupMockDom } from '../fixtures/mock-dom';
import { TextSanitizer } from '@/core/harvest/extraction/text-sanitizer';
import { ChatGPTAdapter } from '@/adapters/chatbots/chatgpt/adapter';
import { ClaudeAdapter } from '@/adapters/chatbots/claude/adapter';
import { GeminiAdapter } from '@/adapters/chatbots/gemini/adapter';
import { ZipBuilder } from '@/core/harvest/packaging/zip-builder';
import { UnifiedAnalyzer } from '@/core/memory/analyzers/unified-analyzer';
import { validatePersonaV4, type PersonaV4 } from '@/core/memory/schemas';
import type { HarvestConversationRecord, HarvestTurn } from '@/core/harvest/types';

setupMockDom();

describe('Phase 4: End-to-End Clean Persona Extraction & Synthesis Verification', () => {
  let chatgptAdapter: ChatGPTAdapter;
  let claudeAdapter: ClaudeAdapter;
  let geminiAdapter: GeminiAdapter;

  beforeEach(() => {
    setupMockDom();
    chatgptAdapter = new ChatGPTAdapter();
    claudeAdapter = new ClaudeAdapter();
    geminiAdapter = new GeminiAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('ChatGPT: eliminates table flattening, attachment badge bleeding, citation chips, and expander noise', async () => {
    const userTurnEl = document.createElement('article');
    userTurnEl.setAttribute('data-testid', 'conversation-turn-2');
    userTurnEl.innerHTML = `
      <div data-message-author-role="user">
        <div class="attachment-card flex items-center">
          <span class="file-icon"></span>
          <span class="filename">VID_20260312_143022.mp4</span>
          <span class="file-type">File</span>
        </div>
        <div class="user-prompt">
          I want to repurpose this video clip for our agency clients. How should we pace the hook?
        </div>
      </div>
    `;

    const assistantTurnEl = document.createElement('article');
    assistantTurnEl.setAttribute('data-testid', 'conversation-turn-3');
    assistantTurnEl.innerHTML = `
      <div data-message-author-role="assistant">
        <button data-testid="reasoning-expander" class="text-xs">Reasoned for 8 seconds</button>
        <div class="markdown prose">
          <p>Here is the recommended retention curve for the clip<a class="citation" href="https://example.com/study">Research+1</a>:</p>
          <table>
            <thead>
              <tr><th>Phase</th><th>Duration</th><th>Action</th></tr>
            </thead>
            <tbody>
              <tr><td>Hook</td><td>0-3s</td><td>Visual disruption</td></tr>
              <tr><td>Core</td><td>3-20s</td><td>Tactical insight</td></tr>
            </tbody>
          </table>
          <button class="show-more">Show moreShow less</button>
        </div>
      </div>
    `;

    document.body.appendChild(userTurnEl);
    document.body.appendChild(assistantTurnEl);

    const turns = await chatgptAdapter.scrapeHarvestTurns();
    expect(turns).toHaveLength(2);

    // 1. User turn verification: attachment card isolated, rawText synchronized
    const user = turns[0]!;
    expect(user.content).toBe('I want to repurpose this video clip for our agency clients. How should we pace the hook?');
    expect(user.rawText).toBe(user.content);
    expect(user.content).not.toContain('VID_20260312_143022.mp4File');

    // 2. Assistant turn verification: table is clean GFM markdown, citations normalized, expander stripped
    const assistant = turns[1]!;
    expect(assistant.thinking).toBeNull();
    expect(assistant.content).toContain('| Phase | Duration | Action |');
    expect(assistant.content).toContain('| Hook | 0-3s | Visual disruption |');
    expect(assistant.content).not.toContain('Reasoned for 8 seconds');
    expect(assistant.content).not.toContain('+1');
    expect(assistant.content).not.toContain('Show moreShow less');
    expect(assistant.rawText).toBe(assistant.content);
  });

  it('Claude: eliminates collapsed thought toggle buttons, unicode ligatures, and system disclaimers', async () => {
    const userTurnEl = document.createElement('div');
    userTurnEl.setAttribute('data-testid', 'user-message');
    userTurnEl.innerHTML = '<p>Explain Argentina tactical tempo management strategy</p>';

    const assistantTurnEl = document.createElement('div');
    assistantTurnEl.className = 'font-claude-response';
    assistantTurnEl.innerHTML = `
      <div class="row-start-1">
        <button class="group/row" aria-label="Thought disclosure">
          Thought for 1m 14s\ue02a
        </button>
      </div>
      <div class="row-start-2 font-claude-response-body">
        <p>Argentina controlled the match tempo through structured possession phases and defensive rest.</p>
        <div class="disclaimer">Claude can make mistakes. Please double-check responses.</div>
      </div>
    `;

    document.body.appendChild(userTurnEl);
    document.body.appendChild(assistantTurnEl);

    const turns = await claudeAdapter.scrapeHarvestTurns();
    expect(turns).toHaveLength(2);

    const assistant = turns[1]!;
    expect(assistant.thinking).toBeNull();
    expect(assistant.content).toBe('Argentina controlled the match tempo through structured possession phases and defensive rest.');
    expect(assistant.rawText).toBe(assistant.content);
    expect(assistant.content).not.toContain('Thought for 1m 14s');
    expect(assistant.content).not.toContain('\ue02a');
    expect(assistant.content).not.toContain('Claude can make mistakes');
  });

  it('Gemini: eliminates 2x prompt duplication via collapsed bubbles and screen reader prefixes', async () => {
    const geminiContainer = document.createElement('div');
    geminiContainer.className = 'conversation-container';

    const userTurnEl = document.createElement('user-query');
    userTurnEl.innerHTML = `
      <div class="luminous-collapsed-bubble">
        Explain quantum superposition in simple terms
      </div>
      <div class="user-query-container">
        <span class="sr-only">You said:</span>
        <p>Explain quantum superposition in simple terms</p>
      </div>
    `;

    const modelTurnEl = document.createElement('model-response');
    modelTurnEl.innerHTML = `
      <div class="response-container">
        <div class="thinking-overlay">Thinking Process: Quantum states...</div>
        <span class="sr-only">Gemini said:</span>
        <div class="markdown">
          <p>Quantum superposition means a particle exists in multiple states simultaneously until measured.</p>
        </div>
        <div class="message-actions">
          <button aria-label="Good response">Thumbs up</button>
          <button aria-label="Bad response">Thumbs down</button>
        </div>
      </div>
    `;

    geminiContainer.appendChild(userTurnEl);
    geminiContainer.appendChild(modelTurnEl);
    document.body.appendChild(geminiContainer);

    const turns = await geminiAdapter.scrapeHarvestTurns();
    expect(turns).toHaveLength(2);

    const user = turns[0]!;
    expect(user.content).toBe('Explain quantum superposition in simple terms');
    expect(user.content).not.toContain('You said:');
    // Ensure no 2x concatenation
    expect(user.content.match(/Explain quantum superposition/g)?.length).toBe(1);
    expect(user.rawText).toBe(user.content);

    const model = turns[1]!;
    expect(model.content).toBe('Quantum superposition means a particle exists in multiple states simultaneously until measured.');
    expect(model.content).not.toContain('Gemini said:');
    expect(model.content).not.toContain('Thinking Process');
    expect(model.content).not.toContain('Thumbs up');
    expect(model.rawText).toBe(model.content);
  });

  it('End-to-End Synthesis: UnifiedAnalyzer produces pure, high-fidelity prompt from sanitized dialogue', async () => {
    const turns: HarvestTurn[] = [
      {
        id: '1',
        turnIndex: 0,
        role: 'user',
        content: 'I need an expert prompt persona for a senior distributed systems architect on AWS.',
        timestamp: Date.now()
      },
      {
        id: '2',
        turnIndex: 1,
        role: 'assistant',
        content: 'You should define clear architecture guidelines with emphasis on fault tolerance and eventual consistency.',
        thinking: null,
        rawText: 'You should define clear architecture guidelines with emphasis on fault tolerance and eventual consistency.',
        timestamp: Date.now()
      }
    ];

    // Verify ZIP export serialization
    const record: HarvestConversationRecord = {
      metadata: {
        site: 'chatgpt',
        accountLabel: 'Default',
        conversationId: 'c-12345',
        title: 'Distributed Systems Architecture',
        url: 'https://chatgpt.com/c/12345',
        extractedAt: new Date().toISOString(),
        messageCount: 2,
        imageCount: 0
      },
      messages: turns
    };

    const sanitizedJson = ZipBuilder.sanitizeRecordForJson(record, { dropThinking: true });
    expect(sanitizedJson.messages[1]!.thinking).toBeNull();
    expect(sanitizedJson.messages[1]!.rawText).toBe(turns[1]!.content);

    // Verify UnifiedAnalyzer prompt construction
    const prompt = UnifiedAnalyzer.getPrompt(turns);
    expect(prompt).toContain('PERSONA ARCHITECT');
    expect(prompt).toContain('User: I need an expert prompt persona for a senior distributed systems architect on AWS.');
    expect(prompt).toContain('Assistant: You should define clear architecture guidelines with emphasis on fault tolerance and eventual consistency.');
    expect(prompt).not.toContain('null');
    expect(prompt).not.toContain('Thinking');
    expect(prompt).not.toContain('Show more');
  });

  it('Multi-Platform Archival: buildZip bundles sanitized turns with nullified thinking and valid GFM tables', async () => {
    const multiPlatformRecord: HarvestConversationRecord = {
      metadata: {
        site: 'chatgpt',
        accountLabel: 'Default',
        conversationId: 'session-multi-plat-123',
        title: 'Multi-Platform Harvest Archive',
        url: 'https://chatgpt.com/c/multi-plat-123',
        extractedAt: new Date().toISOString(),
        messageCount: 4,
        imageCount: 0
      },
      messages: [
        {
          id: 'turn-1',
          turnIndex: 0,
          role: 'user',
          content: 'How should we pace this hook?',
          rawText: 'How should we pace this hook?',
          timestamp: 1000
        },
        {
          id: 'turn-2',
          turnIndex: 1,
          role: 'assistant',
          content: '| Phase | Duration | Action |\n|---|---|---|\n| Hook | 0-3s | Visual disruption |',
          rawText: '| Phase | Duration | Action |\n|---|---|---|\n| Hook | 0-3s | Visual disruption |',
          thinking: 'Thought for 8 seconds',
          timestamp: 2000
        },
        {
          id: 'turn-3',
          turnIndex: 2,
          role: 'user',
          content: 'Explain Argentina tactical tempo strategy',
          rawText: 'Explain Argentina tactical tempo strategy',
          timestamp: 3000
        },
        {
          id: 'turn-4',
          turnIndex: 3,
          role: 'assistant',
          content: 'Argentina controlled tempo through tactical pauses.',
          rawText: 'Argentina controlled tempo through tactical pauses.',
          thinking: 'Thought for 1m 14s',
          timestamp: 4000
        }
      ]
    };

    const zipBlob = await ZipBuilder.buildZip(multiPlatformRecord);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);

    const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    const conversationFile = loadedZip.file('conversation.json');
    expect(conversationFile).not.toBeNull();

    const conversationJsonText = await conversationFile!.async('string');
    const parsed = JSON.parse(conversationJsonText);

    expect(parsed.metadata.title).toBe('Multi-Platform Harvest Archive');
    expect(parsed.messages).toHaveLength(4);

    // Assert ALL thinking traces are nullified by default
    for (const msg of parsed.messages) {
      expect(msg.thinking).toBeNull();
      expect(msg.rawText).toBe(msg.content);
      expect(msg.content).not.toContain('Thought for');
    }

    // Assert table integrity in message 1
    expect(parsed.messages[1].content).toContain('| Phase | Duration | Action |');
  });

  it('End-to-End Persona Synthesis: UnifiedAnalyzer.analyze produces validated 7-dimension persona compliant with PersonaV4Schema', async () => {
    const turns: HarvestTurn[] = [
      {
        id: 't-1',
        turnIndex: 0,
        role: 'user',
        content: 'Design an AI persona for an expert cloud architect with focus on AWS resilience.',
        rawText: 'Design an AI persona for an expert cloud architect with focus on AWS resilience.',
        timestamp: 1000
      },
      {
        id: 't-2',
        turnIndex: 1,
        role: 'assistant',
        content: 'I recommend a resilient systems architect persona adhering to the Well-Architected Framework.',
        rawText: 'I recommend a resilient systems architect persona adhering to the Well-Architected Framework.',
        thinking: null,
        timestamp: 2000
      }
    ];

    const mockGoldenPersona: PersonaV4 = {
      persona: {
        instruction: 'You are a Principal Cloud Architect specializing in AWS high-availability and fault tolerance.',
        version: 4
      },
      context: {
        instruction: 'Focus on distributed cloud systems, AWS Well-Architected Framework, and multi-region failover.',
        version: 4,
        metadata: { domain: 'Tech', scope_tags: ['AWS', 'Distributed Systems'] }
      },
      tone: {
        instruction: 'Authoritative, technical, and precise. Avoid speculative claims and generic introductions.',
        version: 4,
        metadata: { style_tags: ['Authoritative', 'Technical'] }
      },
      framework: {
        instruction: 'Apply deductive root-cause analysis and five-pillar architectural evaluations.',
        version: 4,
        metadata: { reasoning_type: 'Analytical' }
      },
      constraints: {
        instruction: 'NEVER compromise security or data integrity. ALWAYS specify SLAs and RTO/RPO targets.',
        version: 4,
        metadata: { prohibitions: ['Never ignore RTO/RPO'], requirements: ['Specify SLAs'] }
      },
      format: {
        instruction: 'Format outputs with Markdown tables, bulleted architectural decisions, and Mermaid diagrams.',
        version: 4,
        metadata: { output_type: 'Markdown' }
      },
      exemplar: {
        instruction: 'User: How do we achieve active-active failover?\nAssistant: Use Route 53 latency routing with DynamoDB Global Tables.',
        version: 4
      },
      metadata: {
        suggested_name: 'Cloud Resilience Architect',
        suggested_title: 'Principal Cloud Systems Engineer',
        domain: 'Tech',
        primary_intent: 'Architect fault-tolerant multi-region cloud infrastructures'
      }
    };

    const mockLlmClient = {
      isConfigured: () => true,
      call: vi.fn().mockImplementation(async (prompt: string) => {
        // Verify prompt is completely clean
        expect(prompt).toContain('PERSONA ARCHITECT');
        expect(prompt).toContain('User: Design an AI persona for an expert cloud architect with focus on AWS resilience.');
        expect(prompt).not.toContain('Thinking');
        expect(prompt).not.toContain('Show more');
        return { json: mockGoldenPersona };
      })
    };

    const synthesized = await UnifiedAnalyzer.analyze({ messages: turns }, mockLlmClient);
    expect(synthesized).toBeDefined();

    const validation = validatePersonaV4(synthesized);
    expect(validation.success).toBe(true);
    expect(validation.data?.metadata?.suggested_name).toBe('Cloud Resilience Architect');
    expect(validation.data?.persona?.instruction).toContain('Principal Cloud Architect');
    expect(validation.data?.framework?.metadata?.reasoning_type).toBe('Analytical');
    expect(validation.data?.format?.metadata?.output_type).toBe('Markdown');
  });
});
