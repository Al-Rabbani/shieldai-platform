import { base44 } from "@/api/base44Client";

export async function invokeAction(functionName, payload) {
  const res = await base44.functions.invoke(functionName, payload);
  return res.data;
}