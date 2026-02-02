import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname);

// Definite paths
const sourceDir = path.resolve(projectRoot, 'node_modules/@imgly/background-removal/dist');
const destDir = path.resolve(projectRoot, 'public/assets');

console.log(`Copying assets from ${sourceDir} to ${destDir}...`);

if (!fs.existsSync(sourceDir)) {
    console.error('Source directory not found. Did you run npm install?');
    // Try deeper path just in case
    process.exit(1);
}

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// Copy generic function
function copyDir(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) fs.mkdirSync(destPath);
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            // console.log(`Copied ${entry.name}`);
        }
    }
}

try {
    copyDir(sourceDir, destDir);
    console.log('Assets copied successfully!');
} catch (error) {
    console.error('Error copying assets:', error);
}
