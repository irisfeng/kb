import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/Sidebar';
import { SolutionCard } from './components/SolutionCard';
import { SolutionDetail } from './components/SolutionDetail';
import { UploadForm } from './components/UploadForm';
import { ChatInterface } from './components/ChatInterface';
import { CapabilityLibrary } from './components/CapabilityLibrary';
import { SolutionGenerator } from './components/SolutionGenerator';
import { DraftList } from './components/DraftList';
import { SolutionEditor } from './components/SolutionEditor';
import { useToast } from './contexts/ToastContext';
import { getChatHistory, saveChatHistory, clearChatHistory, removeSolutionChat } from './utils/storage';
import { FileText, Grid3x3, List, Upload, Archive, Search } from 'lucide-react';
import type { ViewMode, Solution, ChatMessage, DraftSolution } from './types/solution';
import { Pagination } from './components/Pagination';

function App() {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [view, setView] = useState<ViewMode>('solutions');
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<DraftSolution | null>(null);
  const [showGeneratorForm, setShowGeneratorForm] = useState(false);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = getChatHistory('global');
    if (savedHistory.length > 0) {
      setMessages(savedHistory);
    }
  }, []);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory('global', messages);
    }
  }, [messages]);

  useEffect(() => {
    fetchSolutions();
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const fetchSolutions = async () => {
    try {
      const res = await axios.get('/api/solutions');
      setSolutions(res.data);
    } catch (error) {
      console.error('Failed to fetch solutions', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/solutions/${id}`);
      removeSolutionChat(id);
      showSuccess(t('solutions.card.delete_success'));
      fetchSolutions();
    } catch (error) {
      console.error('Delete failed', error);
      showError(t('solutions.form.fail'));
    }
  };

  const handleSolutionClick = (id: string) => {
    setSelectedSolutionId(id);
    setView('solution-detail');
  };

  const handleBackFromDetail = () => {
    setSelectedSolutionId(null);
    setView('solutions');
  };

  const handleClearGlobalChat = () => {
    if (window.confirm(t('chat.clear_confirm') || '确认清空所有对话记录？此操作无法撤销。')) {
      const success = clearChatHistory('global');
      if (success) {
        setMessages([]);
      } else {
        showError(t('chat.clear_failed') || '清空失败，请稍后重试');
      }
    }
  };

  const handleResendMessage = (message: ChatMessage) => {
    setInput(message.content);
    const messageIndex = messages.findIndex(m => m === message);
    if (messageIndex !== -1) {
      const updatedMessages = messages.slice(0, messageIndex);
      setMessages(updatedMessages);
    }
  };

  const handleEditMessage = (message: ChatMessage) => {
    setInput(message.content);
    const messageIndex = messages.findIndex(m => m === message);
    if (messageIndex !== -1) {
      const updatedMessages = messages.slice(0, messageIndex);
      setMessages(updatedMessages);
    }
  };

  const handleDeleteMessage = (index: number) => {
    if (window.confirm(t('chat.delete_confirm') || '确认删除这条消息？')) {
      const updatedMessages = messages.filter((_, i) => i !== index);
      setMessages(updatedMessages);
    }
  };

  // Draft handlers
  const handleDraftGenerated = (draft: DraftSolution) => {
    setSelectedDraft(draft);
    setSelectedDraftId(draft.id);
    setShowGeneratorForm(false);
    setView('editor');
  };

  const handleSelectDraft = (draft: DraftSolution) => {
    setSelectedDraft(draft);
    setSelectedDraftId(draft.id);
    setShowGeneratorForm(false);
    setView('editor');
  };

  const handleBackFromEditor = () => {
    setSelectedDraft(null);
    setSelectedDraftId(null);
    setShowGeneratorForm(false);
    setView('generator');
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await axios.delete(`/api/drafts/${id}`);
      showSuccess('删除成功');
      setSelectedDraft(null);
      setSelectedDraftId(null);
      setView('generator');
    } catch (error) {
      console.error('Delete draft failed', error);
      showError('删除失败');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);

    try {
      await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
      showSuccess(t('solutions.form.success'));
      setTitle('');
      setDescription('');
      setFile(null);
      setUploadProgress(0);
      fetchSolutions();
      setView('solutions');
    } catch (error) {
      console.error('Upload failed', error);
      showError(t('solutions.form.fail'));
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setChatLoading(true);
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No reader available');

      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setChatLoading(false);
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setMessages([...newMessages, { role: 'assistant', content: t('chat.error') }]);
                setChatLoading(false);
                return;
              }

              if (parsed.content) {
                assistantMessage += parsed.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === 'assistant') lastMsg.content = assistantMessage;
                  return updated;
                });
              }

              if (parsed.isComplete || parsed.citations) {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === 'assistant') {
                    lastMsg.citations = parsed.citations || [];
                    lastMsg.relatedSolutions = parsed.relatedSolutions || [];
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.log('[Debug] JSON parse error:', e.message);
            }
          }
        }
      }

      setChatLoading(false);
    } catch (error) {
      console.error('Chat failed', error);
      setMessages([...newMessages, { role: 'assistant', content: t('chat.error') }]);
      setChatLoading(false);
    }
  };

  // Roman numerals for solution numbering
  const getRomanNumeral = (index: number) => {
    const numerals = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
    return numerals[index] || index;
  };

  // Filter solutions based on search query
  const filteredSolutions = solutions.filter(solution =>
    solution.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    solution.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    solution.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredSolutions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedSolutions = filteredSolutions.slice(startIndex, endIndex);

  // Reset to page 1 when search or solutions change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredSolutions.length, totalPages, currentPage]);

  return (
    <div className="h-screen bg-white dark:bg-dark-bg flex font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        view={view}
        setView={setView}
        toggleLanguage={toggleLanguage}
        currentLang={i18n.language}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {view === 'solution-detail' && selectedSolutionId ? (
          <SolutionDetail
            solutionId={selectedSolutionId}
            onBack={handleBackFromDetail}
          />
        ) : view === 'capabilities' ? (
          <CapabilityLibrary />
        ) : view === 'editor' && (selectedDraftId || selectedDraft) ? (
          <SolutionEditor
            draftId={selectedDraftId || undefined}
            draft={selectedDraft || undefined}
            onBack={handleBackFromEditor}
            onDelete={handleDeleteDraft}
          />
        ) : view === 'generator' ? (
          showGeneratorForm ? (
            <SolutionGenerator
              onGenerated={handleDraftGenerated}
              onBack={() => setShowGeneratorForm(false)}
            />
          ) : (
            <DraftList
              onSelectDraft={handleSelectDraft}
              onNewDraft={() => setShowGeneratorForm(true)}
            />
          )
        ) : view === 'upload' ? (
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            <div className="mb-8 sm:mb-12 mt-4 sm:mt-8">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Upload className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-amber-600 dark:text-amber-500 text-xs sm:text-sm font-medium tracking-wider uppercase">Upload</p>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif text-neutral-900 dark:text-white font-light">{t('app.nav.upload')}</h1>
                </div>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm sm:text-base max-w-2xl leading-relaxed">
                上传新的方案文档到知识库，支持 PDF、Word、Markdown 等多种格式
              </p>
            </div>
            <UploadForm
              title={title}
              description={description}
              file={file}
              uploading={uploading}
              uploadProgress={uploadProgress}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onFileChange={setFile}
              onSubmit={handleUpload}
            />
          </div>
        ) : (
          <div className="pb-8">
            {/* Hero Section - natural scroll */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                    <Archive className="text-white" size={16} />
                  </div>
                  <div>
                    <p className="text-amber-600 dark:text-amber-500 text-[10px] sm:text-xs font-medium tracking-wider uppercase">Knowledge Archive</p>
                    <h1 className="text-base sm:text-lg lg:text-xl font-serif text-neutral-900 dark:text-white font-medium">{t('app.title')}</h1>
                  </div>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm max-w-2xl leading-relaxed font-light mb-3 sm:mb-4">
                  智能方案知识库，提供专业的文档管理与智能检索服务
                </p>

                {/* Stats - ultra compact */}
                <div className="flex gap-4 sm:gap-6 lg:gap-8">
                  <div className="text-center">
                    <p className="text-lg sm:text-xl lg:text-2xl font-serif text-amber-600 dark:text-amber-500 font-medium">{solutions.length}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs mt-0.5">已归档方案</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl lg:text-2xl font-serif text-amber-600 dark:text-amber-500 font-medium">{solutions.length}</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs mt-0.5">文档总数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg sm:text-xl lg:text-2xl font-serif text-amber-600 dark:text-amber-500 font-medium">AI</p>
                    <p className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs mt-0.5">智能检索</p>
                  </div>
                </div>
              </div>

              {/* Solutions Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <h2 className="text-base sm:text-lg lg:text-xl font-serif text-neutral-900 dark:text-white font-medium">方案档案库</h2>
                    <span className="text-neutral-400 dark:text-neutral-500 text-[10px] sm:text-xs">Archive Collection</span>
                    <span className="text-neutral-400 dark:text-neutral-500 text-[10px] sm:text-xs">({filteredSolutions.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Search Box */}
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索方案..."
                        className="w-32 sm:w-40 lg:w-48 pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all duration-200 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                      />
                    </div>
                    {/* View Toggle */}
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-neutral-100 dark:bg-dark-card rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-dark-card text-amber-600 dark:text-amber-500 shadow-sm'
                          : 'text-neutral-400 dark:text-dark-muted hover:text-neutral-600 dark:hover:text-dark-text'
                      }`}
                      title="网格视图"
                    >
                      <Grid3x3 size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-dark-card text-amber-600 dark:text-amber-500 shadow-sm'
                          : 'text-neutral-400 dark:text-dark-muted hover:text-neutral-600 dark:hover:text-dark-text'
                      }`}
                      title="列表视图"
                    >
                      <List size={14} />
                    </button>
                  </div>
                </div>
                </div>

                {/* Solutions Grid/List */}
                {filteredSolutions.length > 0 ? (
                  <>
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
                      : 'flex flex-col gap-2 sm:gap-3'
                    }>
                      {displayedSolutions.map((sol, index) => (
                        <SolutionCard
                          key={sol.id}
                          solution={sol}
                          onDelete={handleDelete}
                          onClick={handleSolutionClick}
                          numeral={getRomanNumeral(startIndex + index)}
                          index={startIndex + index}
                          viewMode={viewMode}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={solutions.length}
                        itemsPerPage={itemsPerPage}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 sm:py-12 lg:py-16 border-2 border-dashed border-neutral-300 dark:border-dark-border rounded-2xl">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-neutral-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="text-neutral-400 dark:text-dark-muted" size={40} />
                    </div>
                    <p className="text-neutral-500 dark:text-dark-muted text-lg mb-2">暂无方案档案</p>
                    <p className="text-neutral-400 dark:text-dark-textSecondary text-sm">点击左侧"上传方案"开始添加您的第一个方案</p>
                  </div>
                )}
                </div>
              </div>

              {/* AI Assistant Section */}
              <div className="border-t-2 border-neutral-200 dark:border-neutral-800 pt-6">
                <ChatInterface
                messages={messages}
                input={input}
                chatLoading={chatLoading}
                onInputChange={setInput}
                onSubmit={handleChat}
                solutions={solutions}
                onSolutionClick={handleSolutionClick}
                onClearChat={handleClearGlobalChat}
                onResend={handleResendMessage}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
