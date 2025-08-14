import { BATCH_SIZE } from '../constants.js';

/**
 * Process issues in batches to avoid overwhelming Gemini API
 * @param {Array} issues - Issues to process
 * @param {Function} processor - Async function to process each batch
 * @returns {Array} Combined results from all batches
 */
export async function processBatches(issues, processor) {
  const results = [];
  
  for (let i = 0; i < issues.length; i += BATCH_SIZE) {
    const batch = issues.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(issues.length / BATCH_SIZE);
    
    console.log(`\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} issues)...`);
    
    try {
      const batchResult = await processor(batch, batchNumber);
      results.push(...batchResult);
      
      console.log(`✅ Batch ${batchNumber} completed`);
    } catch (error) {
      console.error(`❌ Error processing batch ${batchNumber}:`, error.message);
      // Continue with other batches even if one fails
      results.push(...batch); // Add unchanged issues
    }
  }
  
  return results;
}
