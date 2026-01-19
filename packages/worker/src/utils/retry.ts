export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = 3
): Promise<Response> {
  if (maxRetries < 1 || maxRetries > 10) {
    maxRetries = 3
  }
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return response
      }

      const isRetryable = response.status >= 500 || response.status === 429 || response.status === 408
      
      if (!isRetryable) {
        throw new Error(`API request failed with non-retryable status: ${response.status}`)
      }

      if (attempt < maxRetries - 1) {
        const delay = response.status === 429 
          ? Math.pow(2, attempt + 1) * 1000
          : Math.pow(2, attempt) * 1000
        console.warn(`API request failed (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        throw new Error(`API request failed after ${maxRetries} attempts: ${response.status}`)
      }
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.warn(`Fetch error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries}):`, error instanceof Error ? error.message : String(error))
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} retries`)
}

