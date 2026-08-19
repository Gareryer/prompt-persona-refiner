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
     * Pinned components are always considered current
     * @param {Object} component - Component data
     * @param {number|null} requiredGeneration - Generation to filter by (null = include all)
     * @returns {boolean}
     */
    _isComponentCurrent(component, requiredGeneration) {
        if (requiredGeneration === null) return true;
        if (component?.pinned) return true;
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
     * Extract active component data, respecting pinnedData if present
     * @param {Object} component - Component object
     * @returns {Object|null}
     */
    _getComponentData(component) {
        if (!component) return null;
        if (component.pinned && component.pinnedData) {
            return component.pinnedData;
        }
        return component.current || component.data || (typeof component === 'object' && (component.instruction || component.role || component.domain) ? component : null);
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
    _buildRefinementContext(components, currentGeneration = null, disabledFacts = {}) {
        const context = {};
        const staleComponents = [];
        const includedComponents = [];

        const isFactDisabled = (dim) => {
            return disabledFacts[`component.${dim}`] === true || disabledFacts[dim] === true;
        };

        // Helper to track component status
        const trackComponent = (id, component, data, included) => {
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

        // =====================================================================
        // 7-DIMENSION SCHEMA (supports v3 and v4 formats)
        // =====================================================================

        // PERSONA - Primary identity and role
        const personaComp = this._getComponent(components, 'persona', 'persona_synthesizer');
        const personaData = this._getComponentData(personaComp);
        const personaIncluded = !isFactDisabled('persona') && !!personaData &&
            this._isComponentCurrent(personaComp, currentGeneration);
        trackComponent('persona', personaComp, personaData, personaIncluded);
        if (personaIncluded) {
            const v4 = this._extractV4Data(personaData);
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

        // EXEMPLAR - Examples and edge cases
        const exemplarComp = this._getComponent(components, 'exemplar');
        const exemplarData = this._getComponentData(exemplarComp);
        const exemplarIncluded = !isFactDisabled('exemplar') && !!exemplarData &&
            this._isComponentCurrent(exemplarComp, currentGeneration);
        trackComponent('exemplar', exemplarComp, exemplarData, exemplarIncluded);
        if (exemplarIncluded) {
            const v4 = this._extractV4Data(exemplarData);
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

        // TONE - Voice and style
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

        // FRAMEWORK - Methodology and workflow
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

        // CONSTRAINTS - Rules and limits
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

        // RECENT FOCUS (legacy support)
        const recentFocusComp = this._getComponent(components, 'recent_focus');
        const recentFocusData = this._getComponentData(recentFocusComp);
        if (recentFocusData && !isFactDisabled('recent_focus')) {
            context.recentFocus = recentFocusData;
        }

        // Log stale components warning if any exist
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

        const ctx = this._cachedContext?.refinementContext;

        if (!ctx || Object.keys(ctx).length === 0) {
            return '';
        }

        const sections = [];

        // PERSONA (primary identity - placed first)
        if (ctx.persona?.instruction) {
            sections.push(`## 🎭 PERSONA (EMBODY THIS EXPERT)\n${ctx.persona.instruction}`);
        } else if (ctx.persona?.role) {
            let personaSection = `## 🎭 PERSONA (EMBODY THIS EXPERT)\n- **Role**: ${ctx.persona.role}\n- **Purpose**: ${ctx.persona.purpose || 'Not specified'}`;
            if (ctx.persona.name) personaSection += `\n- **Name**: ${ctx.persona.name}`;
            if (ctx.persona.title) personaSection += `\n- **Title**: ${ctx.persona.title}`;
            if (ctx.persona.credentials?.years_experience) {
                personaSection += `\n- **Experience**: ${ctx.persona.credentials.years_experience}`;
            }
            sections.push(personaSection);
        }

        // DOMAIN/CONTEXT
        if (ctx.domain?.instruction) {
            const domain = ctx.domain.domain || 'General';
            const scopeTags = ctx.domain.scope_tags || [];
            sections.push(`## 🌐 DOMAIN & SCOPE\n- **Domain**: ${domain}\n- **Scope**: ${scopeTags.join(', ') || 'General'}\n- **Expertise**: ${ctx.domain.instruction}`);
        } else if (ctx.domain) {
            let domainSection = `## 🌐 DOMAIN & SCOPE\n- **Domain**: ${ctx.domain.domain || 'General'}`;
            if (ctx.domain.summary) domainSection += `\n- **Summary**: ${ctx.domain.summary}`;
            if (ctx.domain.keywords?.length) domainSection += `\n- **Keywords**: ${ctx.domain.keywords.join(', ')}`;
            if (ctx.domain.terminology?.length) {
                const terms = ctx.domain.terminology.slice(0, 5).map(t => t.term).join(', ');
                domainSection += `\n- **Key Terms**: ${terms}`;
            }
            sections.push(domainSection);
        }

        // TONE
        if (ctx.tone?.instruction) {
            const styleTags = ctx.tone.style_tags || [];
            let toneSection = `## 🎨 TONE & STYLE\n- **Voice**: ${ctx.tone.instruction}\n- **Style Tags**: ${styleTags.join(', ') || 'Professional'}`;
            if (ctx.tone.banned_phrases?.length) {
                toneSection += `\n- **AVOID**: "${ctx.tone.banned_phrases.join('", "')}"`;
            }
            sections.push(toneSection);
        } else if (ctx.tone) {
            let toneSection = `## 🎨 TONE & STYLE\n- **Voice**: ${ctx.tone.voice || 'Professional'}\n- **Style**: ${ctx.tone.style || 'professional'}\n- **Verbosity**: ${typeof ctx.tone.verbosity === 'object' ? ctx.tone.verbosity.level : ctx.tone.verbosity}`;
            if (ctx.tone.verbosity?.max_length) toneSection += ` (${ctx.tone.verbosity.max_length})`;
            if (ctx.tone.banned_phrases?.length) {
                toneSection += `\n- **AVOID**: "${ctx.tone.banned_phrases.join('", "')}"`;
            }
            if (ctx.tone.technicalLevel) toneSection += `\n- **Technical Level**: ${ctx.tone.technicalLevel}`;
            sections.push(toneSection);
        }

        // FRAMEWORK
        if (ctx.framework?.instruction) {
            const reasoningType = ctx.framework.reasoning_type || 'Step-by-Step';
            sections.push(`## 🔧 METHODOLOGY\n- **Reasoning Approach**: ${reasoningType}\n- **Methodology**: ${ctx.framework.instruction}`);
        } else if (ctx.framework?.methodology || ctx.framework?.workflow?.length) {
            let frameworkSection = '## 🔧 METHODOLOGY';
            if (ctx.framework.methodology?.name) {
                frameworkSection += `\n- **Framework**: ${ctx.framework.methodology.name}`;
            }
            if (ctx.framework.workflow?.length) {
                const steps = ctx.framework.workflow.slice(0, 5).map(s => `${s.step}. ${s.action}`).join('\n  ');
                frameworkSection += `\n- **Workflow**:\n  ${steps}`;
            }
            if (ctx.framework.reasoning_pattern) {
                frameworkSection += `\n- **Reasoning Approach**: ${ctx.framework.reasoning_pattern}`;
            }
            sections.push(frameworkSection);
        }

        // CONSTRAINTS
        if (ctx.constraints?.instruction || ctx.constraints?.prohibitions?.length || ctx.constraints?.requirements?.length) {
            let constraintSection = '## ⚠️ CONSTRAINTS';
            if (ctx.constraints.requirements?.length) {
                const reqs = ctx.constraints.requirements.map(r => typeof r === 'object' ? r.rule : r).join('; ');
                constraintSection += `\n- **MUST**: ${reqs}`;
            }
            if (ctx.constraints.prohibitions?.length) {
                const rules = ctx.constraints.prohibitions.map(p => typeof p === 'object' ? p.rule : p).join('; ');
                constraintSection += `\n- **NEVER**: ${rules}`;
            }
            if (ctx.constraints.response_length) {
                constraintSection += `\n- **Response Length**: ${ctx.constraints.response_length}`;
            }
            if (ctx.constraints.instruction) {
                constraintSection += `\n- **Notes**: ${ctx.constraints.instruction}`;
            }
            sections.push(constraintSection);
        }

        // FORMAT
        if (ctx.format?.instruction) {
            const outputType = ctx.format.output_type || 'Markdown';
            sections.push(`## 📋 OUTPUT FORMAT\n- **Type**: ${outputType}\n- **Structure**: ${ctx.format.instruction}`);
        } else if (ctx.format) {
            let formatSection = `## 📋 OUTPUT FORMAT\n- **Type**: ${ctx.format.output_type || 'markdown'}`;
            if (ctx.format.citations?.required) {
                formatSection += `\n- **Citations**: Required (${ctx.format.citations.format || 'standard'})`;
            }
            if (ctx.format.special_syntax?.length) {
                formatSection += `\n- **Special Syntax**: ${ctx.format.special_syntax.join(', ')}`;
            }
            sections.push(formatSection);
        }

        // EXEMPLAR
        if (ctx.exemplar?.instruction) {
            sections.push(`## 📚 EXEMPLAR PATTERNS\n${ctx.exemplar.instruction}`);
        } else if (ctx.exemplar?.good_examples?.length) {
            sections.push(`## 📚 EXEMPLAR PATTERNS\n- ${ctx.exemplar.good_examples.length} good example(s)\n- ${ctx.exemplar.bad_examples?.length || 0} anti-pattern(s)\n- ${ctx.exemplar.edge_cases?.length || 0} edge case(s)`);
        }

        // RECENT FOCUS
        if (ctx.recentFocus) {
            let recentSection = `## 🎯 CURRENT FOCUS\n- **Working On**: ${ctx.recentFocus.currentTopic || ctx.recentFocus.currentFocus || 'General task'}\n- **Active Task**: ${ctx.recentFocus.activeTask || 'None specified'}\n- **Momentum**: ${typeof ctx.recentFocus.momentum === 'object' ? ctx.recentFocus.momentum.direction : ctx.recentFocus.momentum || 'Steady'}`;
            if (ctx.recentFocus.openItems?.length) {
                recentSection += `\n- **Open Items**: ${ctx.recentFocus.openItems.join(', ')}`;
            }
            sections.push(recentSection);
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
