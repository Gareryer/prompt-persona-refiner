/**
 * @fileoverview Complete Context Assembler v4 - Unified Context Builder
 * Ported from memory/context-assembler.js (576 lines)
 * @module memory/context-assembler
 */

import type { PersonaV4, DimensionId } from './schemas';
import { logger } from '../logging/logger';

export interface AssembledRefinement {
  systemPrompt: string;
  userPrompt: string;
  assembledAt: number;
  activeDimensions: DimensionId[];
  tokenEstimate: number;
}

export interface UnifiedContext {
  sessionId?: string;
  assembledAt: number;
  currentGeneration: number;
  components: Record<string, any>;
  summary: Record<string, any>;
  refinementContext: Record<string, any>;
}

export class ContextAssembler {
  private memory: any;
  private _cachedContext: UnifiedContext | null = null;

  constructor(memoryController?: any) {
    this.memory = memoryController || null;
    this._cachedContext = null;
  }

  async assemble(options: { filterByGeneration?: boolean } = {}): Promise<UnifiedContext> {
    const filterByGeneration = options.filterByGeneration !== false;
    const unifiedContext = this.memory ? await this.memory.getUnifiedContext() : { components: {}, sessionId: 'default' };
    const currentGeneration = this.memory ? await this.memory.getCurrentGeneration() : 1;

    this._cachedContext = {
      sessionId: unifiedContext.sessionId,
      assembledAt: Date.now(),
      currentGeneration,
      components: unifiedContext.components,
      summary: this._buildSummary(unifiedContext.components, currentGeneration),
      refinementContext: this._buildRefinementContext(
        unifiedContext.components,
        filterByGeneration ? currentGeneration : null
      )
    };

    return this._cachedContext;
  }

  _buildSummary(components: Record<string, any> = {}, currentGeneration: number): Record<string, any> {
    const summary: Record<string, any> = {
      hasContext: Object.keys(components).length > 0,
      componentCount: Object.keys(components).length,
      currentGeneration,
      components: []
    };

    for (const [id, component] of Object.entries(components)) {
      const isCurrent = component.generation === currentGeneration;
      summary.components.push({
        id,
        confidence: component.confidence,
        updatedAt: component.updatedAt,
        generation: component.generation,
        isCurrent
      });
    }

    return summary;
  }

  _isComponentCurrent(component: any, requiredGeneration: number | null): boolean {
    if (requiredGeneration === null) return true;
    if (component?.pinned) return true;
    if (component?.generation === undefined) return true;
    return component?.generation === requiredGeneration;
  }

  _getComponent(components: Record<string, any> = {}, newName: string, legacyName: string | null = null): any {
    return components[newName] || (legacyName ? components[legacyName] : null);
  }

  _getComponentData(component: any): any {
    if (!component) return null;
    if (component.pinned && component.pinnedData) {
      return component.pinnedData;
    }
    return component.current || component.data || (typeof component === 'object' && (component.instruction || component.role || component.domain) ? component : null);
  }

  _extractV4Data(data: any): { instruction: string; fields: Record<string, any>; isV4: boolean; source: string } {
    if (!data) return { instruction: '', fields: {}, isV4: false, source: 'unknown' };

    if (data.instruction !== undefined || data.version === 4) {
      return {
        instruction: data.instruction || '',
        fields: data.metadata || {},
        isV4: true,
        source: data.source || 'unknown'
      };
    }

    return {
      instruction: '',
      fields: data,
      isV4: false,
      source: 'legacy'
    };
  }

