import {getDb} from "@/lib/db";
import {ensureSchema} from "@/lib/schema";

/* AngolaIQ schema (iq_* tables in the NASSIM OS database). Additive only: CREATE IF NOT EXISTS, never drops. */
export async function iqDb(){await ensureSchema();return getDb();}

export const SECTORS=["Oil and Gas","Agriculture","Food and Beverages","Manufacturing","Retail and FMCG","Banking and Finance","Construction","Infrastructure","Logistics and Ports","Mining","Telecommunications","Technology","Healthcare","Tourism","Education","Energy","Imports and Distribution"];
export const NEWS_CATEGORIES=["economy","politics","oil_gas","agriculture","food","trade","finance","infrastructure","technology","logistics","construction","mining","retail","manufacturing","regulation"] as const;
export const PROVINCES=["Luanda","Benguela","Huambo","Huíla","Namibe","Cabinda","Uíge","Malanje","Bengo","Bié","Cuanza Norte","Cuanza Sul","Cunene","Lunda Norte","Lunda Sul","Moxico","Cuando Cubango","Zaire"];
