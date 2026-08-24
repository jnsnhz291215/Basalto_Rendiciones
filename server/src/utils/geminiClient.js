'use strict'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const DEFAULT_FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-1.5-flash']

const MODELOS_NO_SOPORTADOS = new Set([
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-latest'
])

function isGeminiEnabled() {
  const raw = String(process.env.GEMINI_ENABLED || '1').trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'off' || raw === 'no') return false
  return true
}

function getGeminiApiKey() {
  return String(process.env.GEMINI_API_KEY || '').trim()
}

function getGeminiModel() {
  return String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL
}

function getGeminiFallbackModels() {
  const raw = String(process.env.GEMINI_MODEL_FALLBACKS || '').trim()
  if (!raw) return []
  return raw
    .split(',')
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function getGeminiModelCandidates() {
  const ordered = [
    getGeminiModel(),
    ...getGeminiFallbackModels(),
    ...DEFAULT_FALLBACK_MODELS
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((model) => !MODELOS_NO_SOPORTADOS.has(model.toLowerCase()))
  return Array.from(new Set(ordered))
}

function createGeminiClient() {
  if (!isGeminiEnabled()) {
    const err = new Error('El procesamiento con IA está deshabilitado (GEMINI_ENABLED=0).')
    err.code = 'GEMINI_DISABLED'
    throw err
  }
  let GoogleGenAI
  try {
    ;({ GoogleGenAI } = require('@google/genai'))
  } catch (_error) {
    throw new Error('Falta instalar @google/genai en el servidor.')
  }
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada.')
  }
  return new GoogleGenAI({ apiKey })
}

async function extractJsonTextFromResponse(response) {
  if (!response) return ''
  if (typeof response.text === 'string') return response.text.trim()
  if (typeof response.text === 'function') {
    const maybe = await response.text()
    return String(maybe || '').trim()
  }
  if (Array.isArray(response.candidates) && response.candidates.length > 0) {
    const parts = response.candidates[0]?.content?.parts || []
    const textPart = parts.find((part) => typeof part?.text === 'string')
    return String(textPart?.text || '').trim()
  }
  return ''
}

function parseStrictJson(raw) {
  const text = String(raw || '').trim()
  if (!text) throw new Error('La IA no devolvió contenido JSON.')
  try {
    return JSON.parse(text)
  } catch (_error) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) return JSON.parse(fenced[1].trim())
    throw new Error('La IA devolvió un formato inválido (no JSON).')
  }
}

function parseGeminiError(error) {
  const rawMessage = String(error?.message || '').trim()
  if (!rawMessage) return { code: '', status: '', message: '' }
  try {
    const parsed = JSON.parse(rawMessage)
    if (parsed && typeof parsed === 'object') {
      return {
        code: String(parsed.code || parsed.error?.code || '').trim(),
        status: String(parsed.status || parsed.error?.status || '')
          .trim()
          .toUpperCase(),
        message: String(parsed.message || parsed.error?.message || rawMessage).trim()
      }
    }
  } catch (_error) {
    /* mensaje plano */
  }
  return { code: '', status: '', message: rawMessage }
}

function getGeminiTimeoutMs() {
  const n = Number(process.env.GEMINI_TIMEOUT_MS || 20000)
  return Number.isFinite(n) && n >= 5000 ? n : 20000
}

function getGeminiTotalTimeoutMs() {
  const n = Number(process.env.GEMINI_TOTAL_TIMEOUT_MS || 45000)
  return Number.isFinite(n) && n >= 8000 ? n : 45000
}

function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(message)
      err.code = 'GEMINI_TIMEOUT'
      reject(err)
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function shouldTryNextModel(error) {
  if (error?.code === 'GEMINI_TIMEOUT') return true
  const info = parseGeminiError(error)
  const code = Number(info.code || 0)
  const status = String(info.status || '').toUpperCase()
  const msg = String(info.message || '').toLowerCase()
  if (code === 503 || code === 429) return true
  if (status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED' || status === 'NOT_FOUND') {
    return true
  }
  if (msg.includes('high demand') || msg.includes('try again later') || msg.includes('resource exhausted')) {
    return true
  }
  if (msg.includes('model') && (msg.includes('not found') || msg.includes('not available'))) {
    return true
  }
  return false
}

/**
 * Envía un documento (base64) a Gemini y espera JSON.
 */
async function procesarDocumentoConGemini({ base64Data, mimeType, prompt }) {
  const ai = createGeminiClient()
  const modelCandidates = getGeminiModelCandidates()
  const perModelMs = getGeminiTimeoutMs()
  const totalMs = getGeminiTotalTimeoutMs()
  const started = Date.now()
  let lastError = null

  for (let i = 0; i < modelCandidates.length; i += 1) {
    const remaining = totalMs - (Date.now() - started)
    if (remaining < 3000) {
      const err = new Error(
        'La verificación con IA tardó demasiado. Prueba con una foto más liviana o reintenta.'
      )
      err.code = 'GEMINI_TIMEOUT'
      throw err
    }
    const model = modelCandidates[i]
    const budget = Math.min(perModelMs, remaining)
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: String(prompt || '') },
                {
                  inlineData: {
                    data: String(base64Data || ''),
                    mimeType: String(mimeType || 'application/octet-stream')
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        }),
        budget,
        'La verificación con IA tardó demasiado. Prueba con una foto más liviana o reintenta.'
      )
      const rawText = await extractJsonTextFromResponse(response)
      const parsed = parseStrictJson(rawText)
      return { parsed, modelUsed: model }
    } catch (error) {
      lastError = error
      const hasNext = i < modelCandidates.length - 1
      const leftover = totalMs - (Date.now() - started)
      if (!hasNext || leftover < 3000 || !shouldTryNextModel(error)) throw error
    }
  }

  if (lastError) throw lastError
  throw new Error('No se pudo procesar el documento con ningún modelo de IA.')
}

module.exports = {
  isGeminiEnabled,
  getGeminiModel,
  procesarDocumentoConGemini
}
