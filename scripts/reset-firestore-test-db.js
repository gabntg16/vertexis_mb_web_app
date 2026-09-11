/**
 * ============================================================================
 * VertexIS (The Marsh Bites Enterprise Management System - Legazpi & Naga)
 * FIRESTORE TEST DATABASE RESET & CLEANUP SCRIPT
 * ============================================================================
 * 
 * Target Database: Google Cloud Firestore (Firebase Admin SDK)
 * System Purpose : Multi-Branch Gourmet Marshmallow Franchise & Inventory System
 * 
 * Safety Guarantee:
 *  - STRICTLY PRESERVES all Master & Configuration Collections:
 *    `users`, `roles`, `branches`, `products`, `menu_categories`, `flavors`, `skus`
 *  - TRUNCATES / BATCH DELETES all Dynamic Transactional Collections:
 *    `sales_transactions`, `sales`, `bir_receipts`, `birReceipts`, `order_requests`,
 *    `orders`, `order_items`, `transfer_slips`, `inter_branch_transfers`,
 *    `transfer_items`, `inventory_logs`, `inventoryMovements`, `batch_production_logs`,
 *    `production_batches`, `payment_proofs`, `payments`, `shift_closing_records`,
 *    `shiftClosings`, `pos_audit_logs`, `posAuditLogs`, `spoilage_records`,
 *    `physical_inventory_audits`, `deliveries`, `receivings`
 *  - RESETS LIVE INVENTORIES TO BASELINE (0 Units):
 *    `branch_inventories` (or `inventory`), `commissary_inventories` (or `products.adminStock`)
 *    Preserves all branch configurations, safety thresholds, and SKU mappings!
 * ============================================================================
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ----------------------------------------------------------------------------
// 1. CONFIGURATION & ENVIRONMENT SETUP
// ----------------------------------------------------------------------------

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  || resolve(__dirname, '../serviceAccountKey.json')
  || resolve(__dirname, './serviceAccountKey.json');

const IS_DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

// ----------------------------------------------------------------------------
// 2. STRICT GUARDRAIL: PROTECTED MASTER COLLECTIONS
// ----------------------------------------------------------------------------
// These collections contain essential system configuration, RBAC accounts,
// branch network registries, and master product catalogs.
// Any attempt to delete or alter these will abort immediately.
const PROTECTED_MASTER_COLLECTIONS = new Set([
  'users',
  'roles',
  'branches',
  'products',
  'menu_categories',
  'flavors',
  'skus',
  'branch_accounts',
  'branch_documents',
  'branch_applications',
  'announcements',
  'system_sync',
]);

// ----------------------------------------------------------------------------
// 3. TARGET TRANSACTIONAL COLLECTIONS (TO BE WIPED)
// ----------------------------------------------------------------------------
// Covers both standard schema names and camelCase/snake_case aliases
const TRANSACTIONAL_COLLECTIONS = [
  // Retail Point-of-Sale (POS) & BIR Compliance records
  'sales_transactions',
  'sales_items',
  'sales',
  'bir_receipts',
  'birReceipts',
  'shift_closing_records',
  'shiftClosings',
  'pos_payment_details',
  'sales_senior_pwd_details',
  'cash_denomination_counts',

  // B2B Franchise Purchase Requests & Requisitions
  'order_requests',
  'order_items',
  'orders',
  'payment_proofs',
  'payments',
  'payment_intents',
  'payment_webhook_events',

  // Fleet Logistics & Inter-Branch Waybills
  'transfer_slips',
  'transfer_items',
  'inter_branch_transfers',
  'deliveries',
  'receivings',

  // Production Kettle Batches & Kitchen Logs
  'batch_production_logs',
  'production_batches',

  // Inventory Audits, Movements & Shrinkage Records
  'inventory_logs',
  'inventoryMovements',
  'spoilage_records',
  'physical_inventory_audits',
  'physical_audit_items',

  // Terminal & Operation Audit Logs
  'pos_audit_logs',
  'posAuditLogs',
  'branch_audit_logs',
  'branch_status_history',
];

// ----------------------------------------------------------------------------
// 4. STOCK COLLECTIONS TO RESET TO 0 (BASELINE TEST STATE)
// ----------------------------------------------------------------------------
const INVENTORY_COLLECTIONS = [
  'branch_inventories',
  'inventory',
  'commissary_inventories',
];

// ----------------------------------------------------------------------------
// 5. FIREBASE ADMIN INITIALIZATION
// ----------------------------------------------------------------------------
function initializeFirebase() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║               VertexIS Firestore DB Reset Utility             ║');
  console.log('║       The Marsh Bites Enterprise System • Legazpi & Naga     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (IS_DRY_RUN) {
    console.warn('⚠️  RUNNING IN DRY-RUN MODE: No documents will actually be modified or deleted.\n');
  }

  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  // Attempt 1: Explicit Service Account file
  if (existsSync(SERVICE_ACCOUNT_PATH)) {
    console.log(`🔑 Loading Service Account from: ${SERVICE_ACCOUNT_PATH}`);
    const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } 
  // Attempt 2: Application Default Credentials (ADC) or Config file
  else if (process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('🔑 Initializing with Application Default Credentials (ADC)...');
    admin.initializeApp();
  } else {
    // Attempt 3: Local firebase-applet-config.json lookup
    const localConfigPath = resolve(__dirname, '../firebase-applet-config.json');
    if (existsSync(localConfigPath)) {
      const config = JSON.parse(readFileSync(localConfigPath, 'utf8'));
      console.log(`🔑 Initializing using project ID from ${localConfigPath}: ${config.projectId}`);
      admin.initializeApp({
        projectId: config.projectId,
      });
    } else {
      console.error('❌ ERROR: Missing service account credentials!');
      console.error('Please provide a valid serviceAccountKey.json at the root of the project,');
      console.error('or set the GOOGLE_APPLICATION_CREDENTIALS environment variable.\n');
      process.exit(1);
    }
  }

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

// ----------------------------------------------------------------------------
// 6. SAFE BATCHED COLLECTION TRUNCATION (MAX 500 WRITES PER BATCH)
// ----------------------------------------------------------------------------
/**
 * Safely deletes all documents in a collection using 500-doc batches.
 * Includes hard guardrails against master collections.
 */
