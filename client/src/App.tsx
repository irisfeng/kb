import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/Sidebar';
import { SolutionCard } from './components/SolutionCard';
import { SolutionDetail } from './components/SolutionDetail';
import { UploadForm } from './components/UploadForm';
import { ChatInterface } from './components/ChatInterface';
import { useToast } from './contexts/ToastContext';
import { FileText, Grid3x3, List } from 'lucide-react';
import type { ViewMode, Solution } from './types/solution';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [view, setView] = useState<ViewMode>('solutions');
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Upload Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchSolutions();
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const fetchSolutions = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/solutions');
      setSolutions(res.data);
    } catch (error) {
      console.error('Failed to fetch solutions', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:3001/api/solutions/${id}`);
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
      await axios.post('http://localhost:3001/api/upload', formData, {
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

    try {
      const res = await axios.post('http://localhost:3001/api/chat', {
        messages: newMessages
      });
      setMessages([...newMessages, { role: 'assistant', content: res.data.content }]);
    } catch (error) {
      console.error('Chat failed', error);
      setMessages([...newMessages, { role: 'assistant', content: t('chat.error') }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Roman numerals for solution numbering
  const getRomanNumeral = (index: number) => {
    const numerals = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
    return numerals[index] || index;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex font-sans transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        view={view}
        setView={setView}
        toggleLanguage={toggleLanguage}
        currentLang={i18n.language}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'solution-detail' && selectedSolutionId ? (
          <SolutionDetail
            solutionId={selectedSolutionId}
            onBack={handleBackFromDetail}
          />
        ) : view === 'solutions' ? (
          <div className="max-w-6xl mx-auto px-8 py-12">
            {/* Hero Section */}
            <div className="mb-16 mt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-amber-600 dark:text-amber-500 text-sm font-medium tracking-wider uppercase">Knowledge Archive</p>
                  <h1 className="text-4xl font-serif text-neutral-900 dark:text-white font-light">{t('app.title')}</h1>
                </div>
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 text-lg max-w-2xl leading-relaxed font-light">
                智能方案知识库，提供专业的文档管理与智能检索服务
              </p>

              {/* Stats */}
              <div className="flex gap-12 mt-10">
                <div>
                  <p className="text-3xl font-serif text-amber-600 dark:text-amber-500">{solutions.length}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">已归档方案</p>
                </div>
                <div>
                  <p className="text-3xl font-serif text-amber-600 dark:text-amber-500">
                    {solutions.reduce((acc, s) => acc + (s.fileName?.length || 0), 0)}
                  </p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">文档总数</p>
                </div>
                <div>
                  <p className="text-3xl font-serif text-amber-600 dark:text-amber-500">AI</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">智能检索</p>
                </div>
              </div>
            </div>

            {/* Solutions Section */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-serif text-neutral-900 dark:text-white font-light">方案档案库</h2>
                  <span className="text-neutral-400 dark:text-neutral-500 text-sm">Archive Collection</span>
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-500 shadow-sm'
                        : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400'
                    }`}
                    title="网格视图"
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-500 shadow-sm'
                        : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400'
                    }`}
                    title="列表视图"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {/* Solutions Grid/List */}
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col gap-3'
              }>
                {solutions.map((sol, index) => (
                  <SolutionCard
                    key={sol.id}
                    solution={sol}
                    onDelete={handleDelete}
                    onClick={handleSolutionClick}
                    numeral={getRomanNumeral(index)}
                    index={index}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Empty State */}
              {solutions.length === 0 && (
                <div className="text-center py-20 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
                  <FileText className="text-neutral-400 dark:text-neutral-600 mx-auto mb-4" size={48} />
                  <p className="text-neutral-500 dark:text-neutral-500 text-sm">暂无方案档案，请上传第一个文档</p>
                </div>
              )}
            </div>

            {/* Upload Form - at the bottom */}
            <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800">
              <div className="text-center mb-8">
                <h3 className="text-xl font-serif text-neutral-900 dark:text-white font-light mb-2">上传新方案</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">添加新的文档到档案库</p>
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
          </div>
        ) : (
          <ChatInterface
            messages={messages}
            input={input}
            chatLoading={chatLoading}
            onInputChange={setInput}
            onSubmit={handleChat}
          />
        )}
      </div>
    </div>
  );
}

export default App;
