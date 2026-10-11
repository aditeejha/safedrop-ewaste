export const config = {
  region: process.env.AWS_REGION ?? 'ap-south-1',
  table: process.env.TABLE_NAME ?? '',
  photoBucket: process.env.PHOTO_BUCKET ?? '',
  userPoolId: process.env.USER_POOL_ID ?? '',
  userPoolClientId: process.env.USER_POOL_CLIENT_ID ?? '',
  bedrockModelId: process.env.BEDROCK_MODEL_ID ?? 'apac.amazon.nova-lite-v1:0',
  geminiModels: (process.env.GEMINI_MODELS ?? 'gemini-3.5-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-flash-latest')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 40),
}
