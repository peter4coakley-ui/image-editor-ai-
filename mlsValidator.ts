import { WorkflowConfig, EditPlan, WorkflowType, RiskLevel, ValidationResult, MaskMode } from './types';

/**
 * MLS Validator
 * Enforces strict rules for real estate compliance.
 */
export const validate = (config: WorkflowConfig, plan: EditPlan): ValidationResult => {
    const { type, isStrictMode, options } = config;
    const promptLower = plan.userPrompt.toLowerCase();

    const result: ValidationResult = {
        isAllowed: true,
        riskLevel: RiskLevel.LEGAL,
        warnings: []
    };

    // 1. STRICT MODE RULES
    if (isStrictMode) {
        // Absolute Bans
        const bannedKeywords = [
            "remove wall", "add window", "add door", "change view", 
            "remove fire hydrant", "remove power lines", "remove smoke detector",
            "add swimming pool", "remove neighbor"
        ];

        for (const word of bannedKeywords) {
            if (promptLower.includes(word)) {
                return {
                    isAllowed: false,
                    riskLevel: RiskLevel.ILLEGAL,
                    warnings: [`Strict Mode Violation: Request to "${word}" is not allowed.`],
                    reason: `Edits involving "${word}" alter material facts of the property.`
                };
            }
        }

        // Category Bans
        if ([
            WorkflowType.STAGING, 
            WorkflowType.STYLE_TRANSFER, 
            WorkflowType.EXTERIOR_SIDING, // Changing siding is a material fact change
            WorkflowType.BACKYARD_LANDSCAPING // Major landscaping is material
        ].includes(type)) {
            return {
                isAllowed: false,
                riskLevel: RiskLevel.ILLEGAL,
                warnings: ["Virtual Staging and Structural/Material changes are not allowed in Strict Compliance Mode."],
                reason: "This workflow alters the appearance or material facts of the property."
            };
        }

        // MASKING RULES
        if (type === WorkflowType.MASK_INPAINT) {
            if (options?.maskMode === MaskMode.REPLACE) {
                 return {
                    isAllowed: false,
                    riskLevel: RiskLevel.ILLEGAL,
                    warnings: ["Replacing objects with new ones is not allowed in strict mode."],
                    reason: "Insertion of new objects via masking is prohibited."
                 };
            }
            if (options?.maskMode === MaskMode.KEEP) {
                result.riskLevel = RiskLevel.RISKY;
                result.warnings.push("Using 'Keep Only' mode may accidentally remove permanent fixtures.");
            }
        }

        // Conditional Risks
        if (type === WorkflowType.SKY_REPLACEMENT) {
            result.riskLevel = RiskLevel.RISKY;
            result.warnings.push("Sky replacement must represent actual weather conditions possible at the location.");
        }

        if (type === WorkflowType.DECLUTTER || type === WorkflowType.PRO_CLEAN_SWEEP) {
            result.riskLevel = RiskLevel.RISKY;
            result.warnings.push("Ensure no permanent fixtures (smoke detectors, outlets) are removed.");
        }
    }

    // 2. GENERAL SAFETY RULES (Always active)
    if (promptLower.includes("person") || promptLower.includes("people") || promptLower.includes("face")) {
         // Note: Usually we remove people, but if the prompt asks to ADD people
         if (promptLower.includes("add person") || promptLower.includes("add people")) {
             result.riskLevel = RiskLevel.ILLEGAL;
             result.isAllowed = false;
             result.reason = "Adding people to real estate listings violates privacy and Fair Housing guidelines.";
         }
    }

    return result;
};