  _buildRefinementContext(
    components: Record<string, any> = {},
    currentGeneration: number | null = null,
    disabledFacts: Record<string, any> = {}
  ): Record<string, any> {
    const context: Record<string, any> = {};
    const staleComponents: any[] = [];
    const includedComponents: string[] = [];

    const isFactDisabled = (dim: string) => {
      return disabledFacts[`component.${dim}`] === true || disabledFacts[dim] === true;
    };

    const trackComponent = (id: string, component: any, data: any, included: boolean) => {
      if (included) {
        includedComponents.push(id);
      } else if (data) {
        staleComponents.push({
          id,
          generation: component?.generation,
          requiredGen: currentGeneration
        });
      }
    };

    // 1. PERSONA
    const personaComp = this._getComponent(components, 'persona', 'persona_synthesizer');
    const personaData = this._getComponentData(personaComp);
    const personaIncluded = !isFactDisabled('persona') && !!personaData &&
      this._isComponentCurrent(personaComp, currentGeneration);
    trackComponent('persona', personaComp, personaData, personaIncluded);
    if (personaIncluded) {
      const v4 = this._extractV4Data(personaData);
      if (v4.isV4) {
        context.persona = { instruction: v4.instruction, ...v4.fields };
      } else {
        context.persona = {
          role: v4.fields.role || v4.fields.synthesizedPersona || '',
          purpose: v4.fields.purpose || v4.fields.primaryDomain || '',
          name: v4.fields.name || v4.fields.personaName || null,
          title: v4.fields.title || null,
          credentials: v4.fields.credentials || null
        };
      }
    }

    // 2. CONTEXT
    const contextComp = this._getComponent(components, 'context', 'domain_context');
    const contextData = this._getComponentData(contextComp);
    const contextIncluded = !isFactDisabled('context') && !!contextData &&
      this._isComponentCurrent(contextComp, currentGeneration);
    trackComponent('context', contextComp, contextData, contextIncluded);
    if (contextIncluded) {
      const v4 = this._extractV4Data(contextData);
      if (v4.isV4) {
        context.domain = {
          instruction: v4.instruction,
          domain: v4.fields.domain || '',
          scope_tags: v4.fields.scope_tags || []
        };
      } else {
        context.domain = {
          domain: v4.fields.domain || v4.fields.primaryTopic || '',
          terminology: v4.fields.terminology || [],
          knowledge_boundaries: v4.fields.knowledge_boundaries || null,
          environment: v4.fields.environment || null,
          summary: v4.fields.summary,
          keywords: v4.fields.keywords
        };
      }
    }

    // 3. EXEMPLAR
    const exemplarComp = this._getComponent(components, 'exemplar');
    const exemplarData = this._getComponentData(exemplarComp);
    const exemplarIncluded = !isFactDisabled('exemplar') && !!exemplarData &&
      this._isComponentCurrent(exemplarComp, currentGeneration);
    trackComponent('exemplar', exemplarComp, exemplarData, exemplarIncluded);
    if (exemplarIncluded) {
      const v4 = this._extractV4Data(exemplarData);
      if (v4.isV4) {
        context.exemplar = { instruction: v4.instruction };
      } else {
        context.exemplar = {
          good_examples: v4.fields.good_examples || [],
          bad_examples: v4.fields.bad_examples || [],
          edge_cases: v4.fields.edge_cases || []
        };
      }
    }

    // 4. FORMAT
    const formatComp = this._getComponent(components, 'format');
    const formatData = this._getComponentData(formatComp);
    const formatIncluded = !isFactDisabled('format') && !!formatData &&
      this._isComponentCurrent(formatComp, currentGeneration);
    trackComponent('format', formatComp, formatData, formatIncluded);
    if (formatIncluded) {
      const v4 = this._extractV4Data(formatData);
      if (v4.isV4) {
        context.format = {
          instruction: v4.instruction,
          output_type: v4.fields.output_type || 'markdown'
        };
      } else {
        context.format = {
          output_type: v4.fields.output_type || 'markdown',
          structure: v4.fields.structure || {},
          citations: v4.fields.citations || null,
          special_syntax: v4.fields.special_syntax || [],
          wrapper_tags: v4.fields.wrapper_tags || []
        };
      }
    }

    // 5. TONE
    const toneComp = this._getComponent(components, 'tone', 'tone_preferences');
    const toneData = this._getComponentData(toneComp);
    const toneIncluded = !isFactDisabled('tone') && !!toneData &&
      this._isComponentCurrent(toneComp, currentGeneration);
    trackComponent('tone', toneComp, toneData, toneIncluded);
    if (toneIncluded) {
      const v4 = this._extractV4Data(toneData);
      if (v4.isV4) {
        context.tone = {
          instruction: v4.instruction,
          style_tags: v4.fields.style_tags || [],
          banned_phrases: v4.fields.banned_phrases || []
        };
      } else {
        context.tone = {
          voice: v4.fields.voice || v4.fields.tone || '',
          style: v4.fields.style || 'professional',
          verbosity: v4.fields.verbosity || { level: 'moderate', max_length: null },
          banned_phrases: v4.fields.banned_phrases || [],
          required_phrases: v4.fields.required_phrases || [],
          anti_priorities: v4.fields.anti_priorities || [],
          technicalLevel: v4.fields.technicalLevel,
          directness: v4.fields.directness,
          traits: v4.fields.traits
        };
      }
    }

    // 6. FRAMEWORK
    const frameworkComp = this._getComponent(components, 'framework');
    const frameworkData = this._getComponentData(frameworkComp);
    const frameworkIncluded = !isFactDisabled('framework') && !!frameworkData &&
      this._isComponentCurrent(frameworkComp, currentGeneration);
    trackComponent('framework', frameworkComp, frameworkData, frameworkIncluded);
    if (frameworkIncluded) {
      const v4 = this._extractV4Data(frameworkData);
      if (v4.isV4) {
        context.framework = {
          instruction: v4.instruction,
          reasoning_type: v4.fields.reasoning_type || null
        };
      } else {
        context.framework = {
          methodology: v4.fields.methodology || null,
          reasoning_pattern: v4.fields.reasoning_pattern || null,
          modes: v4.fields.modes || [],
          workflow: v4.fields.workflow || []
        };
      }
    }

    // 7. CONSTRAINTS
    const constraintsComp = this._getComponent(components, 'constraints', 'custom_context');
    const constraintsData = this._getComponentData(constraintsComp);
    const constraintsIncluded = !isFactDisabled('constraints') && !!constraintsData &&
      this._isComponentCurrent(constraintsComp, currentGeneration);
    trackComponent('constraints', constraintsComp, constraintsData, constraintsIncluded);
    if (constraintsIncluded) {
      const v4 = this._extractV4Data(constraintsData);
      if (v4.isV4) {
        context.constraints = {
          instruction: v4.instruction,
          prohibitions: v4.fields.prohibitions || [],
          requirements: v4.fields.requirements || [],
          response_length: v4.fields.response_length || null
        };
      } else {
        context.constraints = {
          prohibitions: v4.fields.prohibitions || v4.fields.constraints || [],
          requirements: v4.fields.requirements || [],
          thresholds: v4.fields.thresholds || [],
          safety_rules: v4.fields.safety_rules || []
        };
      }
    }

    // 8. RECENT FOCUS
    const recentFocusComp = this._getComponent(components, 'recent_focus');
    const recentFocusData = this._getComponentData(recentFocusComp);
    if (recentFocusData && !isFactDisabled('recent_focus')) {
      context.recentFocus = recentFocusData;
    }

    return context;
  }

