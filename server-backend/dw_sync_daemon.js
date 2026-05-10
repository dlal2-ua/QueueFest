const { exec } = require('child_process');

console.log('Starting DW Sync Daemon (1 second interval)...');

// This script continuously calls migrate_oltp_to_dw.js every 1 second
function runSync() {
  const start = Date.now();
  // Using MYSQL_PORT=3306 as we are inside the Oracle VM
  exec('MYSQL_HOST=10.0.0.5 MYSQL_PORT=3306 node migrate_oltp_to_dw.js', { cwd: __dirname }, (error, stdout, stderr) => {
    const elapsed = Date.now() - start;
    if (error) {
      console.error(`[ERROR] Sync failed at ${new Date().toISOString()} (took ${elapsed}ms): ${error.message}`);
    } else {
      console.log(`[OK] Sync completed at ${new Date().toISOString()} (took ${elapsed}ms)`);
    }
    
    // Calculate timeout to maintain ~1 second cadence, or immediate if it took > 1s
    const nextTimeout = Math.max(0, 1000 - elapsed);
    setTimeout(runSync, nextTimeout);
  });
}

runSync();
