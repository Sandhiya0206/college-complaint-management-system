const fs = require('fs');
const zlib = require('zlib');

const data = fs.readFileSync('C:/Users/DELL/Downloads/REVIEW III (BATCH 11).pdf');

const allText = [];
let pos = 0;

while (pos < data.length) {
  // Find "stream\r\n" or "stream\n"
  let streamStart = -1;
  let headerEnd = -1;
  
  for (let i = pos; i < data.length - 10; i++) {
    if (data[i] === 0x73 && data.slice(i, i+6).toString() === 'stream') {
      if (data[i+6] === 0x0D && data[i+7] === 0x0A) {
        streamStart = i + 8;
        headerEnd = i;
      } else if (data[i+6] === 0x0A) {
        streamStart = i + 7;
        headerEnd = i;
      }
      if (streamStart !== -1) break;
    }
  }
  
  if (streamStart === -1) break;
  
  // Find endstream
  let endStream = -1;
  for (let i = streamStart; i < data.length - 9; i++) {
    if (data.slice(i, i+9).toString() === 'endstream') {
      endStream = i;
      break;
    }
  }
  
  if (endStream === -1) break;
  
  pos = endStream + 9; // advance before processing

  // Check header for FlateDecode
  const headerStart = Math.max(0, headerEnd - 300);
  const header = data.slice(headerStart, headerEnd).toString('binary');
  
  if (header.includes('FlateDecode')) {
    const compressed = data.slice(streamStart, endStream);
    try {
      const decompressed = zlib.inflateSync(compressed).toString('utf8');
      allText.push(decompressed);
    } catch (e) {
      try {
        const decompressed = zlib.inflateRawSync(compressed).toString('utf8');
        allText.push(decompressed);
      } catch (e2) {}
    }
  }
  
  pos = endStream + 9;
}

// Extract text from BT/ET blocks
const combined = allText.join('\n');
const blocks = combined.match(/BT[\s\S]*?ET/g) || [];
const words = [];

blocks.forEach(block => {
  // Match (text) Tj or [(text)] TJ patterns
  const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g) || [];
  const tjArr = block.match(/\[([^\]]*)\]\s*TJ/g) || [];
  
  [...tjMatches, ...tjArr].forEach(m => {
    const cleaned = m.replace(/\([^)]*\)\s*Tj|\[|\]\s*TJ/g, '').replace(/\(|\)/g, '').trim();
    if (/[a-zA-Z]{2,}/.test(m)) {
      const inner = m.match(/\(([^)]+)\)/g);
      if (inner) inner.forEach(i => {
        const t = i.replace(/[()]/g, '').trim();
        if (t.length > 1) words.push(t);
      });
    }
  });
});

fs.writeFileSync('C:/Users/DELL/OneDrive/Desktop/Divyesh/pdfSlides.txt', words.join('\n'), 'utf8');
console.log('Extracted', words.length, 'text segments');
console.log('First 100:');
console.log(words.slice(0, 100).join(' | '));
