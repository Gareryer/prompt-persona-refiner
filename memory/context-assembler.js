/**
 * ============================================================================
 * CONTEXT ASSEMBLER v3 - Unified Context Builder
 * ============================================================================
 * 
 * Updated for 7-dimension industry standard schema:
 * persona, context, exemplar, format, tone, framework, constraints
 * 
 * Maintains backwards compatibility with legacy component names.
 * 
 * ============================================================================
 */

// Logger helper for ContextAssembler
const ctxLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'ContextAssembler', ...data });
    } else {
        console.log(`[ContextAssembler] ${msg}`, data);
    }
};

/**
 * ContextAssembler - Builds unified context from memory components
 */
class ContextAssembler {
    /**
     * @param {MemoryController} memoryController - Memory controller instance
     */
    constructor(memoryController) {
        if (!memoryController) {
            throw new Error('[ContextAssembler] MemoryController is required');
        }
        this.memory = memoryController;
        this._cachedContext = null;
    }

    /**
     * Assemble all memory components into unified context
     * @param {Object} options - Assembly options
     * @param {boolean} options.filterByGeneration - Only include current-generation components (default: true)
     * @returns {Promise<UnifiedContext>}
     */
    async assemble(options = {}) {
        const filterByGeneration = options.filterByGeneration !== false;
        const unifiedContext = await this.memory.getUnifiedContext();
        const currentGeneration = await this.memory.getCurrentGeneration();

        // Enhance with structured summary
        this._cachedContext = {
            sessionId: unifiedContext.sessionId,
            assembledAt: Date.now(),
            currentGeneration: currentGeneration,

            // Component data (filtered or full)
            components: unifiedContext.components,

            // Quick access summaries
            summary: this._buildSummary(unifiedContext.components, currentGeneration),

            // Refinement-ready context (generation filtered)
            refinementContext: this._buildRefinementContext(
                unifiedContext.components,
                filterByGeneration ? currentGeneration : null
            )
        };

        return this._cachedContext;
    }

    /**
     * Build quick-access summary from components
     * @param {Object} components
     * @param {number} currentGeneration - Current generation for staleness check
     * @returns {Object}
     */
    _buildSummary(components, currentGeneration) {
        const summary = {
            hasContext: Object.keys(components).length > 0,
            componentCount: Object.keys(components).length,
            currentGeneration: currentGeneration,
            components: []
        };

        for (const [id, component] of Object.entries(components)) {
            const isCurrent = component.generation === currentGeneration;
            summary.components.push({
                id,
                confidence: component.confidence,
                updatedAt: component.updatedAt,
                generation: component.generation,
                isCurrent: isCurrent
            });
        }

        return summary;
    }

    /**
     * Check if a component should be included based on generation
     * @param {Object} component - Component data
     * @param {number|null} requiredGeneration - Generation to filter by (null = include all)
     * @returns {boolean}
     */
    _isComponentCurrent(component, requiredGeneration) {
        if (requiredGeneration === null) return true;
        return component?.generation === requiredGeneration;
    }

    /**
     * Get component data with backwards compatibility
     * Checks for new dimension name first, then falls back to legacy name
     * @param {Object} components - All components
     * @param {string} newName - New dimension name
     * @param {string} legacyName - Legacy component name
     * @returns {Object|null}
     */
    _getComponent(components, newName, legacyName = null) {
        return components[newName] || (legacyName ? components[legacyName] : null);
    }

    /**
     * Extract data from v4 or v3 format
     * V4 format: { instruction: "...", version: 4, metadata: { ... } }
     * V3 format: { field1: "...", field2: "..." }
     * @param {Object} data - Component data
     * @returns {Object} Normalized data with instruction (string) and fields (object)
     */
    _extractV4Data(data) {
        if (!data) return { instruction: '', fields: {}, isV4: false };

        // Check if this is v4 format
        if (data.instruction !== undefined || data.version === 4) {
            return {
                instruction: data.instruction || '',
                fields: data.metadata || {},
                isV4: true,
                source: data.source || 'unknown'
            };
        }

        // V3 format - return data as-is in fields
        return {
            instruction: '',
            fields: data,
            isV4: false,
            source: 'legacy'
        };
    }

