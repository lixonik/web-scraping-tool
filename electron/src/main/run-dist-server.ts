import http               from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path               from 'node:path'
import { join }           from 'path'

export async function runDistServer(port: number, dev: boolean) {
  const root = join(__dirname, '..', '..', 'resources')

  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }

  const server = http.createServer(async (req, res) => {
    console.log('++++++++++++ req', req.url);
    // if (req.url?.includes('run-playwright')) {
    //   await runPlaywright();
    //   res.end('ok');
    //   return;
    // }

    if (dev) {
      res.end('ok');
      return;
    }


    try {
      const decodedUrl = decodeURIComponent(req!.url!)
      let filePath = path.join(root, decodedUrl)
      const fileStat = await stat(filePath)

      if (fileStat.isDirectory()) {
        filePath = path.join(filePath, 'index.html')
      }

      const ext = path.extname(filePath)
      const type = MIME[ext] || 'application/octet-stream'

      const data = await readFile(filePath)
      res.writeHead(200, {
        'Content-Type': type,
        'Access-control-allow-origin': '*',
        'Access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-control-allow-headers': '*',
        'Access-control-allow-credentials': 'true'
      })
      res.end(data)
    } catch {
      res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'})
      res.end('Not found')
    }
  })

  server.listen(port, () => {
    console.log(`Static server running at http://localhost:${port}`)
  })
}