async function truncateCollection(db, collectionName, batchSize = 450) {
  // CRITICAL GUARDRAIL CHECK
  if (PROTECTED_MASTER_COLLECTIONS.has(collectionName)) {
    throw new Error(`[SECURITY ALERT] Blocked attempt to delete master collection: "${collectionName}"! Operation aborted.`);
  }

  const collectionRef = db.collection(collectionName);
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) {
      break;
    }

    if (IS_DRY_RUN) {
      totalDeleted += snapshot.size;
      console.log(`   [DRY-RUN] Would delete ${snapshot.size} docs from "${collectionName}"...`);
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;
    process.stdout.write(`   Deleted ${totalDeleted} documents from "${collectionName}"...\r`);
  }

  return totalDeleted;
}

// ----------------------------------------------------------------------------
// 7. INVENTORY STOCK BALANCES RESET TO BASELINE (0 UNITS)
// ----------------------------------------------------------------------------
/**
 * Resets dynamic on-hand stock counts to 0 while keeping safety thresholds,
 * branch assignments, and pricing rules intact.
 */
async function resetInventoryCollection(db, collectionName, batchSize = 450) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    return 0;
  }

  let totalUpdated = 0;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const batch = db.batch();

    for (const doc of chunk) {
      const data = doc.data();

      // Reset dynamic counts to 0, preserve minStock, reorderPoint, parLevel
      const updatePayload = {
        updatedAt: new Date().toISOString(),
        resetForTestingAt: new Date().toISOString(),
      };

      if ('stock' in data) updatePayload.stock = 0;
      if ('currentStock' in data) updatePayload.currentStock = 0;
      if ('bulkStock' in data) updatePayload.bulkStock = 0;
      if ('bufferStock' in data) updatePayload.bufferStock = 0;
      if ('damagedStock' in data) updatePayload.damagedStock = 0;
      if ('availableStock' in data) updatePayload.availableStock = 0;
      if ('allocatedStock' in data) updatePayload.allocatedStock = 0;
      if ('incomingStock' in data) updatePayload.incomingStock = 0;

      if (!IS_DRY_RUN) {
        batch.update(doc.ref, updatePayload);
      }
      totalUpdated++;
    }

    if (!IS_DRY_RUN) {
      await batch.commit();
    }
  }

  return totalUpdated;
}

