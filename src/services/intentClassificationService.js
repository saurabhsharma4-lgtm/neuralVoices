// Intent Classification Service
// Classifies intents for each turn in agent-seller conversations

const classifyIntents = async (transcriptionText) => {
  try {
    const apiKey = process.env.REACT_APP_LLM_API_KEY;
    const classificationModel = process.env.REACT_APP_CLASSIFICATION_MODEL || 'openai/gpt-4.1-mini';

    if (!apiKey) {
      throw new Error('Missing API key for intent classification service');
    }

    if (!transcriptionText || typeof transcriptionText !== 'string') {
      throw new Error('Transcription text is required for intent classification');
    }

    const classificationPrompt = `You are an Intent Classification Engine for call center conversations between:

- AGENT (IndiaMART executive)
- SELLER (IndiaMART seller/customer)

Your task:
Given a cleaned and diarized transcript, classify the INTENT of every user (seller) and agent turn.

Rules:
1. Identify ONLY meaningful intents (not filler).
2. Each line must contain:
   - speaker_role (agent or seller)
   - intent_name
   - short explanation (optional)
3. Output STRICT JSON array.

List of standard intents:
- greeting
- ask_human_or_ai
- report_issue
- ask_why_calls_not_received
- provide_account_id
- request_registered_number
- request_gst
- deny_company_presence
- explain_company_requirement
- ask_for_supervisor
- express_confusion
- provide_company_details
- escalation_threat
- clarification
- confirm
- complaint
- ask_for_reason
- ask_for_solution

If no intent matches, use "other".

OUTPUT FORMAT:
[
  {
    "speaker": "agent" | "seller",
    "utterance": "...original sentence...",
    "intent": "intent_name",
    "confidence": 0.0-1.0
  }
]

Do NOT include anything else except the JSON. No explanations, no markdown, just pure JSON array.

Transcript to classify:
${transcriptionText}`;

    const apiUrl = process.env.REACT_APP_LLM_API_URL_CHAT || "https://imllm.intermesh.net/v1/chat/completions";

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: classificationModel,
        messages: [
          {
            role: 'system',
            content: 'You are an Intent Classification Engine for IndiaMART call center conversations. You output ONLY valid JSON arrays with intent classifications. Never include explanations, markdown, or any text outside the JSON array.'
          },
          {
            role: 'user',
            content: classificationPrompt
          }
        ],
        temperature: 0.1 // Very low temperature for consistent classification
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `API error: ${response.status}` };
      }
      
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid API key for intent classification.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(errorData.error?.message || errorData.message || `Intent classification API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract classification result
    let classificationText = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      classificationText = data.choices[0].message.content.trim();
    } else {
      throw new Error('Unexpected response format from intent classification API');
    }

    // Try to parse JSON from response
    // Sometimes the model wraps JSON in markdown code blocks
    let classificationData;
    try {
      // Remove markdown code blocks if present
      const cleanedText = classificationText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      classificationData = JSON.parse(cleanedText);
      
      // If response is wrapped in an object, extract the array
      if (classificationData.intents && Array.isArray(classificationData.intents)) {
        return classificationData.intents;
      }
      if (Array.isArray(classificationData)) {
        return classificationData;
      }
      if (classificationData.classifications && Array.isArray(classificationData.classifications)) {
        return classificationData.classifications;
      }
      
      return classificationData;
    } catch (parseError) {
      // If parsing fails, try to extract JSON array from text
      const jsonMatch = classificationText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Failed to parse intent classification JSON. Response: ' + classificationText.substring(0, 200));
        }
      }
      throw new Error('Invalid JSON response from intent classification. Response: ' + classificationText.substring(0, 200));
    }
  } catch (error) {
    throw error;
  }
};

export { classifyIntents };

