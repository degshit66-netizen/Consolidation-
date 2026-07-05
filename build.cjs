const { execSync } = require('child_process');

console.log("Running vite build...");
execSync("npx vite build", { stdio: 'inherit' });

if (process.env.VERCEL) {
  console.log("Skipping server build on Vercel (using Vercel Serverless Functions instead).");
} else {
  console.log("Running esbuild for server...");
  execSync("npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs", { stdio: 'inherit' });
}
