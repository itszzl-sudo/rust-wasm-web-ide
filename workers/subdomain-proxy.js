export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    const targets = [
      'https://rust-wasm-web-ide.pages.dev',
      'https://itszzl-sudo.github.io/rust-wasm-web-ide'
    ]
    
    for (const target of targets) {
      try {
        const targetUrl = target + url.pathname + url.search
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow'
        })
        
        if (response.ok || response.status === 304) {
          const newResponse = new Response(response.body, response)
          newResponse.headers.set('Access-Control-Allow-Origin', '*')
          newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
          newResponse.headers.set('Access-Control-Allow-Headers', '*')
          return newResponse
        }
      } catch (e) {
        console.error(`Failed to fetch from ${target}:`, e.message)
      }
    }
    
    return new Response('Service Unavailable', { status: 503 })
  }
}
