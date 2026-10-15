import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  let https;
  if (mode === 'https') {
    const certificate = path.resolve('.certs/local.pem');
    const privateKey = path.resolve('.certs/local-key.pem');
    if (!fs.existsSync(certificate) || !fs.existsSync(privateKey)) {
      throw new Error('HTTPS 인증서가 없습니다. README의 휴대폰 로컬 연결 절차에 따라 .certs/local.pem과 .certs/local-key.pem을 만든 뒤 다시 실행하세요.');
    }
    https = { cert: fs.readFileSync(certificate), key: fs.readFileSync(privateKey) };
  }
  return {
    base: './',
    server: { host: '127.0.0.1', port: 5173, strictPort: true, https },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  };
});
