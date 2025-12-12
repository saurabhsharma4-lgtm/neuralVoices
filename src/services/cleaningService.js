// Data Cleaning Service using OpenAI GPT-4o-mini
// Cleans transcription by removing filler words, fixing duplicates, etc.

const cleanTranscription = async (transcriptionText) => {
  try {
    const apiKey = process.env.REACT_APP_LLM_API_KEY;
    const cleaningModel = process.env.REACT_APP_CLEANING_MODEL || 'openai/gpt-5-mini';
    if (!apiKey) {
      throw new Error('Missing API key for cleaning service');
    }

    if (!transcriptionText || typeof transcriptionText !== 'string') {
      return transcriptionText;
    }

    const cleaningPrompt = `You are an expert call-transcript cleaner specializing in customer service conversations between Agent and Seller.

CLEANING TASKS (do all of these):
1. Remove ALL filler words: hmm, uh, um, अरे यार, अच्छा, तो, etc.
2. Remove duplicate/repeated lines and phrases
3. Remove incomplete sentences that don't make sense
4. Combine broken Hindi-English mixed sentences into complete, coherent sentences
5. Fix obvious grammar errors while keeping original meaning
6. Remove unnecessary word repetitions within sentences
7. Make sentences complete and grammatically correct
8. Ensure proper spacing and formatting

SPEAKER LABELS (CRITICAL):
- Keep speaker labels EXACTLY: "Agent:" and "Seller:" 
- If you see "Speaker 1:", "Speaker 2:", "Speaker 3" - convert them to "Agent:" or "Seller:" based on context
- First speaker is usually "Agent:" (customer service)
- Second speaker is usually "Seller:" (customer/client)
- Do NOT create more than 2 speakers
- Do NOT change speaker labels randomly
- Preserve the exact format: "Agent: " or "Seller: "

QUALITY REQUIREMENTS:
- Output must be clean, professional, and readable
- Remove all filler words completely
- Fix all broken sentences
- Combine all mixed Hindi-English properly
- Keep all meaningful information
- Maintain conversation flow
- Make it sound natural

Return ONLY the cleaned transcript. No explanations, no notes, just the cleaned transcript with Agent/Seller labels.

Transcript to clean:
${transcriptionText}`;

    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key is missing or empty. Please check your .env file.');
    }

    // Use custom chat API URL if provided, otherwise use OpenAI's default
    const apiUrl = "https://imllm.intermesh.net/v1/chat/completions";
    
    
    if (!apiUrl || apiUrl === 'undefined') {
      throw new Error('Chat API URL is not configured. Please set REACT_APP_LLM_API_URL_CHAT in .env file or it will default to OpenAI.');
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: cleaningModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert call transcript cleaner for customer service calls. Your job is to: 1) Remove ALL filler words (hmm, uh, अरे यार), 2) Remove duplicates, 3) Fix broken sentences, 4) Combine Hindi-English properly, 5) Keep only Agent and Seller labels (convert Speaker 1/2/3 to Agent/Seller), 6) Make it clean and professional. Always preserve all meaningful content and never change the conversation meaning.'
          },
          {
            role: 'user',
            content: cleaningPrompt
          }
        ],
        temperature: 0.2, // Lower temperature for more consistent and precise cleaning
        max_tokens: 8000 // Increased for longer transcripts
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
      
      // Provide more helpful error messages
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid OpenAI API key. Please check your REACT_APP_LLM_API_KEY in .env file. Make sure it starts with "sk-" and is valid.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error(`Bad request: ${errorData.error?.message || errorData.message || 'Invalid request format. Check if the model name is correct.'}`);
      }
      
      throw new Error(errorData.error?.message || errorData.message || `Cleaning API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract cleaned text from response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }
    
    throw new Error('Unexpected response format from cleaning API');
  } catch (error) {
    throw error;
  }
};

export { cleanTranscription };