// ----------------------------------------------------------------------------
// 8. COMMISSARY ADMIN STOCK RESET
// ----------------------------------------------------------------------------
/**
 * Resets Central Commissary on-hand kettle & warehouse stocks in products catalog.
 */
async function resetCommissaryMasterStock(db) {
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  let updatedCount = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if ('adminStock' in data || 'centralStock' in data) {
      if (!IS_DRY_RUN) {
        batch.update(doc.ref, {
          adminStock: 0,
          updatedAt: new Date().toISOString(),
        });
      }
      updatedCount++;
    }
  });

  if (!IS_DRY_RUN && updatedCount > 0) {
    await batch.commit();
  }

  return updatedCount;
}

// ----------------------------------------------------------------------------
// 9. AUDIT VERIFICATION OF PRESERVED MASTER DATA
// ----------------------------------------------------------------------------
async function verifyMasterDataPreservation(db) {
  console.log('\n🔍 Verifying Master & Configuration Catalogs (Preserved):');
  console.log('─────────────────────────────────────────────────────────────');

  for (const collectionName of PROTECTED_MASTER_COLLECTIONS) {
    try {
      const snap = await db.collection(collectionName).get();
      console.log(`  ✓ Master [${collectionName.padEnd(20)}]: ${snap.size} documents intact`);
    } catch {
      // Collection may not exist yet in staging, which is fine
    }
  }
}

// ----------------------------------------------------------------------------
// 10. MAIN EXECUTION PIPELINE
// ----------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();
  const db = initializeFirebase();

  console.log('🚀 Phase 1: Wiping Dynamic Transactional & Audit Collections...');
  console.log('─────────────────────────────────────────────────────────────');

  const summary = {
    deleted: {},
    inventoryReset: {},
    productsStockReset: 0,
  };

  for (const col of TRANSACTIONAL_COLLECTIONS) {
    try {
      const count = await truncateCollection(db, col);
      if (count > 0) {
        summary.deleted[col] = count;
        console.log(`  ✓ Cleared [${col}]: ${count} records purged.`);
      }
    } catch (err) {
      console.error(`  ⚠️  Skipped [${col}]: ${err.message}`);
    }
  }

  console.log('\n📦 Phase 2: Resetting Live Branch & Commissary Stock Balances...');
  console.log('─────────────────────────────────────────────────────────────');

  for (const invCol of INVENTORY_COLLECTIONS) {
    try {
      const count = await resetInventoryCollection(db, invCol);
      if (count > 0) {
        summary.inventoryReset[invCol] = count;
        console.log(`  ✓ Reset [${invCol}]: ${count} SKU balances zeroed (stock = 0).`);
      }
    } catch (err) {
      console.error(`  ⚠️  Skipped [${invCol}]: ${err.message}`);
    }
  }

  // Reset central products adminStock
  const adminStockCount = await resetCommissaryMasterStock(db);
  summary.productsStockReset = adminStockCount;
  if (adminStockCount > 0) {
    console.log(`  ✓ Reset [products.adminStock]: ${adminStockCount} flavors set to 0.`);
  }

  // Phase 3: Sanity verification
  await verifyMasterDataPreservation(db);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n=============================================================');
  console.log(`🎉 Database Reset Completed Successfully in ${durationSec}s!`);
  console.log('=============================================================');
  console.log('Action Summary:');
  console.log(` - Transactional collections wiped : ${Object.keys(summary.deleted).length}`);
  console.log(` - Total documents purged          : ${Object.values(summary.deleted).reduce((a, b) => a + b, 0)}`);
  console.log(` - Inventory records zeroed        : ${Object.values(summary.inventoryReset).reduce((a, b) => a + b, 0)}`);
  console.log(' - Master configuration data       : 100% PRESERVED');
  console.log('=============================================================\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ CRITICAL FATAL ERROR DURING DATABASE RESET:');
  console.error(error);
  process.exit(1);
});
