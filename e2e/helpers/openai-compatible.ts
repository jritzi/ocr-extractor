export const OPENAI_COMPATIBLE_URL =
  "http://localhost:11434/v1/chat/completions";

export function openAiCompatibleSuccessResponse(text: string) {
  return {
    choices: [{ message: { role: "assistant", content: text } }],
  };
}
