export type QNewsStream = "Angola" | "Lebanon" | "Global";

export type GdeltArticle = {
  title?: string;
  url?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
};

export const Q_NEWS_STREAMS: Record<QNewsStream, { sourceId: string; sourceName: string; query: string }> = {
  Angola: {
    sourceId: "qnews_gdelt_angola",
    sourceName: "GDELT · Angola",
    query: 'Angola AND (business OR economy OR trade OR oil OR agriculture OR politics OR inflation)'
  },
  Lebanon: {
    sourceId: "qnews_gdelt_lebanon",
    sourceName: "GDELT · Lebanon",
    query: 'Lebanon AND (business OR economy OR trade OR banking OR energy OR politics OR security)'
  },
  Global: {
    sourceId: "qnews_gdelt_global",
    sourceName: "GDELT · Global",
    query: '("global economy" OR geopolitics OR commodities OR "central bank" OR oil OR wheat OR rice OR sugar OR technology)'
  }
};

export function parseGdeltDate(value?: string): string | null {
  if (!value || !/^\d{8}T\d{6}Z$/.test(value)) return null;
  const normalized = value.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z"
  );
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function classifyNewsCategory(title: string): string {
  const value = title.toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["security", /\b(security|military|attack|strike|war|conflict|terror|defence|defense|missile|ceasefire|hostage)\b/],
    ["geopolitics", /\b(geopolitic|sanction|diplomacy|treaty|summit|border dispute)\b/],
    ["oil_gas", /\b(oil|gas|petroleum|opec|lng|crude)\b/],
    ["agriculture", /\b(agriculture|farmer|harvest|crop|maize|corn|wheat|rice|sugar|soybean)\b/],
    ["finance", /\b(bank|banking|inflation|currency|forex|interest rate|debt|bond|stock market)\b/],
    ["trade", /\b(import|export|trade|tariff|customs|shipment|supply chain)\b/],
    ["politics", /\b(election|president|parliament|government|minister|policy|political)\b/],
    ["technology", /\b(technology|artificial intelligence|ai|software|cyber|semiconductor)\b/],
    ["infrastructure", /\b(port|railway|road|airport|infrastructure|construction|power grid)\b/],
    ["economy", /\b(economy|economic|gdp|growth|business|company|industry|market)\b/]
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] ?? "general";
}

export function normalizeNewsTitle(title: string): string {
  return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 240);
}

export function validArticleUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