    /**
     * Build refinement-ready context object (filtered by generation)
     * Supports v4 verbatim-first schema, 7-dimension v3 schema, and legacy 6-component schema
     * @param {Object} components - All components
     * @param {number|null} currentGeneration - Generation to filter by (null = include all)
     * @returns {Object}
     */
    _buildRefinementContext(components, currentGeneration = null) {
        const context = {};
        const staleComponents = [];
        const includedComponents = [];

        // Helper to track component status
        const trackComponent = (id, component, included) => {
            if (included) {
                includedComponents.push(id);
            } else if (component?.data) {
                staleComponents.push({
                    id,
                    generation: component.generation,
                    requiredGen: currentGeneration
                });
            }
        };

        // =====================================================================
        // 7-DIMENSION SCHEMA (supports v3 and v4 formats)
        // =====================================================================

        // PERSONA - Primary identity and role
        const personaComp = this._getComponent(components, 'persona');
        if (personaComp?.data) {
            includedComponents.push('persona');
            const v4 = this._extractV4Data(personaComp.data);
            if (v4.isV4) {
                // V4 format: use instruction as primary text
                context.persona = {
                    instruction: v4.instruction,
                    ...v4.fields
                };
            } else {
                // V3 format: use structured fields
                context.persona = {
                    role: v4.fields.role || v4.fields.synthesizedPersona || '',
                    purpose: v4.fields.purpose || v4.fields.primaryDomain || '',
                    name: v4.fields.name || v4.fields.personaName || null,
                    title: v4.fields.title || null,
                    credentials: v4.fields.credentials || null
                };
            }
        }

        // CONTEXT - Domain and knowledge
        const contextComp = this._getComponent(components, 'context');
        const contextIncluded = contextComp?.data &&
            this._isComponentCurrent(contextComp, currentGeneration);
        trackComponent('context', contextComp, contextIncluded);
        if (contextIncluded) {
            const v4 = this._extractV4Data(contextComp.data);
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

        // EXEMPLAR - Examples and edge cases
        const exemplarComp = this._getComponent(components, 'exemplar');
        if (exemplarComp?.data) {
            includedComponents.push('exemplar');
            const v4 = this._extractV4Data(exemplarComp.data);
            if (v4.isV4) {
                context.exemplar = {
                    instruction: v4.instruction
                };
            } else {
                context.exemplar = {
                    good_examples: v4.fields.good_examples || [],
                    bad_examples: v4.fields.bad_examples || [],
                    edge_cases: v4.fields.edge_cases || []
                };
            }
        }

        // FORMAT - Output structure
        const formatComp = this._getComponent(components, 'format');
        if (formatComp?.data) {
            includedComponents.push('format');
            const v4 = this._extractV4Data(formatComp.data);
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

        // TONE - Voice and style
        const toneComp = this._getComponent(components, 'tone');
        const toneIncluded = toneComp?.data &&
            this._isComponentCurrent(toneComp, currentGeneration);
        trackComponent('tone', toneComp, toneIncluded);
        if (toneIncluded) {
            const v4 = this._extractV4Data(toneComp.data);
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

        // FRAMEWORK - Methodology and workflow
        const frameworkComp = this._getComponent(components, 'framework');
        if (frameworkComp?.data) {
            includedComponents.push('framework');
            const v4 = this._extractV4Data(frameworkComp.data);
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

        // CONSTRAINTS - Rules and limits
        const constraintsComp = this._getComponent(components, 'constraints', 'custom_context');
        if (constraintsComp?.data) {
            includedComponents.push('constraints');
            const v4 = this._extractV4Data(constraintsComp.data);
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


        // Log context assembly results
        if (staleComponents.length > 0) {
            ctxLog('warn', 'Stale components excluded from refinement', {
                stale: staleComponents.map(s => `${s.id}(gen:${s.generation})`),
                currentGeneration,
                included: includedComponents
            });
        } else if (currentGeneration !== null) {
            ctxLog('debug', 'Context assembled (v4 compatible)', {
                currentGeneration,
                included: includedComponents,
                staleCount: 0
            });
        }

        return context;
    }

    /**
     * Format context for use in prompt refinement
     * Returns a structured string suitable for injection into refinement prompts
     * @returns {Promise<string>}
     */
    async formatForRefinement() {
        if (!this._cachedContext) {
            await this.assemble();
        }

        const ctx = this._cachedContext.refinementContext;

        if (!ctx || Object.keys(ctx).length === 0) {
            return '';
        }

        const sections = [];

        // PERSONA (primary identity - placed first)
        if (ctx.persona?.role) {
            let personaSection = `## Persona
- **Role**: ${ctx.persona.role}
- **Purpose**: ${ctx.persona.purpose || 'Not specified'}`;
            if (ctx.persona.name) personaSection += `\n- **Name**: ${ctx.persona.name}`;
            if (ctx.persona.title) personaSection += `\n- **Title**: ${ctx.persona.title}`;
            if (ctx.persona.credentials?.years_experience) {
                personaSection += `\n- **Experience**: ${ctx.persona.credentials.years_experience}`;
            }
            sections.push(personaSection);
        }

        // DOMAIN/CONTEXT
        if (ctx.domain) {
            let domainSection = `## Domain Context
- **Domain**: ${ctx.domain.domain || 'General'}`;
            if (ctx.domain.summary) domainSection += `\n- **Summary**: ${ctx.domain.summary}`;
            if (ctx.domain.keywords?.length) domainSection += `\n- **Keywords**: ${ctx.domain.keywords.join(', ')}`;
            if (ctx.domain.terminology?.length) {
                const terms = ctx.domain.terminology.slice(0, 5).map(t => t.term).join(', ');
                domainSection += `\n- **Key Terms**: ${terms}`;
            }
            sections.push(domainSection);
        }

        // TONE
        if (ctx.tone) {
            let toneSection = `## Tone & Style
- **Voice**: ${ctx.tone.voice || 'Professional'}
- **Style**: ${ctx.tone.style || 'professional'}
- **Verbosity**: ${typeof ctx.tone.verbosity === 'object' ? ctx.tone.verbosity.level : ctx.tone.verbosity}`;
            if (ctx.tone.verbosity?.max_length) toneSection += ` (${ctx.tone.verbosity.max_length})`;
            if (ctx.tone.banned_phrases?.length) {
                toneSection += `\n- **Avoid**: "${ctx.tone.banned_phrases.join('", "')}"`;
            }
            if (ctx.tone.technicalLevel) toneSection += `\n- **Technical Level**: ${ctx.tone.technicalLevel}`;
            sections.push(toneSection);
        }

        // FRAMEWORK
        if (ctx.framework?.methodology || ctx.framework?.workflow?.length) {
            let frameworkSection = '## Methodology';
            if (ctx.framework.methodology?.name) {
                frameworkSection += `\n- **Framework**: ${ctx.framework.methodology.name}`;
            }
            if (ctx.framework.workflow?.length) {
                const steps = ctx.framework.workflow.slice(0, 5).map(s => `${s.step}. ${s.action}`).join('\n  ');
                frameworkSection += `\n- **Workflow**:\n  ${steps}`;
            }
            if (ctx.framework.reasoning_pattern) {
                frameworkSection += `\n- **Reasoning**: ${ctx.framework.reasoning_pattern}`;
            }
            sections.push(frameworkSection);
        }

        // CONSTRAINTS
        if (ctx.constraints?.prohibitions?.length || ctx.constraints?.requirements?.length) {
            let constraintSection = '## Constraints';
            if (ctx.constraints.prohibitions?.length) {
                const rules = ctx.constraints.prohibitions.slice(0, 5).map(p =>
                    typeof p === 'object' ? p.rule : p
                ).join('\n  - NEVER: ');
                constraintSection += `\n- NEVER: ${rules}`;
            }
            if (ctx.constraints.requirements?.length) {
                const reqs = ctx.constraints.requirements.slice(0, 5).map(r =>
                    typeof r === 'object' ? r.rule : r
                ).join('\n  - MUST: ');
                constraintSection += `\n- MUST: ${reqs}`;
            }
            if (ctx.constraints.thresholds?.length) {
                const limits = ctx.constraints.thresholds.slice(0, 3).map(t =>
                    `${t.metric}: ${t.limit}`
                ).join(', ');
                constraintSection += `\n- **Limits**: ${limits}`;
            }
            sections.push(constraintSection);
        }

        // FORMAT
        if (ctx.format) {
            let formatSection = `## Output Format
- **Type**: ${ctx.format.output_type || 'markdown'}`;
            if (ctx.format.citations?.required) {
                formatSection += `\n- **Citations**: Required (${ctx.format.citations.format || 'standard'})`;
            }
            if (ctx.format.special_syntax?.length) {
                formatSection += `\n- **Special Syntax**: ${ctx.format.special_syntax.join(', ')}`;
            }
            sections.push(formatSection);
        }

        // EXEMPLAR (abbreviated)
        if (ctx.exemplar?.good_examples?.length) {
            sections.push(`## Examples Available
- ${ctx.exemplar.good_examples.length} good example(s)
- ${ctx.exemplar.bad_examples?.length || 0} anti-pattern(s)
- ${ctx.exemplar.edge_cases?.length || 0} edge case(s)`);
        }

        // RECENT CONTEXT (legacy)
        if (ctx.recentContext) {
            sections.push(`## Recent Focus
- **Current Topic**: ${ctx.recentContext.currentTopic}
- **Active Task**: ${ctx.recentContext.activeTask || 'None'}
- **Momentum**: ${ctx.recentContext.momentum || 'Neutral'}`);
        }

        // LEGACY: User Intent
        if (ctx.userIntent) {
            sections.push(`## User Intent
- **Type**: ${ctx.userIntent.type} (${Math.round(ctx.userIntent.confidence * 100)}% confidence)
- **Goal**: ${ctx.userIntent.goal}`);
        }

        return sections.join('\n\n');
    }

    /**
     * Get context as JSON object for programmatic use
     * @returns {Promise<Object>}
     */
    async getContextJSON() {
        if (!this._cachedContext) {
            await this.assemble();
        }
        return this._cachedContext.refinementContext;
    }

    /**
     * Check if any context is available
     * @returns {Promise<boolean>}
     */
    async hasContext() {
        return await this.memory.hasContext();
    }

    /**
     * Clear cached context (force re-assembly on next call)
     */
    clearCache() {
        this._cachedContext = null;
    }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.ContextAssembler = ContextAssembler;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContextAssembler };
}

console.log('[ContextAssembler] Loaded v3 - 7-dimension schema support with legacy compatibility');
