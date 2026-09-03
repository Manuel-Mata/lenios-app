const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'initialData.json');

let inMemoryData = null;

function loadData() {
  if (inMemoryData) return inMemoryData;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      inMemoryData = JSON.parse(raw);
    } else {
      inMemoryData = { business: {}, products: [], orders: [], categories: [], customizerOptions: {} };
    }
  } catch (err) {
    console.error('Error al cargar la base de datos:', err);
    inMemoryData = { business: {}, products: [], orders: [], categories: [], customizerOptions: {} };
  }
  return inMemoryData;
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(inMemoryData, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error al guardar la base de datos:', err);
    return false;
  }
}

module.exports = {
  getDb: loadData,
  saveDb: saveData
};
