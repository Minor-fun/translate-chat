const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 简化配置和日志系统
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

class CacheManager {
  constructor(config = {}) {
    this.config = config;
    this.cache = new Map();
    this.head = {};
    this.tail = {};
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.stats = { 
      hits: 0,          // 缓存命中次数
      misses: 0,        // 缓存未命中次数
      saves: 0,         // 保存到文件次数
      errors: 0,        // 错误次数 
      deduped: 0,       // 通过去重跳过的set操作次数
      duplicateFound: 0, // 实际找到的重复结果数
      evicted: 0,       // 因LRU淘汰的条目数
      added: 0          // 新增添加的条目数
    };
    this.modified = false;
    this.modCount = 0;
    this.cacheFilePath = path.join(__dirname, this.config.cachePath || '../data/translation-cache.json');
    this.logLevelValue = LOG_LEVELS[this.config.logLevel] || LOG_LEVELS.info;
    this.autoSaveTimer = null;
    // 统一创建两个Map以简化代码
    if (this.config.deduplicateResults !== false) {
      this.resultMap = new Map();          // 用于缓存条目去重
      this.stringPool = new Map();         // 用于字符串实例复用
      this.spCount = 0;                    // 字符串池计数
    }
    // 添加写入锁，防止并发写入
    this.writeLock = false;
  }
  
  // 简化日志记录
  log(level, message, data) {
    if (LOG_LEVELS[level] < this.logLevelValue) return;
    const fn = console[level] || console.log;
    data ? fn(`[Cache ${level.toUpperCase()}] ${message}`, data) : fn(`[Cache ${level.toUpperCase()}] ${message}`);
  }
  
  // 初始化和配置管理
  async init() {
    try {
      await this.loadFromFile();
      this._startAutoSaveTimer();
      this.log('info', 'Cache initialized');
    } catch (error) {
      this.log('error', `初始化缓存失败: ${error.message}`);
    }
    return this;
  }
  
  updateConfig(newConfig) {
    const oldInterval = this.config.autoSaveInterval;
    Object.assign(this.config, newConfig);
    this.cacheFilePath = path.join(__dirname, this.config.cachePath || '../data/translation-cache.json');
    this.logLevelValue = LOG_LEVELS[this.config.logLevel] || LOG_LEVELS.info;
    if (oldInterval !== this.config.autoSaveInterval) this._startAutoSaveTimer();
    
    // 如果去重设置发生变化，需要重新创建相关数据结构
    if ('deduplicateResults' in newConfig && this.config.deduplicateResults !== (this.resultMap !== undefined)) {
      if (this.config.deduplicateResults && !this.resultMap) {
        this.resultMap = new Map();
        this.stringPool = new Map();
        this.spCount = 0;
        
        // 重新填充结果映射
        for (let node = this.head.next; node !== this.tail; node = node.next) {
          if (node.key && node.value?.result) {
            this._updateResultMap(node.key, node.value.result);
          }
        }
        this.log('info', `已启用去重功能，创建了结果映射 (${this.resultMap.size} 个唯一结果)`);
      } else if (!this.config.deduplicateResults && this.resultMap) {
        this.resultMap = undefined;
        this.stringPool = undefined;
        this.spCount = 0;
        this.log('info', '已禁用去重功能，释放了结果映射');
      }
    }
  }
  
