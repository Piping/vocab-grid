import { useState, useEffect } from 'react';
import './App.css';
import vocabDB from './idb';
import vocabData from './assets/vocab_gre.json';

function App() {
  const [words, setWords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rememberedWords, setRememberedWords] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});
  const [hoveredWordId, setHoveredWordId] = useState(null);
  const [wordsPerPage, setWordsPerPage] = useState(5);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridColumnStart, setGridColumnStart] = useState(3);

  // 加载grid-column-start设置
  useEffect(() => {
    const savedGridColumnStart = localStorage.getItem('gridColumnStart');
    if (savedGridColumnStart) {
      setGridColumnStart(parseInt(savedGridColumnStart));
    }
  }, []);

  // 保存grid-column-start设置
  useEffect(() => {
    localStorage.setItem('gridColumnStart', gridColumnStart.toString());
  }, [gridColumnStart]);

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
        // 转换数据格式以匹配现有代码
        const formattedData = data.map((item, index) => ({
          id: index + 1,
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

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach(timerId => {
        clearInterval(timerId);
      });
    };
  }, [hoverTimers]);

  // 计算总页数，确保至少为1
  const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));

  // 获取当前页的单词
  const indexOfLastWord = currentPage * wordsPerPage;
  const indexOfFirstWord = indexOfLastWord - wordsPerPage;
  const currentWords = words.slice(indexOfFirstWord, indexOfLastWord);

  // 切换页面
  const handlePageChange = (page) => {
    // 停止所有发音
    window.speechSynthesis.cancel();
    // 清除所有悬停定时器
    Object.values(hoverTimers).forEach(timerId => {
      clearInterval(timerId);
    });
    setHoverTimers({});
    setCurrentPage(page);
  };

  // 添加J/K快捷键控制分页
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, totalPages, handlePageChange]);

  // 切换单词记忆状态
  const toggleRemember = (id) => {
    setRememberedWords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 播放单词发音
  const playPronunciation = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    window.speechSynthesis.speak(utterance);
  };

  // 翻页后根据鼠标位置播放对应单词发音
  useEffect(() => {
    if (currentWords.length > 0) {
      // 延迟一点时间，确保页面已经更新
      setTimeout(() => {
        // 查找鼠标悬停的单词
        const hoveredWord = currentWords.find(word => word.id === hoveredWordId);
        if (hoveredWord) {
          playPronunciation(hoveredWord.word);
        }
      }, 100);
    }
  }, [currentPage, currentWords, playPronunciation, hoveredWordId]);

  // 开始悬停发音定时器
  const startHoverTimer = (id, word) => {
    // 清除可能存在的旧定时器
    if (hoverTimers[id]) {
      clearInterval(hoverTimers[id]);
    }
    // 立即播放一次
    playPronunciation(word);
    // 设置每隔2秒播放一次的定时器
    const timerId = setInterval(() => {
      playPronunciation(word);
    }, 1000);
    // 保存定时器ID
    setHoverTimers(prev => ({...prev, [id]: timerId}));
  };

  // 清除悬停发音定时器
  const clearHoverTimer = (id) => {
    if (hoverTimers[id]) {
      clearInterval(hoverTimers[id]);
      setHoverTimers(prev => {
        const newTimers = {...prev};
        delete newTimers[id];
        return newTimers;
      });
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Vocab Grid</h1>
        <p>点击单词卡片标记已记住的单词</p>

        <div className="settings-panel">
          <div className="settings-item">
              <label htmlFor="wordsPerPage">每页显示单词数 (1-100):</label>
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
                className="settings-input"
              />
            </div>

            {currentWords.length === 1 && (
              <div className="settings-item">
                <label htmlFor="gridColumnStart">设置grid-column-start: </label>
                <input
                  type="number"
                  id="gridColumnStart"
                  value={gridColumnStart}
                  min="1"
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1) {
                      setGridColumnStart(value);
                    }
                  }}
                  className="settings-input"
                />
              </div>
            )}

          <div className="settings-item">
            <label htmlFor="showDefinitions">
              <input
                type="checkbox"
                id="showDefinitions"
                checked={showDefinitions}
                onChange={(e) => setShowDefinitions(e.target.checked)}
              />
              总是显示单词释义
            </label>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading">加载单词数据中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>        
          <main className="words-grid">
            {currentWords.map(word => (
              <div 
                key={word.id}
                className={`word-card ${rememberedWords[word.id] ? 'remembered' : ''}`}
                style={currentWords.length === 1 ? { gridColumnStart } : {}}
                onClick={() => toggleRemember(word.id)}
                title={showDefinitions ? undefined : `${word.definition} 悬停播放发音`}
                onMouseLeave={() => {
                  // 停止所有发音
                  window.speechSynthesis.cancel();
                  // 清除所有悬停定时器
                  Object.values(hoverTimers).forEach(timerId => {
                    clearInterval(timerId);
                  });
                  setHoveredWordId(null);
                }}
                onMouseOver={() => {
                  startHoverTimer(word.id, word.word);
                  setHoveredWordId(word.id);
                }}
              >
                <span className="word-text">{word.word}</span>
                {rememberedWords[word.id] && (
                  <span className="remembered-badge">✓</span>
                )}
                {showDefinitions && (
                  <span className="word-definition">{word.definition}</span>
                )}
              </div>
            ))}
          </main>

          <footer className="pagination-controls">
            <button
              className="page-nav-button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <div className="page-input-container">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages && !isNaN(page)) {
                    setCurrentPage(page);
                  }
                }}
                className="page-input"
              />
              <span className="page-total">/ {totalPages}</span>
            </div>
            <button
              className="page-nav-button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </footer>
        </>
      )}
    </div>
  );
}

export default App
