import { GoogleGenAI } from "@google/genai";
import { Session } from "../types.js";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY environment variable is not defined or is placeholder. Using rule-based fallback summary generation.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Generate rule-based fallback behavior summary if Gemini key is missing
function generateRuleBasedSummary(session: Session): string {
  const actions = session.logs.map(l => l.action.toLowerCase());
  const details = session.logs.map(l => l.details.toLowerCase());

  let targetInterest = "General Reconnaissance";
  let sophistication = "Novice / Script Kiddie";
  let targetAssets: string[] = [];

  // Sophistication triggers
  const rapidClickLogs = session.logs.filter(l => l.details.includes("Rapid automated navigation"));
  if (rapidClickLogs.length > 2) {
    sophistication = "Intermediate / Automated Script Runner";
  }

  // Target Assets detection
  if (actions.some(a => a.includes("ssh") || a.includes("terminal") || a.includes("command"))) {
    targetAssets.push("System shell access, private keys, command execution");
    targetInterest = "System Penetration / Command and Control";
  }
  if (actions.some(a => a.includes("reveal vault") || a.includes("copied key") || details.some(d => d.includes("reveal")))) {
    targetAssets.push("AWS keys, database passwords, API credentials");
    if (targetInterest === "General Reconnaissance") targetInterest = "Credential Harvesting";
  }
  if (actions.some(a => a.includes("viewed document") || details.some(d => d.includes("csv") || d.includes("pdf")))) {
    targetAssets.push("Corporate acquisitions, Customer PII, infrastructure blueprints");
    if (targetInterest === "General Reconnaissance") targetInterest = "Data Exfiltration";
  }

  const triggeredRules = [];
  if (session.failedAttempts >= 3) triggeredRules.push(`Brute Force Login (${session.failedAttempts} failed attempts)`);
  if (rapidClickLogs.length > 0) triggeredRules.push("Automated/Scripted Request Timing");
  if (actions.some(a => a.includes("terminal"))) triggeredRules.push("Terminal Shell Exploration");

  return `### 🕵️ RULE-BASED ATTACKER INTENT SUMMARY (API Key Fallback)

This session was automatically evaluated using the local threat analysis engine.

*   **Determined Intent Category**: ${targetInterest}
*   **Estimated Attacker Sophistication**: **${sophistication}**
*   **Identified Targets**:
    ${targetAssets.length > 0 ? targetAssets.map(t => `- ${t}`).join('\n    ') : '- Broad exploratory scouting / scanning'}
*   **Triggered Adaptive Rules**:
    ${triggeredRules.length > 0 ? triggeredRules.map(r => `- ${r}`).join('\n    ') : '- Silent redirect based on suspicious credential list'}

#### 📝 Behavioral Timeline Analysis:
The actor connected from IP \`${session.ip}\` using user agent \`${session.userAgent}\`. After entering ${session.failedAttempts} failed passwords, the Adaptive Policy Engine rerouted them into the Shadow Service. Once inside, the actor performed ${session.logs.length - 1} distinct post-auth actions. The primary sequence suggests high interest in **${targetAssets[0] || 'accessing files and exploring system limits'}**.

#### 🛡️ Suggested Mitigation Steps for Real Environment:
1.  **Enforce Multi-Factor Authentication (MFA)** on all corporate accounts, especially targeting username \`${session.username}\`.
2.  **Audit System Access Logs** for IP \`${session.ip}\` to ensure they did not successfully connect to real endpoints prior to deceptive environment routing.
3.  **Rotate credentials** matching any variables named in the deception console that the attacker attempted to expose.`;
}

export async function generateAttackerSummary(session: Session): Promise<string> {
  const client = getGeminiClient();
  if (!client) {
    return generateRuleBasedSummary(session);
  }

  const timelineFormatted = session.logs.map(l => {
    return `[${new Date(l.timestamp).toLocaleTimeString()}] Action: "${l.action}" - Details: "${l.details}" (Threat Score Contribution: +${l.threatPoints})`;
  }).join("\n");

  const prompt = `
Analyze the behavioral logs of an attacker session inside a Zero-Trust Shadow Deception environment. Write a highly professional, comprehensive "Attacker Deception Intelligence & Intent Report".

### SESSION DETAILS
- Session ID: ${session.id}
- Attacker Username/Target Identity: ${session.username}
- Source IP: ${session.ip}
- User Agent: ${session.userAgent}
- Failed Login Count Before Rerouting: ${session.failedAttempts}
- Total Deception Threat Score: ${session.threatScore}/100

### SYSTEM TIMELINE OF ACTIONS
${timelineFormatted}

Please provide your analysis strictly structured in Markdown with the following elegant headers:
1. **🕵️ SUMMARY OF INTENT & TACTICS**: Give a 2-3 sentence high-level overview of what this attacker is attempting to accomplish and their general behavior.
2. **🛡️ ESTIMATED SOPHISTICATION LEVEL**: Assess whether they are a script-kiddie, automated scanner, standard credentials-stuffer, or advanced persistent threat (APT), with reasoning.
3. **🔑 TARGETED ASSETS & EXPOSURES**: Bulleted list of fake assets (e.g. CSV backups, private SSH keys, cloud terminal commands, DB passwords) they attempted to read or extract, and what this tells us about their goals.
4. **⚠️ HIGH RISK BEHAVIORS DETECTED**: Note if they triggered rapid navigation algorithms, out-of-sequence secret views, or database dumps.
5. **🔥 IMMEDIATE COUNTERMEASURES**: Provide 3 concrete, realistic security actions we should apply to our *real* production systems based on this actor's target profiles and source parameters.

Be crisp, technical, highly analytical, and professional. Write in the voice of a Lead Zero-Trust Security Incident Analyst.
`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an advanced, elite Security Incident Analysis AI for Zero Trust Deception Infrastructures.",
        temperature: 0.2,
      }
    });

    if (response.text) {
      return response.text;
    } else {
      return "Unable to parse response from Gemini API. Falling back to rule-based analysis:\n\n" + generateRuleBasedSummary(session);
    }
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    return `### ⚠️ Gemini AI Generation Error
An error occurred while generating the report via the Gemini API: ${error.message || error}.

Here is the system fallback report:

${generateRuleBasedSummary(session)}`;
  }
}
