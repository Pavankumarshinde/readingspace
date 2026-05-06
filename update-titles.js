const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // We only target <h2, <h3, <h4, <h5 classes.
  // Example: <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
  // We want to replace any text-lg, text-xl, text-2xl, text-3xl with text-base
  // And any font-bold, font-black, font-extrabold with font-medium
  
  // To avoid breaking page titles, we only want to target specific files or we just accept that some page titles might also get reduced if they used these exact combinations.
  // Wait, the user said: "Containers title make them smaller(font size) than Page title. Do this across the app"
  // Let's do a smart regex: replace inside <h2... or <h3... or <h4...
  
  content = content.replace(/<(h[2-5])[^>]*className=["']([^"']*)["'][^>]*>/g, (match, tag, classes) => {
    // If it's the main page title (h1), we don't touch it.
    // Replace font sizes with text-base
    let newClasses = classes.replace(/\b(text-lg|text-xl|text-2xl|text-3xl|md:text-2xl|md:text-3xl)\b/g, '').replace(/  +/g, ' ');
    if (!newClasses.includes('text-base')) {
        newClasses += ' text-base';
    }
    
    // Replace font weights with font-medium
    newClasses = newClasses.replace(/\b(font-bold|font-black|font-extrabold|font-semibold)\b/g, '').replace(/  +/g, ' ');
    if (!newClasses.includes('font-medium')) {
        newClasses += ' font-medium';
    }
    
    // Clean up spaces
    newClasses = newClasses.trim();
    
    return match.replace(classes, newClasses);
  });

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    changed++;
    console.log('Updated:', f);
  }
});

console.log('Total files updated:', changed);
