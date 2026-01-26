import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import vocabDB from './idb';
import vocabData from './assets/vocab_gre.json';
// 移除未使用的直接导入，TTS 通过 Worker 调用

function App() {
  const [words, setWords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rememberedWords, setRememberedWords] = useState({});
  const [wordsPerPage, setWordsPerPage] = useState(5);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 已移除手动 grid-column-start 设置，改为自动居中布局
  const [ttsVoice, setTtsVoice] = useState('en_US-hfc_female-medium');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  // 导入导出相关
  const [mergeOnImport, setMergeOnImport] = useState(true);
  const importFileInputRef = useRef(null);
  // 释义展示与触摸双击
  const [visibleDefs, setVisibleDefs] = useState({}); // { [id]: true }
  const suppressNextClickRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0, id: null });
  // 最近交互的单词（用于 u 键播放）
  const lastActiveWordRef = useRef(null); // { id, word }
  // 翻页顺序发音
  const [alwaysSpeakOnPage, setAlwaysSpeakOnPage] = useState(false);
  
  // TTS Worker相关状态
  const [ttsWorker, setTtsWorker] = useState(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const workerMessageQueue = useRef([]);
  // 翻页顺序发音控制
  const pageSpeakTokenRef = useRef(0);

  // 移除 grid-column-start 本地存储逻辑

  // 初始化TTS Worker
  useEffect(() => {
    // 创建Worker
    const worker = new Worker(new URL('./tts.worker.js', import.meta.url), { type: 'module' });
    
    // 设置Worker消息处理
    worker.onmessage = (event) => {
      const { type, word, audioData, error, voiceId, voices } = event.data;
      
      if (type === 'worker-ready') {
        setIsWorkerReady(true);
        // 处理队列中的消息
        while (workerMessageQueue.current.length > 0) {
          const message = workerMessageQueue.current.shift();
          worker.postMessage(message);
        }
      } else if (type === 'model-loaded') {
        console.log('TTS模型在Worker中加载完成:', voiceId);
      } else if (type === 'voice-set') {
        console.log('TTS语音模型已设置:', voiceId);
      } else if (type === 'voices-list') {
        // 处理获取到的语音模型列表
        console.log('获取到语音模型列表:', voices);
        // 转换语音模型列表格式：首字母大写，去掉括号及其内容
        const formattedVoices = voices.map(voice => {
          const raw = (voice && voice.name) ? String(voice.name) : String(voice?.key || '');
          const noParen = raw.replace(/\s*\([^)]*\)\s*/g, '').trim();
          const display = noParen ? noParen.charAt(0).toUpperCase() + noParen.slice(1) : String(voice?.key || '');
          return { id: voice.key, name: display };
        });
        setAvailableVoices(formattedVoices);
      } else if (type === 'success') {
        // 处理成功的TTS结果
        const audioUrl = URL.createObjectURL(audioData);
        // 将音频URL存入缓存
        audioCache.current[word] = audioUrl;
        console.log('Worker TTS生成成功:', word);
      } else if (type === 'error') {
        console.error('Worker TTS处理失败:', word, error);
      }
    };
    
    // 发送初始化消息
    worker.postMessage({ type: 'init' });
    
    setTtsWorker(worker);
    
    // 清理函数
    return () => {
      worker.terminate();
    };
  }, []);

  // 当TTS语音模型改变时，通知Worker
  useEffect(() => {
    if (ttsWorker && isWorkerReady) {
      ttsWorker.postMessage({ type: 'set-voice', voiceId: ttsVoice });
    }
  }, [ttsVoice, ttsWorker, isWorkerReady]);

  // 加载单词数据
  useEffect(() => {
    const loadWords = async () => {
      try {
        // 检查数据库是否有数据
        const hasData = await vocabDB.hasData();

        if (!hasData) {
          // 如果没有数据，导入JSON数据
          console.log('导入单词数据到IndexedDB...');
          await vocabDB.bulkAddData(vocabData);
          console.log('数据导入成功');
        }

        // 从数据库加载数据
        const data = await vocabDB.getAllData();
        // 使用数据库稳定的自增ID，避免顺序变化导致标记错位
        const formattedData = data.map((item) => ({
          id: item.id,
          word: item.name,
          definition: item.definition
        }));
        setWords(formattedData);
      } catch (err) {
        console.error('加载单词数据失败:', err);
        setError('加载单词数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }

      // 加载已记住的单词和用户设置
      const savedRemembered = localStorage.getItem('rememberedWords');
      if (savedRemembered) {
        setRememberedWords(JSON.parse(savedRemembered));
      }

      const savedWordsPerPage = localStorage.getItem('wordsPerPage');
      if (savedWordsPerPage) {
        setWordsPerPage(parseInt(savedWordsPerPage));
      }

      const savedShowDefinitions = localStorage.getItem('showDefinitions');
      if (savedShowDefinitions) {
        setShowDefinitions(JSON.parse(savedShowDefinitions));
      }

      const savedAlwaysSpeak = localStorage.getItem('alwaysSpeakOnPage');
      if (savedAlwaysSpeak) {
        setAlwaysSpeakOnPage(JSON.parse(savedAlwaysSpeak));
      }
    };

    loadWords();
  }, []);

  // 保存已记住的单词
  useEffect(() => {
    localStorage.setItem('rememberedWords', JSON.stringify(rememberedWords));
  }, [rememberedWords]);

  // 保存用户设置
  useEffect(() => {
    localStorage.setItem('wordsPerPage', wordsPerPage);
    // 当每页单词数改变时，重置到第一页
    setCurrentPage(1);
  }, [wordsPerPage]);

  useEffect(() => {
    localStorage.setItem('showDefinitions', JSON.stringify(showDefinitions));
  }, [showDefinitions]);

  useEffect(() => {
    localStorage.setItem('alwaysSpeakOnPage', JSON.stringify(alwaysSpeakOnPage));
  }, [alwaysSpeakOnPage]);

  // 组件级别 Audio 元素，复用同一个播放器
  const audioRef = useRef(null);
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      } catch (err) {
        void err;
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 计算总页数，确保至少为1
  const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));

  // 获取当前页的单词
  const indexOfLastWord = currentPage * wordsPerPage;
  const indexOfFirstWord = indexOfLastWord - wordsPerPage;
  const currentWords = words.slice(indexOfFirstWord, indexOfLastWord);

  // 切换页面
  const handlePageChange = useCallback((page) => {
    // 取消所有进行中的语音
    window.speechSynthesis.cancel();
    
    // 向Worker发送取消消息
    if (ttsWorker && isWorkerReady) {
      ttsWorker.postMessage({ type: 'cancel' });
    }
    
    setCurrentPage(page);
    // 停止正在播放的音频
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch (err) {
      void err;
    }
    // 重置当前激活单词
    if (lastActiveWordRef) {
      lastActiveWordRef.current = null;
    }
    // 取消当前页顺序发音
    pageSpeakTokenRef.current = 0;
  }, [ttsWorker, isWorkerReady]);

  // 键盘快捷键（J/K 翻页、I 当前页切换记住、O 切换释义、U 播放当前）
  // 注意：依赖 playPronunciation，因此此 effect 放在其后面定义

  // 切换单词记忆状态
  const toggleRemember = (id) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    setRememberedWords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 播放单词发音（复用单个 Audio 元素）
  const audioCache = useRef({});

  // 向Worker发送消息的辅助函数
  const sendToWorker = useCallback((message) => {
    if (isWorkerReady && ttsWorker) {
      // 如果是预测消息，添加当前选择的语音模型
      if (message.type === 'predict') {
        ttsWorker.postMessage({ ...message, voiceId: ttsVoice });
      } else {
        ttsWorker.postMessage(message);
      }
    } else {
      // 如果Worker未准备好，将消息加入队列
      workerMessageQueue.current.push(message);
    }
  }, [isWorkerReady, ttsWorker, ttsVoice]);

  // 使用系统语音播放一个单词，返回完成的 Promise
  const speakWithSystem = useCallback((word) => {
    return new Promise((resolve) => {
      try {
        const utter = new SpeechSynthesisUtterance(word);
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      } catch {
        resolve();
      }
    });
  }, []);

  // 使用复用的 Audio 元素播放缓存音频，返回完成的 Promise
  const playWithAudio = useCallback((url) => {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      if (!audio) return resolve();
      try {
        // 清理旧监听
        const onDone = () => {
          audio.removeEventListener('ended', onDone);
          audio.removeEventListener('error', onDone);
          resolve();
        };
        audio.addEventListener('ended', onDone, { once: true });
        audio.addEventListener('error', onDone, { once: true });
        audio.pause();
        audio.currentTime = 0;
        audio.src = url;
        audio.play().catch(() => {
          onDone();
        });
      } catch {
        resolve();
      }
    });
  }, []);

  // 统一的“优先TTS（缓存），否则fallback到系统TTS，并异步请求生成缓存”单词播报
  const speakOnce = useCallback(async (word) => {
    if (audioCache.current[word]) {
      await playWithAudio(audioCache.current[word]);
      return;
    }
    // 先请求生成缓存，再用系统TTS作为回退
    sendToWorker({ type: 'predict', word });
    await speakWithSystem(word);
  }, [playWithAudio, speakWithSystem, sendToWorker]);

  const playPronunciation = useCallback(async (word) => {
    try {
      // 全面取消：系统TTS、顺序朗读、Worker 队列、当前 Audio
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        void err;
      }
      pageSpeakTokenRef.current = 0;
      if (ttsWorker && isWorkerReady) {
        try {
          ttsWorker.postMessage({ type: 'cancel' });
        } catch (err) {
          void err;
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // 统一逻辑：优先用缓存TTS，否则系统TTS并异步生成缓存
      // 给 cancel 一点时间生效
      await new Promise(r => setTimeout(r, 60));
      await speakOnce(word);
    } catch (ttsError) {
      console.error('TTS播放失败:', ttsError);
      await speakWithSystem(word);
    }
  }, [isWorkerReady, ttsWorker, speakOnce, speakWithSystem]);

  // 顺序朗读当前页（统一逻辑：缓存TTS优先，否则系统TTS）
  const startSequentialSpeak = useCallback((list) => {
    const token = Date.now();
    pageSpeakTokenRef.current = token;
    const run = async () => {
      // 等待 cancel 生效
      await new Promise(r => setTimeout(r, 60));
      for (let i = 0; i < (list?.length ?? 0); i++) {
        if (pageSpeakTokenRef.current !== token) return;
        const item = list[i];
        if (!item || !item.word) continue;
        await speakOnce(item.word);
        if (pageSpeakTokenRef.current !== token) return;
        await new Promise(r => setTimeout(r, 60));
      }
    };
    run();
  }, [speakOnce]);

  // 添加J/K快捷键控制分页 + U 播放
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 仅当没有输入框被聚焦时才触发快捷键
      if (document.activeElement.tagName !== 'INPUT') {
        if (e.key === 'j') {
          e.preventDefault();
          if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
          }
        } else if (e.key === 'k') {
          e.preventDefault();
          if (currentPage > 1) {
            handlePageChange(currentPage - 1);
          }
        } else if (e.key === 'i') {
          e.preventDefault();
          // 将当前页所有单词记忆状态取反（toggle）
          setRememberedWords(prev => {
            const updated = { ...prev };
            currentWords.forEach(w => {
              if (w && w.id != null) updated[w.id] = !prev[w.id];
            });
            return updated;
          });
        } else if (e.key === 'o') {
          e.preventDefault();
          // 全局切换是否显示单词释义
          setShowDefinitions(prev => !prev);
        } else if (e.key === 'u') {
          e.preventDefault();
          // 播放最近交互的单词；若无则播放当前页第一个
          let target = lastActiveWordRef.current;
          if ((!target || target.id == null) && currentWords.length > 0) {
            target = { id: currentWords[0].id, word: currentWords[0].word };
          }
          if (target && target.word) {
            playPronunciation(target.word);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, totalPages, handlePageChange, currentWords, playPronunciation]);

  // 已取消悬停播放逻辑

  // 切换单词释义显示
  const toggleDefinition = useCallback((id) => {
    setVisibleDefs(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }, []);

  // 组件卸载时清理缓存的音频URL
  useEffect(() => {
    return () => {
      Object.values(audioCache.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
      audioCache.current = {};
    };
  }, []);

  // 导出记忆记录
  const handleExportRemembered = useCallback(() => {
    try {
      const payload = {
        type: 'vocab-grid-remembered',
        version: 1,
        exportedAt: new Date().toISOString(),
        rememberedWords,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `vocab-grid-remembered-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出记忆记录失败:', err);
      alert('导出失败，请重试');
    }
  }, [rememberedWords]);

  // 导入记忆记录
  const handleImportFileChange = useCallback(async (e) => {
    const file = e.target.files && e.target.files[0];
    // 允许重复选择同一文件
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // 兼容多种简单格式
      let incoming = {};
      if (parsed && typeof parsed === 'object') {
        if (parsed.type === 'vocab-grid-remembered') {
          incoming = parsed.rememberedWords || parsed.data || {};
        } else if (parsed.rememberedWords) {
          incoming = parsed.rememberedWords;
        } else {
          incoming = parsed;
        }
      }

      if (!incoming || typeof incoming !== 'object') {
        alert('导入文件格式不正确');
        return;
      }

      // 仅保留当前数据集存在的ID，键转换为数字
      const validIds = new Set(words.map(w => Number(w.id)));
      const filtered = {};
      for (const [k, v] of Object.entries(incoming)) {
        const idNum = Number(k);
        if (Number.isInteger(idNum) && validIds.has(idNum)) {
          filtered[idNum] = Boolean(v);
        }
      }

      if (Object.keys(filtered).length === 0) {
        alert('导入文件没有有效的记录（可能与当前词库不匹配）');
        return;
      }

      setRememberedWords(prev => (mergeOnImport ? { ...prev, ...filtered } : filtered));
      alert('导入成功');
    } catch (err) {
      console.error('导入记忆记录失败:', err);
      alert('导入失败：文件解析错误');
    }
  }, [words, mergeOnImport]);

  // 获取可用的语音模型
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        // 通过Worker获取可用的语音模型
        if (ttsWorker && isWorkerReady) {
          // 发送获取语音模型列表的消息
          ttsWorker.postMessage({ type: 'get-voices' });
        }
      } catch (error) {
        console.error('获取语音模型列表失败:', error);
      }
    };

    // 等待Worker准备好后再获取语音模型列表
    if (isWorkerReady && ttsWorker) {
      fetchVoices();
    }
  }, [isWorkerReady, ttsWorker]);

  // 翻页后顺序发音当前页所有单词（串行，避免跳词）
  useEffect(() => {
    if (!alwaysSpeakOnPage) return;
    if (loading || error) return;
    if (!Array.isArray(currentWords) || currentWords.length === 0) return;
    try {
      // 取消现有合成与音频播放
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (ttsWorker && isWorkerReady) {
        ttsWorker.postMessage({ type: 'cancel' });
      }
      // 串行播放，避免 API cancel 时首个发音被吞
      startSequentialSpeak(currentWords);
    } catch (e) {
      console.error('顺序发音失败:', e);
    }
  }, [alwaysSpeakOnPage, currentWords, loading, error, startSequentialSpeak, isWorkerReady, ttsWorker]);

  return (
    <div className="app-shell">
      <div className="app-nav">
        <header className="app-topbar">
          <div className="ui-container app-topbar__inner">
            <div className="app-brand">
              <h1 className="app-title">Vocab Grid</h1>
              <p className="app-subtitle">点击卡片标记记忆；右键/双击切换释义；J/K 翻页</p>
            </div>
            <div className="app-topbar__meta">
              <span className="ui-badge ui-badge--muted">共 {words.length} 词</span>
              <span className="ui-badge ui-badge--success">
                已记住 {Object.values(rememberedWords).filter(Boolean).length}
              </span>
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? '浅色主题' : '深色主题'}
              </button>
            </div>
          </div>
        </header>

        <div className="app-toolbar" aria-label="toolbar">
          <div className="ui-container app-toolbar__inner">
            <label className="app-toolbar__control" htmlFor="wordsPerPage">
              <span className="app-toolbar__control-label">每页单词数</span>
              <input
                type="number"
                id="wordsPerPage"
                value={wordsPerPage}
                min="1"
                max="100"
                onChange={(e) => {
                  let value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1) {
                    value = 1;
                  } else if (value > 100) {
                    value = 100;
                  }
                  setWordsPerPage(value);
                }}
                className="ui-input app-toolbar__input"
              />
            </label>

            <label className="ui-check" htmlFor="alwaysSpeakOnPage">
              <input
                type="checkbox"
                id="alwaysSpeakOnPage"
                className="ui-check__input"
                checked={alwaysSpeakOnPage}
                onChange={(e) => setAlwaysSpeakOnPage(e.target.checked)}
              />
              <span className="ui-label">翻页顺序发音</span>
            </label>

            <div className="app-toolbar__actions">
              <button className="ui-btn ui-btn--secondary" type="button" onClick={handleExportRemembered}>
                导出记忆
              </button>
              <button
                className="ui-btn ui-btn--secondary"
                type="button"
                onClick={() => importFileInputRef.current && importFileInputRef.current.click()}
              >
                导入记忆
              </button>
              <input
                type="file"
                accept="application/json"
                ref={importFileInputRef}
                style={{ display: 'none' }}
                onChange={handleImportFileChange}
              />
            </div>

            <details className="app-toolbar__more">
              <summary className="app-toolbar__more-summary">更多设置</summary>
              <div className="ui-card app-toolbar__more-panel">
                <div className="ui-stack">
                  <div className="app-settings__row">
                    <div className="ui-field app-field--compact">
                      <label className="ui-label" htmlFor="ttsVoice">
                        TTS 语音模型
                      </label>
                      <select
                        id="ttsVoice"
                        value={ttsVoice}
                        onChange={(e) => setTtsVoice(e.target.value)}
                        className="ui-select"
                      >
                        {availableVoices.length > 0 ? (
                          availableVoices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name || voice.id}
                            </option>
                          ))
                        ) : (
                          <option value={ttsVoice} disabled>
                            加载中…
                          </option>
                        )}
                      </select>
                      <div className="ui-hint">{isWorkerReady ? '已就绪' : '初始化中…'}</div>
                    </div>

                    <label className="ui-check" htmlFor="showDefinitions">
                      <input
                        type="checkbox"
                        id="showDefinitions"
                        className="ui-check__input"
                        checked={showDefinitions}
                        onChange={(e) => setShowDefinitions(e.target.checked)}
                      />
                      <span className="ui-label">总是显示释义</span>
                    </label>
                  </div>

                  <div className="app-settings__row">
                    <label className="ui-check">
                      <input
                        type="checkbox"
                        className="ui-check__input"
                        checked={mergeOnImport}
                        onChange={(e) => setMergeOnImport(e.target.checked)}
                      />
                      <span className="ui-label">合并导入</span>
                    </label>
                  </div>

                  <div className="ui-alert">
                    <div className="ui-cluster">
                      <span className="ui-badge">快捷键</span>
                      <span className="ui-hint">
                        j/k 翻页 · i 当前页切换记住 · o 切换释义 · u 发音最近交互 · 右键/双击切换释义
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      <main className="app-main">
        <div className="ui-container">
          {loading ? (
            <section className="ui-empty" aria-label="loading">
              <h2 className="ui-empty__title">加载中</h2>
              <p className="ui-empty__desc">正在从本地数据库读取单词数据…</p>
            </section>
          ) : error ? (
            <section className="ui-alert ui-alert--danger" aria-label="error">
              {error}
            </section>
          ) : (
            <section className="app-grid" aria-label="words">
              {currentWords.map((word) => (
                <div
                  key={word.id}
                  className={`ui-card word-card ${rememberedWords[word.id] ? 'remembered' : ''}`}
                  onClick={() => {
                    lastActiveWordRef.current = { id: word.id, word: word.word };
                    toggleRemember(word.id);
                  }}
                  title={showDefinitions ? undefined : `${word.definition}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    lastActiveWordRef.current = { id: word.id, word: word.word };
                    toggleDefinition(word.id);
                  }}
                  onTouchEnd={(e) => {
                    try {
                      const touch = e.changedTouches && e.changedTouches[0];
                      if (!touch) return;
                      const now = Date.now();
                      const last = lastTapRef.current;
                      const dx = touch.clientX - (last.x || 0);
                      const dy = touch.clientY - (last.y || 0);
                      const dt = now - (last.time || 0);
                      const dist = Math.hypot(dx, dy);
                      if (last.id === word.id && dt < 300 && dist < 30) {
                        suppressNextClickRef.current = true;
                        lastActiveWordRef.current = { id: word.id, word: word.word };
                        toggleDefinition(word.id);
                        lastTapRef.current = { time: 0, x: 0, y: 0, id: null };
                      } else {
                        lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY, id: word.id };
                        lastActiveWordRef.current = { id: word.id, word: word.word };
                      }
                    } catch (err) {
                      console.error('处理触摸事件失败:', err);
                    }
                  }}
                >
                  <div className="word-card__top">
                    <span className="word-text">{word.word}</span>
                    <div className="ui-cluster">
                      <button
                        className="ui-btn ui-btn--ghost app-icon-btn"
                        type="button"
                        aria-label="播放发音"
                        title="播放发音"
                        onClick={(e) => {
                          e.stopPropagation();
                          lastActiveWordRef.current = { id: word.id, word: word.word };
                          playPronunciation(word.word);
                        }}
                      >
                        🔊
                      </button>
                      {rememberedWords[word.id] && <span className="ui-badge ui-badge--success">✓</span>}
                    </div>
                  </div>

                  {(showDefinitions || visibleDefs[word.id]) && (
                    <div className="word-definition">{word.definition}</div>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        {!loading && !error && (
          <footer className="app-footer" aria-label="pagination">
            <div className="ui-container app-footer__inner">
              <button
                className="ui-btn ui-btn--secondary"
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages && !isNaN(page)) {
                    handlePageChange(page);
                  }
                }}
                className="ui-input app-page-input"
                aria-label="当前页"
              />
              <span className="ui-badge ui-badge--muted">/ {totalPages}</span>
              <button
                className="ui-btn ui-btn--secondary"
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

export default App;
