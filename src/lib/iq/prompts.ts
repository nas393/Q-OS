/* Output contracts for AngolaIQ AI tasks. Every output carries facts / assumptions / inferences / confidence / limitations. */
const TRUST=`"facts":[string],"assumptions":[string],"inferences":[string],"confidence":"high|medium|low","limitations":[string]`;

export const DEVIL={
 task:"Act as Devil's Advocate. Stress-test the business idea below for the Angolan market. Challenge every weak assumption; do not agree to please. Never invent financial figures: when the user gave none, say what must be measured.",
 shape:`{"verdict":"REJECT|RECONSIDER|VALIDATE FURTHER|PROCEED WITH CONDITIONS|STRONG OPPORTUNITY","risk_score":1-10,"summary":string,
"market":[string],"financial":[string],"competitive":[string],"operational":[string],"regulatory":[string],
"scenarios":{"best":string,"base":string,"downside":string,"severe":string},
"critical_assumptions":[string],"evidence_gaps":[string],"invalidators":[string],"questions":[string],"mitigation":[string],"next_actions":[string],${TRUST}}`
};
export const DEVIL_REVIEW={
 task:"You are a second, independent reviewer. Challenge the FIRST ANALYSIS below: where is it too soft, too harsh, or unsupported? Then give your own verdict.",
 shape:`{"agree":true|false,"verdict":"REJECT|RECONSIDER|VALIDATE FURTHER|PROCEED WITH CONDITIONS|STRONG OPPORTUNITY","risk_score":1-10,"summary":string,"too_soft":[string],"too_harsh":[string],"unsupported":[string],"missed":[string],${TRUST}}`
};
export const BRIEFING={
 task:"Write today's executive intelligence briefing on Angola's commercial environment for an FMCG commercial director, using ONLY the evidence (recent headlines with sources, and stored indicators). Indicators are actual values with their year; never present a forecast as current. Every risk and opportunity must cite at least one headline [n] or indicator. Cite the headline index [n] for each development.",
 shape:`{"headline":string,"developments":[{"text":string,"ref":[number],"category":string}],"opportunities":[{"name":string,"sector":string,"geography":string,"evidence_ref":[number],"risk":"low|medium|high","next_action":string}],
"risks":[{"type":"currency|supply_chain|freight_port|commodity|regulatory|concentration|macro_political","level":"low|medium|high","why":string,"evidence_ref":[number]}],"actions":[string],${TRUST}}`
};
export const NEWS_ANALYSIS={
 task:"Analyse this news article for an Angolan FMCG/commercial reader. Summarise in 2-3 sentences. Extract only facts stated in the text. Classify business impact for Angola.",
 shape:`{"summary":string,"impact":"positive|negative|neutral|monitor","category":"economy|politics|oil_gas|agriculture|food|trade|finance|infrastructure|technology|logistics|construction|mining|retail|manufacturing|regulation","facts":[string],"implication":string,${TRUST}}`
};
export const SUGGEST={
 task:"Identify ONE concrete commercial opportunity in Angola for the inputs below. Ground it in the evidence where possible; mark everything else as assumption. No invented market sizes.",
 shape:`{"title":string,"executive_summary":string,"market_problem":string,"customer_segment":string,"market_evidence":[string],"commercial_rationale":string,"business_model":string,"revenue_drivers":[string],"cost_considerations":[string],"competitive_environment":string,"investment_requirements":string,"regulatory_considerations":[string],"operational_requirements":[string],"risks":[string],"validation_requirements":[string],"plan_90_days":[string],${TRUST}}`
};
export const CLUSTER={
 task:"Write a sector intelligence brief for the named sector in Angola. Separate measured facts (from evidence) from general knowledge and from inference. Name companies only if they are well known and real; otherwise say 'to be sourced'.",
 shape:`{"overview":string,"drivers":[string],"demand_indicators":[string],"supply_indicators":[string],"companies":[string],"regulatory":[string],"import_dependency":"low|medium|high|unknown","local_production":string,"risks":[string],"opportunities":[string],"growth":"low|medium|high","risk":"low|medium|high","opportunity_score":1-10,${TRUST}}`
};
export const COMPLIANCE={
 task:"Produce an informational regulatory checklist for starting/operating the business activity below in Angola. Name only authorities you are confident exist. Mark each item as 'legal_requirement' only if you are confident it is required by law, otherwise 'guidance'. Do not invent decree numbers or dates; say 'verify' instead.",
 shape:`{"authorities":[{"name":string,"role":string}],"items":[{"area":"licensing|documentation|customs|tax|standards|inspection|legal|labour","requirement":string,"type":"legal_requirement|guidance","verify":string}],"deadlines":[string],"official_sources_to_check":[string],${TRUST}}`
};
export const TRADE={
 task:"Interpret the trade observations below (UN Comtrade mirror data for Angola; the FLOW line says imports or exports). Explain concentration (suppliers for imports, buyers for exports) and risk. Use only the numbers given.",
 shape:`{"summary":string,"top_origins":[string],"concentration":"low|medium|high","risks":[string],"opportunities":[string],${TRUST}}`
};
