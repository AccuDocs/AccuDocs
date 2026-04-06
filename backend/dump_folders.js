
const { Folder } = require('./src/models');

async function dump() {
  const folders = await Folder.findAll();
  console.log(JSON.stringify(folders.map(f => ({
    id: f.id,
    name: f.name,
    parentFolderId: f.parentFolderId
  })), null, 2));
  process.exit(0);
}

dump();
