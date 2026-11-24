import {z} from "zod";
export const MEMORY_CATEGORIES=["working_preference","strategic_objective","operating_context","decision","commitment","lesson","project_context"] as const;
export const memoryInputSchema=z.object({category:z.enum(MEMORY_CATEGORIES),text:z.string().trim().min(3).max(2000),confidence:z.number().min(0).max(1).default(1),expiresAt:z.string().datetime().nullable().optional(),supersedesId:z.string().uuid().optional()});
export function normalizeMemoryText(v:unknown):string{if(typeof v==="string")return v.trim().slice(0,2000);if(v&&typeof v==="object"&&"text" in v&&typeof (v as {text?:unknown}).text==="string")return (v as {text:string}).text.trim().slice(0,2000);return "";}

export function memoryTerms(text:string):string[]{return [...new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word=>[...word].length>=3))].slice(0,6);}
