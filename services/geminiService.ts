
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { ClinicalRole, PlanType, ResearchResult, SearchResultItem, Language } from "../types";

// Always use a named parameter for the API key in the constructor.
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

/**
 * Deep Clinical Knowledge Base: Da Vinci Robotic Surgery & Complex Positioning
 * Derived from Intuitive Surgical's technical manuals and perioperative safety guidelines.
 */
const ROBOTIC_POSITIONING_KB = `
DEEP RESEARCH KNOWLEDGE BASE: DA VINCI Xi/X POSITIONING
1. PORT PLACEMENT & TRIANGULATION:
   - LINEAR ALIGNMENT: For robotic colopexy, a linear port placement is standard. For patients with 60° hip flexion, the "Knee Wall" obstructs the standard 20cm distance. Port sites must be shifted 2-4cm cephalad (towards the head) to avoid arm-thigh interference.
   - SPACING: Maintain 8cm (Xi) or 10cm (X/Si) minimum between ports to prevent external collision.
   - ASSISTANT PORT: Position at least 7cm from any robotic port, typically in the right upper quadrant (RUQ) for pelvic access.

2. DOCKING & BOOM DYNAMICS (Xi specific):
   - BOOM ROTATION: Utilize the 270° boom rotation to dock from a 45° angle (Side-Docking). This clears the "Knee Wall" created by flexed hips.
   - TARGET CENTERING: The "Green Laser" must align with the camera port while the boom is centered to ensure maximal range of motion in the pelvis.

3. ARM CONFIGURATION & CLEARANCE:
   - ELBOWS-UP (Flexion): Position robotic elbows in a high-flexion ("Elbows Up") configuration. This is critical when the patient's knees are significantly higher than the abdominal plane.
   - ARM 1 & 4 MANAGEMENT: These are the lateral-most arms. In patients with spinal deformities, ensure these arms are tucked to prevent collision with the bed rails or vacuum bean bag walls.

4. PERIOPERATIVE SAFETY & TRENDELENBURG:
   - BRACHIAL PLEXUS PROTECTION: Do NOT use shoulder braces in steep Trendelenburg (30°+). Use high-friction gel pads or molded vacuum bean bags (e.g., Pink Pad, Allen Hug-U-Vac) to prevent cephalad sliding.
   - "THE LAWN CHAIR": Maintain 15° of knee flexion (if possible) even with contractures to prevent femoral nerve stretch.
   - VACUUM BAG MOLDING: The bag must be molded "firm but not tight" around the patient's lateral torso to provide lateral stability during table tilt.
`;

const getRoleInstruction = (role: ClinicalRole): string => {
  switch (role) {
    case 'Anesthesiology': return "Focus on airway security for kyphotic spines (likely fiberoptic), peak inspiratory pressure monitoring in 30° Trendelenburg, and facial edema prevention. Advise on 'Pre-Oxygenation' in the flexed position.";
    case 'Robotic Tech': return "Focus on Da Vinci Xi boom orientation, side-docking at 45°, 'Elbows Up' arm configuration, and port-to-thigh clearance measurement (min 5cm).";
    case 'Perioperative Nurse': return "Focus on 'Building the table to the patient' using vacuum bags. Aggressive padding of spinous processes. Securement without shoulder blocks to avoid nerve injury.";
    default: return "Focus on surgical exposure (Trendelenburg bowel retraction), cephalad port shift calculation, and maximizing pelvic reach despite hip contractures.";
  }
};

const getPlanTypeInstruction = (type: PlanType): string => {
  switch (type) {
    case 'Positioning Diagram': return "Visual Style: Technical OR rendering. Patient in 'Lawn Chair' position on a vacuum bean bag. Robot docked from the side. Highlight arm-knee clearance.";
    case 'Robotic Port Map': return "Visual Style: Abdominal map with 'Port Shifting' arrows. Show 8cm measurements and camera-target axis.";
    case 'Room Layout': return "Visual Style: Overhead blueprint. Show robot, bed, anesthesia, and scrub nurse positions for side-docking.";
    case 'Pressure Point Map': return "Visual Style: Thermal-style map. Highlight spinous processes, sacrum, and heels. Show where extra gel padding is required.";
    default: return "Visual Style: Professional clinical illustration with high-contrast labels.";
  }
};

