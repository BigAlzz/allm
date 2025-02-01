// Import fetch for Node.js < 18
import fetch from 'node-fetch';
global.fetch = fetch;

import { runConnectionTests } from './ChatConnection.test.js';

async function main() {
  console.log('=== LM Studio Connection Test Suite ===\n');
  
  try {
    const success = await runConnectionTests();
    if (success) {
      console.log('\n=== All tests completed successfully ===');
      process.exit(0);
    } else {
      console.log('\n=== Tests failed ===');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n=== Tests failed with error ===');
    console.error(error);
    process.exit(1);
  }
}

main(); 