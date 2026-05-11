const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function parseArgs(argv) {
  const args = {
    execute: false,
    organizationId: null,
    clientId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--execute') {
      args.execute = true;
      continue;
    }
    if (token === '--organizationId') {
      args.organizationId = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (token === '--clientId') {
      args.clientId = argv[i + 1] || null;
      i += 1;
    }
  }

  return args;
}

function buildPool() {
  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
}

async function fetchDuplicateClients(pg, { organizationId, clientId }) {
  const filters = [];
  const params = [];

  if (organizationId) {
    params.push(organizationId);
    filters.push(`f.organization_id = $${params.length}`);
  }

  if (clientId) {
    params.push(clientId);
    filters.push(`f.client_id = $${params.length}`);
  }

  const whereClause = filters.length ? `where ${filters.join(' and ')}` : '';
  const sql = `
    select
      f.organization_id as "organizationId",
      f.client_id as "clientId",
      c.code as "clientCode",
      count(*)::int as "rootCount"
    from folders f
    join clients c on c.id = f.client_id
    ${whereClause}
      ${whereClause ? 'and' : 'where'} f.parent_folder_id is null
      and f.deleted_at is null
    group by f.organization_id, f.client_id, c.code
    having count(*) > 1
    order by count(*) desc, c.code asc
  `;

  const { rows } = await pg.query(sql, params);
  return rows;
}

async function fetchRootStats(pg, organizationId, clientId) {
  const sql = `
    with recursive roots as (
      select
        id as root_id,
        name as root_name,
        created_at as root_created_at
      from folders
      where organization_id = $1
        and client_id = $2
        and parent_folder_id is null
        and deleted_at is null
    ),
    tree as (
      select
        r.root_id,
        r.root_name,
        r.root_created_at,
        r.root_id as folder_id
      from roots r
      union all
      select
        t.root_id,
        t.root_name,
        t.root_created_at,
        c.id as folder_id
      from tree t
      join folders c on c.parent_folder_id = t.folder_id
      where c.deleted_at is null
    )
    select
      tree.root_id as "rootId",
      min(tree.root_name) as "rootName",
      min(tree.root_created_at) as "rootCreatedAt",
      count(distinct tree.folder_id)::int as "folderCount",
      count(distinct d.id)::int as "documentCount"
    from tree
    left join documents d on d.folder_id = tree.folder_id and d.deleted_at is null
    group by tree.root_id
    order by "documentCount" desc, "rootCreatedAt" asc, "rootId" asc
  `;

  const { rows } = await pg.query(sql, [organizationId, clientId]);
  return rows;
}

async function cleanupClient(pg, clientRecord) {
  const roots = await fetchRootStats(pg, clientRecord.organizationId, clientRecord.clientId);
  if (roots.length <= 1) {
    return {
      status: 'skipped',
      reason: 'No duplicate roots found after refresh',
      deletedRoots: 0,
      deletedFolders: 0,
      keptRootId: roots[0]?.rootId || null,
    };
  }

  const rootsWithDocs = roots.filter((root) => Number(root.documentCount) > 0);
  if (rootsWithDocs.length > 1) {
    return {
      status: 'blocked',
      reason: `Multiple roots contain documents (${rootsWithDocs.length})`,
      deletedRoots: 0,
      deletedFolders: 0,
      keptRootId: null,
    };
  }

  const keepRoot = rootsWithDocs[0] || roots[0];
  const doomedRoots = roots.filter((root) => root.rootId !== keepRoot.rootId);
  const doomedWithDocs = doomedRoots.filter((root) => Number(root.documentCount) > 0);

  if (doomedWithDocs.length > 0) {
    return {
      status: 'blocked',
      reason: `Duplicate roots still contain documents (${doomedWithDocs.length})`,
      deletedRoots: 0,
      deletedFolders: 0,
      keptRootId: keepRoot.rootId,
    };
  }

  const deletedRoots = doomedRoots.length;
  const deletedFolders = doomedRoots.reduce((sum, root) => sum + Number(root.folderCount || 0), 0);

  if (!ARGS.execute) {
    return {
      status: 'dry-run',
      reason: 'Use --execute to apply cleanup',
      deletedRoots,
      deletedFolders,
      keptRootId: keepRoot.rootId,
    };
  }

  const client = await pg.connect();
  try {
    await client.query('begin');
    await client.query(
      'select pg_advisory_xact_lock(hashtext($1))',
      [`workspace-cleanup:${clientRecord.organizationId}:${clientRecord.clientId}`]
    );

    const refreshedRoots = await fetchRootStats(client, clientRecord.organizationId, clientRecord.clientId);
    const refreshedKeepRoot = refreshedRoots.find((root) => root.rootId === keepRoot.rootId);
    const refreshedDoomedRoots = refreshedRoots.filter((root) => root.rootId !== keepRoot.rootId);
    const refreshedDoomedWithDocs = refreshedDoomedRoots.filter((root) => Number(root.documentCount) > 0);

    if (!refreshedKeepRoot) {
      throw new Error('Canonical root disappeared during cleanup');
    }

    if (refreshedDoomedWithDocs.length > 0) {
      throw new Error(`Abort: duplicate roots gained documents (${refreshedDoomedWithDocs.length})`);
    }

    await client.query(
      'delete from folders where organization_id = $1 and id = any($2::uuid[])',
      [
        clientRecord.organizationId,
        refreshedDoomedRoots.map((root) => root.rootId),
      ]
    );

    await client.query('commit');

    return {
      status: 'cleaned',
      reason: 'Duplicate empty roots deleted',
      deletedRoots: deletedRoots,
      deletedFolders: deletedFolders,
      keptRootId: keepRoot.rootId,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

const ARGS = parseArgs(process.argv.slice(2));

(async () => {
  const pool = buildPool();
  try {
    const duplicateClients = await fetchDuplicateClients(pool, ARGS);
    if (duplicateClients.length === 0) {
      console.log('No duplicate workspace roots found.');
      return;
    }

    const results = [];
    for (const clientRecord of duplicateClients) {
      const result = await cleanupClient(pool, clientRecord);
      results.push({
        organizationId: clientRecord.organizationId,
        clientId: clientRecord.clientId,
        clientCode: clientRecord.clientCode,
        rootCount: clientRecord.rootCount,
        ...result,
      });
    }

    console.table(results);
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
