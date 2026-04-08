import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Leaf, 
  Droplets, 
  Sun, 
  Thermometer, 
  Wind, 
  Sprout, 
  AlertCircle, 
  Send, 
  MessageCircle, 
  X, 
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { identifyPlant, chatWithAssistant, type PlantInfo } from './services/geminiService';

// --- Types ---
interface Message {
  role: 'user' | 'model';
  content: string;
}

// --- Components ---

const LoadingOverlay = ({ message }: { message: string }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-sage-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
  >
    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
      <Loader2 className="w-12 h-12 text-sage-600 animate-spin mb-4" />
      <h3 className="text-xl font-serif font-bold text-sage-900 mb-2">正在分析您的植物...</h3>
      <p className="text-sage-600 italic">{message}</p>
    </div>
  </motion.div>
);

const CareCard = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="bg-white p-4 rounded-2xl border border-sage-100 shadow-sm flex flex-col gap-2">
    <div className="flex items-center gap-2 text-sage-600">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-sage-900 text-sm leading-relaxed">{value}</p>
  </div>
);

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadingMessages = [
    "正在识别植物特征...",
    "正在查阅植物数据库...",
    "正在分析叶片图案和纹理...",
    "正在确定最佳养护条件...",
    "马上就好！正在准备您的指南..."
  ];

  useEffect(() => {
    if (isAnalyzing) {
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(loadingMessages[i % loadingMessages.length]);
        i++;
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        processImage(reader.result as string, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setLoadingMessage(loadingMessages[0]);
    try {
      const base64Data = base64.split(',')[1];
      const info = await identifyPlant(base64Data, mimeType);
      setPlantInfo(info);
      
      // Auto-start chat with a welcoming message
      setChatMessages([
        { 
          role: 'model', 
          content: `你好！我已经识别出你的植物是 **${info.name}**。这是一个非常棒的选择！我为你准备了详细的养护指南。你对它有什么具体的问题吗？` 
        }
      ]);
    } catch (error) {
      console.error("Identification failed:", error);
      alert("抱歉，我无法识别这株植物。请尝试拍摄更清晰的照片。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      let fullResponse = "";
      setChatMessages(prev => [...prev, { role: 'model', content: "" }]);

      const stream = chatWithAssistant(userMsg, history);
      for await (const chunk of stream) {
        fullResponse += chunk;
        setChatMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = fullResponse;
          return newMsgs;
        });
      }
    } catch (error) {
      console.error("Chat failed:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-sage-100 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-sage-600 p-2 rounded-xl">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-sage-900">植护 AI</h1>
          </div>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 hover:bg-sage-100 rounded-full transition-colors relative"
          >
            <MessageCircle className="w-6 h-6 text-sage-600" />
            {chatMessages.length > 0 && !isChatOpen && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-earth-500 border-2 border-white rounded-full" />
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-8">
        <AnimatePresence>
          {isAnalyzing && <LoadingOverlay message={loadingMessage} />}
        </AnimatePresence>

        {/* Hero / Upload Section */}
        {!plantInfo && !isAnalyzing && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-8 py-12"
          >
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-6xl font-serif font-bold text-sage-950 mb-6 leading-tight">
                只需一张照片，<br />
                <span className="text-sage-500 italic">即可识别任何植物。</span>
              </h2>
              <p className="text-lg text-sage-600 mb-10">
                获取即时养护指南、浇水计划以及针对您的绿色朋友的专家建议。
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative w-full max-w-md aspect-video bg-white rounded-[2rem] border-2 border-dashed border-sage-200 hover:border-sage-400 hover:bg-sage-100/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden shadow-sm"
            >
              <div className="bg-sage-100 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-sage-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sage-900">拍摄照片或上传</p>
                <p className="text-sm text-sage-500">支持 JPG, PNG，最大 10MB</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </motion.section>
        )}

        {/* Results Section */}
        {plantInfo && (
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Image & Basic Info */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white">
                <img 
                  src={image!} 
                  alt="Uploaded plant" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => { setPlantInfo(null); setImage(null); }}
                  className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full hover:bg-white transition-colors"
                >
                  <X className="w-5 h-5 text-sage-900" />
                </button>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-sage-100">
                <div className="flex items-center gap-2 text-earth-600 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">已识别植物</span>
                </div>
                <h2 className="text-4xl font-serif font-bold text-sage-950 mb-1">{plantInfo.name}</h2>
                <p className="text-sage-500 italic mb-4">{plantInfo.scientificName}</p>
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-1.5 flex-1 bg-sage-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${plantInfo.confidence * 100}%` }}
                      className="h-full bg-sage-500"
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-sage-600">
                    {Math.round(plantInfo.confidence * 100)}% 置信度
                  </span>
                </div>
                <p className="text-sage-700 leading-relaxed">
                  {plantInfo.description}
                </p>
              </div>

              <div className="bg-earth-100 p-6 rounded-[2rem] border border-earth-200">
                <div className="flex items-center gap-2 text-earth-700 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <h4 className="font-bold">常见问题</h4>
                </div>
                <ul className="space-y-2">
                  {plantInfo.commonIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-earth-800">
                      <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Care Instructions */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <h3 className="text-2xl font-serif font-bold text-sage-900 flex items-center gap-2">
                <Sprout className="w-6 h-6 text-sage-600" />
                养护指南
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CareCard 
                  icon={Droplets} 
                  label="浇水" 
                  value={plantInfo.careInstructions.watering} 
                />
                <CareCard 
                  icon={Sun} 
                  label="光照" 
                  value={plantInfo.careInstructions.light} 
                />
                <CareCard 
                  icon={ImageIcon} 
                  label="土壤" 
                  value={plantInfo.careInstructions.soil} 
                />
                <CareCard 
                  icon={Thermometer} 
                  label="温度" 
                  value={plantInfo.careInstructions.temperature} 
                />
                <CareCard 
                  icon={Wind} 
                  label="湿度" 
                  value={plantInfo.careInstructions.humidity} 
                />
                <CareCard 
                  icon={Leaf} 
                  label="施肥" 
                  value={plantInfo.careInstructions.fertilizing} 
                />
              </div>

              <div className="bg-sage-600 text-white p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-sage-200 font-bold uppercase tracking-widest text-xs mb-2">趣味小知识</h4>
                  <p className="text-xl font-serif italic leading-relaxed">
                    "{plantInfo.funFact}"
                  </p>
                </div>
                <Leaf className="absolute -bottom-8 -right-8 w-48 h-48 text-white/10 rotate-12" />
              </div>

              <button 
                onClick={() => setIsChatOpen(true)}
                className="w-full bg-white border-2 border-sage-200 p-6 rounded-[2rem] flex items-center justify-between hover:bg-sage-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-sage-100 p-3 rounded-2xl group-hover:bg-sage-200 transition-colors">
                    <MessageCircle className="w-6 h-6 text-sage-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sage-900">还有更多问题？</p>
                    <p className="text-sm text-sage-500">咨询我们的园艺专家 Flora。</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-sage-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.section>
        )}
      </main>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-sage-950/20 backdrop-blur-sm z-40"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-sage-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sage-600 rounded-full flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sage-900">Flora 助手</h3>
                    <p className="text-xs text-sage-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      在线
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-sage-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-sage-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-sage-50 p-6 rounded-full mb-4">
                      <MessageCircle className="w-12 h-12 text-sage-300" />
                    </div>
                    <h4 className="font-serif text-xl font-bold text-sage-900 mb-2">开始对话</h4>
                    <p className="text-sage-500">询问任何关于植物养护、病虫害或园艺技巧的问题！</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-sage-600 text-white rounded-tr-none" 
                        : "bg-sage-100 text-sage-900 rounded-tl-none"
                    )}>
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-sage-400 mt-1 uppercase font-bold tracking-widest">
                      {msg.role === 'user' ? '您' : 'Flora'}
                    </span>
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex flex-col items-start max-w-[85%]">
                    <div className="bg-sage-100 p-4 rounded-2xl rounded-tl-none flex gap-1">
                      <span className="w-1.5 h-1.5 bg-sage-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-sage-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-sage-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form 
                onSubmit={handleSendMessage}
                className="p-6 border-t border-sage-100 bg-sage-50/50"
              >
                <div className="relative">
                  <input 
                    type="text" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="输入问题..."
                    className="w-full bg-white border border-sage-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500 transition-all shadow-sm"
                  />
                  <button 
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-sage-600 text-white rounded-xl flex items-center justify-center hover:bg-sage-700 disabled:opacity-50 disabled:hover:bg-sage-600 transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-sage-100 p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sage-400 mb-2">
          <Leaf className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">植护 AI</span>
        </div>
        <p className="text-sm text-sage-500">您的绿色家居伴侣。</p>
      </footer>
    </div>
  );
}