  async formatForRefinement(): Promise<string> {
    if (!this._cachedContext) {
      await this.assemble();
    }

    const ctx = this._cachedContext?.refinementContext;
    if (!ctx || Object.keys(ctx).length === 0) return '';

    const sections: string[] = [];

    if (ctx.persona?.instruction) {
      sections.push(`## 🎭 PERSONA (EMBODY THIS EXPERT)\n${ctx.persona.instruction}`);
    }

    if (ctx.domain?.instruction) {
      sections.push(`## 🌐 DOMAIN & SCOPE\n- **Domain**: ${ctx.domain.domain || 'General'}\n- **Scope**: ${(ctx.domain.scope_tags || []).join(', ') || 'General'}\n- **Expertise**: ${ctx.domain.instruction}`);
    }

    if (ctx.tone?.instruction) {
      let toneSection = `## 🎨 TONE & STYLE\n- **Voice**: ${ctx.tone.instruction}\n- **Style Tags**: ${(ctx.tone.style_tags || []).join(', ') || 'Professional'}`;
      if (ctx.tone.banned_phrases?.length) {
        toneSection += `\n- **AVOID**: "${ctx.tone.banned_phrases.join('", "')}"`;
      }
      sections.push(toneSection);
    }

    if (ctx.framework?.instruction) {
      sections.push(`## 🔧 METHODOLOGY\n- **Reasoning Approach**: ${ctx.framework.reasoning_type || 'Step-by-Step'}\n- **Methodology**: ${ctx.framework.instruction}`);
    }

    if (ctx.constraints?.instruction || ctx.constraints?.prohibitions?.length || ctx.constraints?.requirements?.length) {
      let constraintSection = '## ⚠️ CONSTRAINTS';
      if (ctx.constraints.requirements?.length) {
        constraintSection += `\n- **MUST**: ${ctx.constraints.requirements.join('; ')}`;
      }
      if (ctx.constraints.prohibitions?.length) {
        constraintSection += `\n- **NEVER**: ${ctx.constraints.prohibitions.join('; ')}`;
      }
      if (ctx.constraints.response_length) {
        constraintSection += `\n- **Response Length**: ${ctx.constraints.response_length}`;
      }
      if (ctx.constraints.instruction) {
        constraintSection += `\n- **Notes**: ${ctx.constraints.instruction}`;
      }
      sections.push(constraintSection);
    }

    if (ctx.format?.instruction) {
      sections.push(`## 📋 OUTPUT FORMAT\n- **Type**: ${ctx.format.output_type || 'Markdown'}\n- **Structure**: ${ctx.format.instruction}`);
    }

    if (ctx.exemplar?.instruction) {
      sections.push(`## 📚 EXEMPLAR PATTERNS\n${ctx.exemplar.instruction}`);
    }

    if (ctx.recentFocus) {
      sections.push(`## 🎯 CURRENT FOCUS\n- **Working On**: ${ctx.recentFocus.currentTopic || ctx.recentFocus.currentFocus || 'General task'}\n- **Active Task**: ${ctx.recentFocus.activeTask || 'None specified'}`);
    }

    return sections.join('\n\n');
  }

