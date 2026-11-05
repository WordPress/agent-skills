import fs from 'fs';
import { parse } from '@wordpress/block-serialization-default-parser';

// Retrieve the file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('Error: Please provide a path to the markup file.');
  console.error('Usage: node scripts/validate-markup.mjs <file-path>');
  process.exit(1);
}

try {
  // Read the raw markup string from the file
  const rawContent = fs.readFileSync(filePath, 'utf8');

  // Parse the markup using the official isomorphic WordPress parser
  const parsedTree = parse(rawContent);

  // Guard against empty files or files containing only whitespace
  const hasValidBlocks = parsedTree.some(block => block.blockName !== null);
  if (parsedTree.length === 0 || (parsedTree.length === 1 && parsedTree[0].innerHTML.trim() === '' && !hasValidBlocks)) {
    console.error('\x1b[31m[Validation Error] The file contains no valid Gutenberg blocks or is completely empty.\x1b[0m');
    process.exit(1);
  }

  let hasErrors = false;

  // Validate the parsed block tree
  parsedTree.forEach((block, index) => {
    // If blockName is null but there is innerHTML, the parser failed to recognize it as a valid block comment
    if (block.blockName === null && block.innerHTML.trim() !== '') {
      hasErrors = true;
      console.error(`\x1b[31m[Validation Error] Block index ${index}: Malformed block syntax.\x1b[0m`);
      console.error(`Check for unclosed comments, trailing spaces before '-->', or improperly quoted JSON keys.`);
      console.error(JSON.stringify(block, null, 2));
    }
  });

  // Output the final evaluation result
  if (hasErrors) {
    console.error('\n\x1b[31mStatus: FAILED. Please fix the markup errors above and re-run.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32mStatus: PASSED. Cleanly structured block tree object.\x1b[0m\n');
    console.log(JSON.stringify(parsedTree, null, 2));
  }

} catch (error) {
  console.error('Execution Failed:', error.message);
  process.exit(1);
}