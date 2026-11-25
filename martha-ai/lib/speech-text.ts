// Clean model text before it is spoken by the browser's speech synthesis.
export function toSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_`#>|]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/₹\s?(\d+(?:\.\d+)?)\s?L\b/g, "$1 lakh rupees")
    .replace(/₹\s?/g, "rupees ")
    .replace(/(\d)\s?km\b/gi, "$1 kilometres")
    .replace(/(\d)\s?kWh\b/g, "$1 kilowatt hours")
    .replace(/(\d)\s?kW\b/g, "$1 kilowatt")
    .replace(/\bEV\b/g, "E V")
    .replace(/\bEMI\b/g, "E M I")
    .replace(/\s+/g, " ")
    .trim();
}