  async getContextJSON(): Promise<Record<string, any>> {
    if (!this._cachedContext) {
      await this.assemble();
    }
    return this._cachedContext?.refinementContext || {};
  }

  async hasContext(): Promise<boolean> {
    return this.memory ? await this.memory.hasContext() : false;
  }

  clearCache(): void {
    this._cachedContext = null;
  }

  // Static API compatible with existing unit tests
  static assemble(persona: PersonaV4, activeDimensions?: DimensionId[]): AssembledRefinement {
    const start = performance.now();
    const dimensionsToInclude = activeDimensions || [
      'persona',
      'context',
      'tone',
      'framework',
      'constraints',
      'format',
      'exemplar'
    ];

    const sections: string[] = [];
    const includedIds: DimensionId[] = [];

    if (dimensionsToInclude.includes('persona') && persona.persona?.instruction?.trim()) {
      sections.push(`[PERSONA]\n${persona.persona.instruction.trim()}`);
      includedIds.push('persona');
    }

    if (dimensionsToInclude.includes('context') && persona.context?.instruction?.trim()) {
      sections.push(`[CONTEXT]\n${persona.context.instruction.trim()}`);
      includedIds.push('context');
    }

    if (dimensionsToInclude.includes('tone') && persona.tone?.instruction?.trim()) {
      sections.push(`[TONE]\n${persona.tone.instruction.trim()}`);
      includedIds.push('tone');
    }

    if (dimensionsToInclude.includes('framework') && persona.framework?.instruction?.trim()) {
      sections.push(`[FRAMEWORK]\n${persona.framework.instruction.trim()}`);
      includedIds.push('framework');
    }

    if (dimensionsToInclude.includes('constraints') && persona.constraints?.instruction?.trim()) {
      sections.push(`[CONSTRAINTS]\n${persona.constraints.instruction.trim()}`);
      includedIds.push('constraints');
    }

    if (dimensionsToInclude.includes('format') && persona.format?.instruction?.trim()) {
      sections.push(`[FORMAT]\n${persona.format.instruction.trim()}`);
      includedIds.push('format');
    }

    if (dimensionsToInclude.includes('exemplar') && persona.exemplar?.instruction?.trim()) {
      sections.push(`[EXEMPLAR]\n${persona.exemplar.instruction.trim()}`);
      includedIds.push('exemplar');
    }

    const systemPrompt = sections.join('\n\n');
    const tokenEstimate = Math.ceil(systemPrompt.length / 4);

    logger.debug('Context assembled', {
      durationMs: Math.round(performance.now() - start),
      tokenEstimate,
      includedCount: includedIds.length
    });

    return {
      systemPrompt,
      userPrompt: '',
      assembledAt: Date.now(),
      activeDimensions: includedIds,
      tokenEstimate
    };
  }

  static buildRefinedPrompt(userPrompt: string, persona: PersonaV4, activeDimensions?: DimensionId[]): string {
    const assembled = this.assemble(persona, activeDimensions);
    if (!assembled.systemPrompt) return userPrompt;
    return `${assembled.systemPrompt}\n\n[USER REQUEST]\n${userPrompt}`.trim();
  }
}

export function assembleRefinementContext(persona: PersonaV4, activeDimensions?: DimensionId[]) {
  return ContextAssembler.assemble(persona, activeDimensions);
}
