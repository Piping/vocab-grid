// src/idb.js - IndexedDB工具类

class VocabDB {
  constructor() {
    this.dbName = 'VocabGridDB';
    this.storeName = 'vocab';
    this.dbVersion = 2; // 增加版本号以触发数据库升级
  }

  // 打开数据库
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          // 创建存储对象，以'id'为键
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // 批量添加数据
  async bulkAddData(data) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      data.forEach(item => {
        // 确保每个单词对象有'name'和'definition'字段
        if (item.name && item.definition) {
          store.add({
            name: item.name,
            definition: item.definition
          });
        }
      });

      transaction.oncomplete = () => {
        resolve('数据添加成功');
      };

      transaction.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // 获取所有数据
  async getAllData() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // 检查数据库是否有数据
  async hasData() {
    const data = await this.getAllData();
    return data.length > 0;
  }
}

export default new VocabDB();