export const researchTopicForPrompt = async (
  topic: string, 
  role: ClinicalRole, 
  type: PlanType,
  language: Language,
  patientPhotosBase64?: string[]
): Promise<ResearchResult> => {
  
  const roleInstr = getRoleInstruction(role);
  const typeInstr = getPlanTypeInstruction(type);

  const promptParts: any[] = [
    { text: `
      You are a World-Class Surgical Robotics Consultant.
      Case: "${topic}" 
      Role Focus: ${role}
      Plan Type: ${type}
      Language: ${language}
      
      ${ROBOTIC_POSITIONING_KB}

      Requirements:
      1. CRITICAL ANALYSIS: If photos are provided, identify the exact degree of spinal curvature and hip flexion across all provided angles. Calculate the required 'Cephalad Port Shift' (usually 2-5cm).
      2. MULTI-PHASE GUIDE: Create a 6-step clinical protocol (Phase 1: Table Prep, Phase 2: Patient Molding, Phase 3: Anesthesia/Airway, Phase 4: Port Mapping, Phase 5: Robot Docking, Phase 6: Clearance Check).
      3. FOLLOW-UP QUESTIONS: Ask about specific Da Vinci model (Xi vs X), table weight limits, and availability of articulated stirrups.
      4. IMAGE PROMPT: Create a detailed prompt for a 3D surgical diagram. Be specific about robotic arm angles ("Elbows Up").
      
      ${roleInstr}
      ${typeInstr}
    `}
  ];

  if (patientPhotosBase64 && patientPhotosBase64.length > 0) {
    patientPhotosBase64.forEach(photo => {
      promptParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: photo.split(',')[1] || photo
        }
      });
    });
  }

  const response = await getAi().models.generateContent({
    model: TEXT_MODEL,
    contents: { parts: promptParts },
    config: { 
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          checkpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          multiStepGuide: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            } 
          },
          followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          imagePrompt: { type: Type.STRING }
        },
        required: ["summary", "checkpoints", "multiStepGuide", "followUpQuestions", "imagePrompt"]
      }
    },
  });

  // response.text is a property, not a method.
  const result = JSON.parse(response.text || "{}");
  
  const searchResults: SearchResultItem[] = [];
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (chunks) {
    chunks.forEach(chunk => {
      if (chunk.web?.uri && chunk.web?.title) {
        searchResults.push({ title: chunk.web.title, url: chunk.web.uri });
      }
    });
  }

  return {
    ...result,
    searchResults: Array.from(new Map(searchResults.map(item => [item.url, item])).values())
  };
};

export const generateInfographicImage = async (prompt: string): Promise<string> => {
  const response = await getAi().models.generateContent({
    model: IMAGE_MODEL,
    contents: { parts: [{ text: `Clinical high-fidelity Da Vinci surgical rendering: ${prompt}. Focus on 'Elbows Up' robotic arm configuration, OR bed with vacuum bean bag, professional sterile aesthetic, 4K resolution.` }] },
    config: { 
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
    }
  });

  const candidates = response.candidates || [];
  if (candidates.length === 0) throw new Error("No candidates returned from simulation.");
  
  // For image generation with nano banana series, find the part with inlineData.
  const parts = candidates[0].content?.parts || [];
  const part = parts.find(p => p.inlineData);
  
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Simulation failed to render visual.");
};

export const editInfographicImage = async (currentImageBase64: string, editInstruction: string): Promise<string> => {
  if (!currentImageBase64) throw new Error("No source image provided for modification.");
  
  const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  const response = await getAi().models.generateContent({
    model: IMAGE_MODEL,
    contents: {
      parts: [
         { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
         { text: `Modify this surgical schematic: ${editInstruction}. Maintain strict adherence to Da Vinci Xi robotic arm dimensions and anatomical positioning rules.` }
      ]
    },
    config: { 
      imageConfig: { aspectRatio: '1:1', imageSize: '1K' }
    }
  });
  
  const candidates = response.candidates || [];
  if (candidates.length === 0) throw new Error("No candidates returned from modification.");

  // For image generation with nano banana series, find the part with inlineData.
  const parts = candidates[0].content?.parts || [];
  const part = parts.find(p => p.inlineData);
  
  if (part?.inlineData?.data) {
    return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Modification failed.");
};
