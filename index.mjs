import { streamText } from 'ai'

const apiKey = process.env.AI_GATEWAY_API_KEY

if (!apiKey) {
  console.error('Error: AI_GATEWAY_API_KEY environment variable is not set')
  process.exit(1)
}

const result = streamText({
  model: 'openai/gpt-5.5',
  prompt: 'Explain quantum computing in simple terms.',
  apiKey,
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}