  _startAutoSaveTimer() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    
    // 配置中存储的是分钟值，需要转换为毫秒
    const intervalMinutes = this.config.autoSaveInterval;
    if (intervalMinutes > 0) {
      // 简单转换为毫秒，command.js已经处理了限制
      const intervalMs = intervalMinutes * 60 * 1000;
      
      this.log('info', `设置自动保存间隔：${intervalMinutes}分钟`);
      this.autoSaveTimer = setInterval(() => {
        if (this.modified) this.saveToFile().catch(err => this.log('error', `自动保存失败: ${err.message}`));
      }, intervalMs);
      
      if (this.autoSaveTimer.unref) this.autoSaveTimer.unref();
    }
  }
  
  // 缓存键生成
  generateKey(text, from, to) {
    if (this.config.hashLongText && text.length > this.config.longTextThreshold) {
      const hasher = crypto.createHash(this.config.hashAlgorithm);
      hasher.update(Buffer.from(text));
      return `${from}:${to}:${hasher.digest('hex')}`;
    }
    return `${from}:${to}:${text}`;
  }
  
  // 简化LRU操作
  _moveToFront(node) {
    if (node.prev) {
      node.prev.next = node.next;
      node.next.prev = node.prev;
    }
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
    this.modified = true;
  }
  
  _removeTail() {
    if (this.head.next === this.tail) return null;
    const node = this.tail.prev;
    node.prev.next = this.tail;
    this.tail.prev = node.prev;
    node.prev = node.next = null;
    return node;
  }
  
  // 优化从键中提取语言对和标准化结果的方法
  _getKeyInfo(key, result) {
    if (!this.resultMap) return null;
    const parts = key.split(':');
    return {
      langPair: parts.length >= 2 ? `${parts[0]}:${parts[1]}` : null,
      norm: result ? result.trim() : ''
    };
  }
  
  // 更新结果映射 - 优化版
  _updateResultMap(key, result, remove = false) {
    if (!this.resultMap || !result) return;
    
    const norm = result.trim();
    if (!norm) return;
    
    if (remove) {
      const keys = this.resultMap.get(norm);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.resultMap.delete(norm);
        }
      }
    } else {
      let keys = this.resultMap.get(norm);
      if (!keys) {
        keys = new Set();
        this.resultMap.set(norm, keys);
      }
      keys.add(key);
    }
  }
  
  // 字符串实例复用 - 精简版
  _internString(str) {
    if (!this.stringPool || typeof str !== 'string' || !str) return str;
    const cached = this.stringPool.get(str);
    if (cached) return cached;
    this.stringPool.set(str, str);
    return str;
  }
  
  // 缓存操作
  get(key) {
    if (this.config.enabled === false) return null;
    
    const node = this.cache.get(key);
    if (node) {
      this._moveToFront(node);
      this.stats.hits++;
      this.log('debug', `Hit: ${key.substring(0, 20)}...`);
      return node.value.result;
    }
    
    this.stats.misses++;
    this.log('debug', `Miss: ${key.substring(0, 20)}...`);
    return null;
  }
  
  set(key, result) {
    if (this.config.enabled === false) return;
    
    // 去重复用逻辑
    if (this.resultMap && result) {
      const info = this._getKeyInfo(key, result);
      if (info?.norm && info.langPair) {
        const keys = this.resultMap.get(info.norm);
        if (keys) {
          // 快速检查是否有匹配的现有条目
          for (const existingKey of keys) {
            if (existingKey.startsWith(info.langPair) && this.cache.has(existingKey)) {
              // 更新节点位置、统计数据，并更新resultMap
              this._moveToFront(this.cache.get(existingKey));
              this.stats.deduped++;
              this.stats.duplicateFound++;
              this._updateResultMap(key, result); // 确保重复项也被记录到resultMap
              
              this.log('debug', `去重命中: ${key.substring(0, 20)}... -> ${existingKey.substring(0, 20)}...`);
              return;
            }
          }
        }
      }
    }
    
    // 优化: 合并字符串复用与缓存项创建
    const internedResult = this.stringPool ? this._internString(result) : result;
    let node = this.cache.get(key);
    
    if (node) {
      // 更新现有节点
      if (this.resultMap && node.value.result !== internedResult) {
        this._updateResultMap(key, node.value.result, true);
      }
      node.value = { result: internedResult, time: Date.now() };
    } else {
      // 创建新节点
      if (this.cache.size >= this.config.maxSize) this._batchCleanup();
      node = { 
        key, 
        value: { result: internedResult, time: Date.now() } 
      };
      this.cache.set(key, node);
      this.stats.added++;  // 记录新增条目
    }
    
    // 更新结果映射
    if (this.resultMap) this._updateResultMap(key, internedResult);
    
    this._moveToFront(node);
    this.modified = true;
    
    // 周期性检查字符串池大小（简化版）
    if (this.stringPool && ++this.spCount % 1000 === 0 && this.stringPool.size > this.cache.size * 1.2) {
      this.stringPool.clear();
      for (let n = this.head.next; n !== this.tail; n = n.next) if (n.value?.result) this.stringPool.set(n.value.result, n.value.result);
      this.log('info', `字符串池已重置: ${this.stringPool.size} 条目`);
    }
    
    const writeThreshold = this.config.writeThreshold;
    if (++this.modCount >= writeThreshold) {
      this.saveToFile().catch(err => this.log('error', `阈值保存失败: ${err.message}`));
      this.modCount = 0;
    }
  }
  
  _batchCleanup() {
    const maxSize = this.config.maxSize;
    const cleanupPercentage = this.config.cleanupPercentage;
    const cleanupCount = Math.floor(maxSize * cleanupPercentage);
    if (cleanupCount <= 0) return;
    
    this.log('info', `清理 ${cleanupCount} 个最久未使用的条目`);
    
    // 优化: 一次性断开链表尾部的N个节点
    if (cleanupCount > 0 && this.tail.prev !== this.head) {
      // 找到新的尾部节点位置
      let newTail = this.tail.prev;
      let nodesToRemove = [];
      let count = 0;
      
      // 收集要删除的节点
      for (let i = 0; i < cleanupCount; i++) {
        if (newTail === this.head) break;
        nodesToRemove.push(newTail);
        newTail = newTail.prev;
        count++;
      }
      
      if (count > 0) {
        // 一次性断开链表连接
        newTail.next = this.tail;
        this.tail.prev = newTail;
        
        // 批量处理节点删除和Map清理
        for (const oldNode of nodesToRemove) {
          // 从结果映射中移除
          if (this.resultMap && oldNode.value?.result) {
            this._updateResultMap(oldNode.key, oldNode.value.result, true);
          }
          
          this.cache.delete(oldNode.key);
          oldNode.prev = oldNode.next = null; // 帮助垃圾回收
          this.stats.evicted++;
        }
      }
    }
    
    // 清理后重建字符串池，确保只保留正在使用的字符串
    if (this.stringPool && this.stringPool.size > this.cache.size * 1.5) {
      this._rebuildStringPool();
    }
    
    this.modified = true;
    this.saveToFile().catch(err => this.log('error', `清理后保存失败: ${err.message}`));
  }
  
  // 重建字符串池，只保留当前缓存中使用的字符串
  _rebuildStringPool() {
    if (!this.stringPool) return;
    
    const oldPoolSize = this.stringPool.size;
    const newStringPool = new Map();
    
    // 收集当前使用的所有字符串
    for (let node = this.head.next; node !== this.tail; node = node.next) {
      if (node.value?.result && typeof node.value.result === 'string') {
        // 如果字符串不在新池中，添加它
        if (!newStringPool.has(node.value.result)) {
          newStringPool.set(node.value.result, node.value.result);
        }
      }
    }
    
    // 替换旧池
    this.stringPool = newStringPool;
    
    this.log('info', `字符串池已重建: ${oldPoolSize} -> ${this.stringPool.size} 个条目`);
  }
  
  clear() {
    const oldSize = this.cache.size;
    this.cache.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.stats = { 
      hits: 0,
      misses: 0,
      saves: 0,
      errors: 0,
      deduped: 0,
      duplicateFound: 0,
      evicted: 0,
      added: 0
    };
    this.modified = true;
    
    // 简化清理
    if (this.resultMap) {
      this.resultMap.clear();
      this.stringPool.clear();
    }
    
    this.log('info', `Cache cleared (${oldSize} entries)`);
    this.saveToFile().catch(err => this.log('error', `清除缓存后保存失败: ${err.message}`));
  }
  
  // 根据关键词搜索缓存内容
  search(keyword, limit = 10) {
    if (!keyword || typeof keyword !== 'string') return [];
    
    const results = [];
    const lowerKeyword = keyword.toLowerCase();
    
    for (let node = this.head.next; node !== this.tail && results.length < limit; node = node.next) {
      const key = node.key || '';
      const result = node.value.result || '';
      
      if (key.toLowerCase().includes(lowerKeyword) || result.toLowerCase().includes(lowerKeyword)) {
        const parts = key.split(':');
        results.push({
          from: parts[0] || 'unknown',
          to: parts[1] || 'unknown',
          text: (parts.length > 2 ? parts.slice(2).join(':') : '(哈希文本)').substring(0, 50) + (parts.length > 2 && parts.slice(2).join(':').length > 50 ? '...' : ''),
          result: result.substring(0, 50) + (result.length > 50 ? '...' : ''),
          time: new Date(node.value.time).toLocaleString()
        });
      }
    }
    
    return results;
  }
  
  // 选择性清除缓存
  clearSelected(criteria) {
    if (!criteria) return 0;
    
    let count = 0;
    const nodesToRemove = [];
    
    for (let node = this.head.next; node !== this.tail; node = node.next) {
      const key = node.key || '';
      const result = node.value.result || '';
      const parts = key.split(':');
      const from = parts[0];
      const to = parts[1];
      
      // 合并条件判断
      if ((criteria.from && from === criteria.from) || 
          (criteria.to && to === criteria.to) ||
          (criteria.keyword && (key.toLowerCase().includes(criteria.keyword.toLowerCase()) || 
                              result.toLowerCase().includes(criteria.keyword.toLowerCase()))) ||
          (criteria.before && node.value.time < criteria.before)) {
        nodesToRemove.push(node);
      }
    }
    
    // 批量删除
    for (const node of nodesToRemove) {
      if (node.prev) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
        
        // 从结果映射中移除
        if (this.resultMap && node.value?.result) {
          this._updateResultMap(node.key, node.value.result, true);
        }
        
        this.cache.delete(node.key);
        count++;
      }
    }
    
    if (count > 0) {
      this.modified = true;
      this.log('info', `选择性清除了 ${count} 个缓存条目`);
      this.saveToFile().catch(err => this.log('error', `选择性清除后保存失败: ${err.message}`));
    }
    
    return count;
  }
  
  getStats() {
    // 计算汇总数据
    const totalRequests = this.stats.hits + this.stats.misses;
    const totalSetOps = this.stats.deduped + this.stats.added;
    
    // 计算比率并格式化
    const hitRate = totalRequests > 0 ? 
      (this.stats.hits / totalRequests * 100).toFixed(2) + '%' : '0%';
    const dedupeRate = totalSetOps > 0 ? 
      (this.stats.deduped / totalSetOps * 100).toFixed(2) + '%' : '0%';
    
    return {
      // 基础信息
      size: this.cache.size,
      maxSize: this.config.maxSize,
      enabled: this.config.enabled !== false,
      modified: this.modified,
      
      // 配置信息 - autoSaveInterval存储的是分钟值
      autoSaveInterval: this.config.autoSaveInterval,
      writeThreshold: this.config.writeThreshold,
      cleanupPercentage: this.config.cleanupPercentage,
      longTextThreshold: this.config.longTextThreshold,
      hashLongText: this.config.hashLongText !== false,
      deduplicateResults: this.config.deduplicateResults !== false,
      
      // 缓存命中统计
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalRequests: totalRequests,
      hitRate: hitRate,
      
      // 缓存操作统计
      added: this.stats.added,
      evicted: this.stats.evicted,
      saves: this.stats.saves,
      errors: this.stats.errors,
      
      // 去重统计
      deduped: this.stats.deduped,
      duplicateFound: this.stats.duplicateFound,
      totalSetOperations: totalSetOps,
      dedupeRate: dedupeRate,
      
      // 实例池统计
      uniqueResults: this.resultMap ? this.resultMap.size : 0,
      stringPoolSize: this.stringPool ? this.stringPool.size : 0
    };
  }
  
  setEnabled(enabled) {
    this.config.enabled = enabled;
    this.log('info', `Cache ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // 简化文件操作
  async saveToFile() {
    // 如果未修改，快速返回
    if (!this.modified) return Promise.resolve(true);
    
    // 如果已经有写入操作在进行中，直接返回
    if (this.writeLock) {
      this.log('info', `写入操作已在进行中，跳过本次保存`);
      return Promise.resolve(false);
    }
    
    // 获取写入锁
    this.writeLock = true;
    
    try {
      // 准备数据
      const entries = [];
      for (let node = this.head.next; node !== this.tail; node = node.next) {
        entries.push({
          key: node.key,
          result: node.value.result,
          time: node.value.time,
          lru: entries.length
        });
      }
      
      await fs.mkdir(path.dirname(this.cacheFilePath), { recursive: true });
      
      // 简单直接地写入文件
      const jsonContent = JSON.stringify(entries).replace(/},{/g, '},\n{');
      await fs.writeFile(this.cacheFilePath, jsonContent, 'utf8');
      
      this.modified = false;
      this.stats.saves++;
      this.log('info', `已保存 ${entries.length} 个缓存条目`);
      
      return true;
    } catch (error) {
      this.stats.errors++;
      this.log('error', `保存失败: ${error.message}`);
      throw error;
    } finally {
      // 释放写入锁
      this.writeLock = false;
    }
  }
  
  async loadFromFile() {
    try {
      const data = await fs.readFile(this.cacheFilePath, 'utf8');
      let items = [];
      
      try {
        items = JSON.parse(data);
      } catch (parseError) {
        this.log('error', `解析缓存文件失败: ${parseError.message}`);
        this.log('error', '无法解析缓存文件，将使用空缓存');
        return false;
      }
      
      // 重置缓存
      this.head.next = this.tail;
      this.tail.prev = this.head;
      this.cache.clear();
      if (this.resultMap) {
        this.resultMap.clear();
        this.stringPool.clear();
      }
      
      // 排序并限制加载数量
      items.sort((a, b) => ('lru' in a && 'lru' in b) ? (a.lru - b.lru) : (b.time - a.time));
      

      items.slice(0, this.config.maxSize).reverse().forEach(item => {
        if (!item.key || !item.result) return;
        
        // 应用字符串实例复用
        const internedResult = this.stringPool ? this._internString(item.result) : item.result;
        
        const node = {
          key: item.key,
          value: { result: internedResult, time: item.time || Date.now() },
          next: this.head.next,
          prev: this.head
        };
        
        this.head.next.prev = node;
        this.head.next = node;
        this.cache.set(item.key, node);
        
        // 更新结果映射
        if (this.resultMap) this._updateResultMap(item.key, internedResult);
      });
      
      // 简化日志输出
      const stats = this.resultMap ? 
        `，${this.resultMap.size} 个唯一结果，${this.stringPool.size} 个唯一字符串` : '';
      this.log('info', `已加载 ${this.cache.size} 个缓存条目${stats}`);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.stats.errors++;
        this.log('error', `加载失败: ${error.message}`);
      } else {
        this.log('info', '未找到缓存文件');
      }
      return false;
    }
  }
  
  getDuplicateStats() {
    if (!this.resultMap) return { enabled: false };
    
    // 计算重复组和重复项
    let dupCount = 0, dupGroups = 0;
    this.resultMap.forEach(keys => {
      if (keys.size > 1) {
        dupGroups++;
        dupCount += keys.size - 1;
      }
    });
    
    // 统计百分比
    const totalSetOps = this.stats.deduped + this.stats.added;
    const cacheSizeWithDups = this.cache.size + dupCount;
    const resultDedupPercent = dupCount > 0 ? 
      `${((dupCount / cacheSizeWithDups) * 100).toFixed(2)}%` : '0%';
    const dedupeRate = totalSetOps > 0 ? 
      `${(this.stats.deduped / totalSetOps * 100).toFixed(2)}%` : '0%';
    
    return {
      enabled: true,
      uniqueResults: this.resultMap.size,
      totalEntries: this.cache.size,
      duplicateGroups: dupGroups,
      duplicateCount: dupCount,
      deduplicationSavings: resultDedupPercent,
      runtimeStats: {
        totalSetOperations: totalSetOps,
        duplicatesSkipped: this.stats.deduped,
        duplicatesFound: this.stats.duplicateFound,
        deduplicationRate: dedupeRate
      },
      stringPool: {
        size: this.stringPool.size
      }
    };
  }
}

// 创建默认实例 - 使用空配置，稍后会从settings中更新
const defaultCacheManager = new CacheManager();

module.exports = { CacheManager, defaultCacheManager }; 