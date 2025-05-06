import { setupApp } from './app.js';

async function main() {
  const app = await setupApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`API REST escuchando en http://localhost:${port}`);
  });
}

main().catch(err => {
  console.error('Error arrancando servidor:', err);
  process.exit(1);
});
