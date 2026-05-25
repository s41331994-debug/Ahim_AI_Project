import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  FileText, 
  HelpCircle, 
  Languages, 
  Award, 
  Code, 
  CheckSquare, 
  Globe, 
  PenTool,
  Plus, 
  Trash2, 
  Send, 
  Copy, 
  Download, 
  Sparkles, 
  Cpu, 
  MessageSquare, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Paperclip, 
  Check, 
  CornerDownRight, 
  FileCheck2,
  Share2,
  Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PRESET_CONFIGS } from "./presets";
import { ChatMessage, ChatSession, PresetFormConfig } from "./types";
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logOut, 
  testConnection, 
  handleFirestoreError, 
  OperationType 
} from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";

function PresetIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "BookOpen": return <BookOpen className={className} />;
    case "FileText": return <FileText className={className} />;
    case "HelpCircle": return <HelpCircle className={className} />;
    case "Languages": return <Languages className={className} />;
    case "Award": return <Award className={className} />;
    case "Code": return <Code className={className} />;
    case "CheckSquare": return <CheckSquare className={className} />;
    case "Globe": return <Globe className={className} />;
    case "PenTool": return <PenTool className={className} />;
    default: return <Sparkles className={className} />;
  }
}

function CyberLogo() {
  return (
    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xl font-display shadow-md shadow-indigo-500/20 relative overflow-hidden shrink-0">
      <div className="absolute -right-2 -bottom-2 w-6 h-6 bg-white/10 rounded-full"></div>
      A
    </div>
  );
}

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab ] = useState<"chat" | "generator">("chat");
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_CONFIGS[0].id);
  const [presetValues, setPresetValues] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [chatPrompt, setChatPrompt] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Streamlit controls state and local persistence
  const [provider, setProvider] = useState<"gemini" | "groq">(() => {
    return (localStorage.getItem("ahim_provider") as "gemini" | "groq") || "gemini";
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem("ahim_gemini_model") || "gemini-3.5-flash";
  });
  const [groqModel, setGroqModel] = useState<string>(() => {
    return localStorage.getItem("ahim_groq_model") || "llama-3.3-70b-versatile";
  });
  const [groqApiKey, setGroqApiKey] = useState<string>(() => {
    return localStorage.getItem("ahim_groq_api_key") || "";
  });
  const [temperature, setTemperature] = useState<number>(() => {
    const savedTemp = localStorage.getItem("ahim_temperature");
    return savedTemp ? parseFloat(savedTemp) : 0.5;
  });
  
  // Custom File attachments simulation for Drag-and-Drop and Manual Click
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; content: string } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Dynamic UI indicators
  const [apiHealth, setApiHealth] = useState<{ status: string; hasKey: boolean } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [previewOutput, setPreviewOutput] = useState<string>("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state variations to LocalStorage
  useEffect(() => {
    localStorage.setItem("ahim_provider", provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem("ahim_gemini_model", geminiModel);
  }, [geminiModel]);

  useEffect(() => {
    localStorage.setItem("ahim_groq_model", groqModel);
  }, [groqModel]);

  useEffect(() => {
    localStorage.setItem("ahim_groq_api_key", groqApiKey);
  }, [groqApiKey]);

  useEffect(() => {
    localStorage.setItem("ahim_temperature", temperature.toString());
  }, [temperature]);

  // --- DERIVED / RESOLVED DATA ---
  const activePreset = useMemo(() => {
    return PRESET_CONFIGS.find(p => p.id === selectedPresetId) || PRESET_CONFIGS[0];
  }, [selectedPresetId]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  // --- AUTH CONNECTION AND ASYNC TIMESTAMPS ---
  useEffect(() => {
    testConnection(); // Run connection verification test

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync state variations to LocalStorage or Firebase
  useEffect(() => {
    if (!user) {
      const saved = localStorage.getItem("ahim_sessions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as ChatSession[];
          setSessions(parsed);
          if (parsed.length > 0) {
            setActiveSessionId(parsed[0].id);
          }
        } catch (e) {
          console.error("Parsed history failure", e);
        }
      } else {
        createNewChatSession("Obrolan Perdana");
      }
      return;
    }

    // Connect real-time sessions list on Firestore
    const q = query(
      collection(db, "sessions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionList: ChatSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          sessionList.push({
            id: docSnap.id,
            title: data.title || "Untitled Chat",
            createdAt: data.createdAt,
            messages: [], 
          });
        });

        if (sessionList.length === 0) {
          // Upload local browser context seamlessly on login
          const localSaved = localStorage.getItem("ahim_sessions");
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved) as ChatSession[];
              if (parsed.length > 0) {
                parsed.forEach(async (s) => {
                  const cleanedId = s.id.startsWith("session_") ? s.id : `session_${Date.now()}`;
                  await setDoc(doc(db, "sessions", cleanedId), {
                    title: s.title,
                    userId: user.uid,
                    createdAt: s.createdAt || new Date().toISOString()
                  });
                  s.messages.forEach(async (m) => {
                    await setDoc(doc(db, "sessions", cleanedId, "messages", m.id), {
                      role: m.role,
                      text: m.text,
                      timestamp: m.timestamp || new Date().toISOString(),
                      userId: user.uid
                    });
                  });
                });
                return;
              }
            } catch (err) {
              console.error("Failed uploading local sessions on login:", err);
            }
          }

          // Fallback init
          const newId = `session_${Date.now()}`;
          const initialTime = new Date().toISOString();
          setDoc(doc(db, "sessions", newId), {
            title: "Obrolan Perdana (Cloud)",
            userId: user.uid,
            createdAt: initialTime
          }).then(() => {
            setDoc(doc(db, "sessions", newId, "messages", "system-1"), {
              role: "model",
              text: "Salam kenal! Sesi obrolan Anda sekarang **disinkronkan dengan aman di cloud (Firebase)**.\n\nSaya **AHIM AI**, siap mendampingi Anda.",
              timestamp: initialTime,
              userId: user.uid
            });
          });
        } else {
          setSessions(sessionList);
          if (!sessionList.some((s) => s.id === activeSessionId)) {
            setActiveSessionId(sessionList[0].id);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "sessions");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Real-time messages sync under active session ID
  useEffect(() => {
    if (!user || !activeSessionId) return;

    const msgQuery = query(
      collection(db, "sessions", activeSessionId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      msgQuery,
      (snapshot) => {
        const loadedMsgs: ChatMessage[] = [];
        snapshot.forEach((snap) => {
          const m = snap.data();
          loadedMsgs.push({
            id: snap.id,
            role: m.role as "user" | "model",
            text: m.text || "",
            timestamp: m.timestamp || new Date().toISOString(),
          });
        });

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: loadedMsgs,
              };
            }
            return s;
          })
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `sessions/${activeSessionId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [user, activeSessionId]);

  // Initial load config mapping & default preset values
  useEffect(() => {
    const initialVals: Record<string, string> = {};
    PRESET_CONFIGS.forEach(p => {
      p.fields.forEach(f => {
        if (f.defaultValue) {
          initialVals[`${p.id}_${f.id}`] = f.defaultValue;
        }
      });
    });
    setPresetValues(initialVals);

    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        setApiHealth(data);
        if (!data.hasKey) {
          setErrorBanner("Kunci API Gemini (GEMINI_API_KEY) belum terdeteksi. Silakan konfigurasikan di menu Secrets/Secrets panel di pojok kanan atas agar AI dapat menjawab.");
        }
      })
      .catch(err => {
        console.error("Gagal mendeteksi status server:", err);
      });
  }, []);

  // Save session backups offline when not authenticated
  useEffect(() => {
    if (!user && sessions.length > 0) {
      localStorage.setItem("ahim_sessions", JSON.stringify(sessions));
    }
  }, [sessions, user]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [activeSession?.messages, activeTab]);

  // --- ACTIONS ---
  function showToast(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 2500);
  }

  const handleSignIn = async () => {
    try {
      setIsAuthLoading(true);
      await signInWithGoogle();
      showToast("Berhasil masuk! Data disinkronkan ke cloud.");
    } catch (err: any) {
      console.error(err);
      setErrorBanner(`Gagal masuk ke Google Cloud Auth: ${err.message}`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      showToast("Berhasil keluar dari sesi cloud.");
    } catch (err: any) {
      console.error(err);
      setErrorBanner(`Gagal keluar: ${err.message}`);
    }
  };

  async function createNewChatSession(customTitle?: string) {
    const newId = `session_${Date.now()}`;
    const initialText = "Salam kenal! Saya **AHIM AI**, asisten kecerdasan buatan berkecepatan tinggi dan berakurasi maksimal. Saya siap membantu Anda membuat kelengkapan RPP administrasi guru, struktur KTI, generator soal evaluasi, debugging kode, pelokalan bahasa, hingga perumusan ringkasan teks terstruktur.\n\nSilakan pilih menu preset di sebelah kiri untuk menghasilkan rancangan cepat, atau ketik langsung keperluan Anda di bawah.";
    const titleText = customTitle || `Obrolan Baru #${sessions.length + 1}`;
    const timestampStr = new Date().toISOString();

    const newSession: ChatSession = {
      id: newId,
      title: titleText,
      messages: [
        {
          id: "system-1",
          role: "model",
          text: initialText,
          timestamp: timestampStr
        }
      ],
      createdAt: timestampStr
    };

    if (user) {
      try {
        await setDoc(doc(db, "sessions", newId), {
          title: titleText,
          userId: user.uid,
          createdAt: timestampStr
        });
        await setDoc(doc(db, "sessions", newId, "messages", "system-1"), {
          role: "model",
          text: initialText,
          timestamp: timestampStr,
          userId: user.uid
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${newId}`);
      }
    } else {
      setSessions(prev => [newSession, ...prev]);
    }
    setActiveSessionId(newId);
    setActiveTab("chat");
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const confirmed = window.confirm("Hapus sesi percakapan ini secara permanen dari penyimpanan Anda?");
    if (!confirmed) return;

    if (user) {
      try {
        await deleteDoc(doc(db, "sessions", id));
        showToast("Sesi berhasil dihapus.");
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `sessions/${id}`);
      }
    } else {
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      if (activeSessionId === id && updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else if (updated.length === 0) {
        createNewChatSession("Obrolan Baru");
      }
    }
  }

  // Handle preset input value changes
  function handlePresetInputChange(presetId: string, fieldId: string, value: string) {
    setPresetValues(prev => ({
      ...prev,
      [`${presetId}_${fieldId}`]: value
    }));
  }

  // Read current selected preset values helper
  const currentPresetFormValues = useMemo(() => {
    const vals: Record<string, string> = {};
    activePreset.fields.forEach(f => {
      vals[f.id] = presetValues[`${activePreset.id}_${f.id}`] || "";
    });
    return vals;
  }, [activePreset, presetValues]);

  // File drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAttachedFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAttachedFile(file);
    }
  };

  function processAttachedFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        content: content
      });
      showToast(`Berkas "${file.name}" berhasil diunggah.`);
    };
    reader.onerror = () => {
      alert("Gagal membaca dokumen.");
    };
    reader.readAsText(file);
  }

  // --- BACKEND STREAM / FETCH LOGIC ---
  async function handleSendChatMessage(customText?: string) {
    const promptToSend = customText || chatPrompt;
    if (!promptToSend.trim() && !attachedFile) return;

    let fullPromptText = promptToSend;
    if (attachedFile) {
      fullPromptText = `[RUJUKAN LAMPIRAN BERKAS: ${attachedFile.name} (${attachedFile.size})]\n---\n${attachedFile.content}\n---\nBerdasarkan berkas rujukan di atas, lakukan permintaan ini: ${promptToSend}`;
    }

    if (!activeSessionId) {
      createNewChatSession();
    }

    // Capture states before API call
    const userMsgId = `usr_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: promptToSend + (attachedFile ? ` \n*(Melampirkan berkas rujukan: ${attachedFile.name})*` : ""),
      timestamp: new Date().toISOString()
    };

    // Append user message immediately
    const updatedMessagesWithUser = [...(activeSession?.messages || []), userMessage];
    
    if (user) {
      try {
        if (activeSession?.title.startsWith("Obrolan Baru")) {
          await setDoc(doc(db, "sessions", activeSessionId), {
            title: promptToSend.substring(0, 24) + "...",
            userId: user.uid,
            createdAt: activeSession.createdAt || new Date().toISOString()
          }, { merge: true });
        }
        await setDoc(doc(db, "sessions", activeSessionId, "messages", userMsgId), {
          role: "user",
          text: userMessage.text,
          timestamp: userMessage.timestamp,
          userId: user.uid
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${activeSessionId}/messages/${userMsgId}`);
      }
    } else {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: updatedMessagesWithUser,
            title: s.title.startsWith("Obrolan Baru") ? promptToSend.substring(0, 24) + "..." : s.title
          };
        }
        return s;
      }));
    }

    setChatPrompt("");
    setAttachedFile(null);
    setIsGenerating(true);
    setStatusMessage("Menghubungi AHIM AI...");

    try {
      // Build session history for API proxy
      const conversationHistory = updatedMessagesWithUser.slice(0, -1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPromptText,
          history: conversationHistory,
          provider: provider,
          model: provider === "gemini" ? geminiModel : groqModel,
          temperature: temperature,
          groqApiKey: groqApiKey
        })
      });

      const data = await res.json();
      setIsGenerating(false);

      if (data.error) {
        throw new Error(data.error);
      }

      const modelMsgId = `model_${Date.now()}`;
      const modelMessage: ChatMessage = {
        id: modelMsgId,
        role: "model",
        text: data.text || "Mohon maaf, terjadi kegagalan respons.",
        timestamp: new Date().toISOString()
      };

      if (user) {
        try {
          await setDoc(doc(db, "sessions", activeSessionId, "messages", modelMsgId), {
            role: "model",
            text: modelMessage.text,
            timestamp: modelMessage.timestamp,
            userId: user.uid
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.CREATE, `sessions/${activeSessionId}/messages/${modelMsgId}`);
        }
      } else {
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessagesWithUser, modelMessage]
            };
          }
          return s;
        }));
      }

    } catch (err: any) {
      setIsGenerating(false);
      console.error("Kesalahan API:", err);
      
      const errMsgId = `err_${Date.now()}`;
      const errorMessage: ChatMessage = {
        id: errMsgId,
        role: "model",
        text: `⚠️ **Kesalahan Sistem:** ${err.message || 'Harap nyalakan server atau periksa kembali isian Anda.'}`,
        timestamp: new Date().toISOString()
      };

      if (user) {
        try {
          await setDoc(doc(db, "sessions", activeSessionId, "messages", errMsgId), {
            role: "model",
            text: errorMessage.text,
            timestamp: errorMessage.timestamp,
            userId: user.uid
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.CREATE, `sessions/${activeSessionId}/messages/${errMsgId}`);
        }
      } else {
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: [...updatedMessagesWithUser, errorMessage]
            };
          }
          return s;
        }));
      }
    }
  }

  // Execute Dynamic Preset Studio Document Generator
  async function handleGeneratePresetProduct() {
    setIsGenerating(true);
    setStatusMessage("Menyusun draf berakurasi tinggi...");
    setErrorBanner(null);

    // Check configuration variables
    const finalPrompt = activePreset.promptTemplate(currentPresetFormValues);

    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          systemInstruction: activePreset.systemInstruction,
          provider: provider,
          model: provider === "gemini" ? geminiModel : groqModel,
          temperature: temperature,
          groqApiKey: groqApiKey
        })
      });

      const data = await res.json();
      setIsGenerating(false);

      if (data.error) {
        throw new Error(data.error);
      }

      setPreviewOutput(data.text || "Output kosong.");
      showToast(`Produk "${activePreset.title}" berhasil disusun!`);
    } catch (err: any) {
      setIsGenerating(false);
      console.error("Kesalahan Generator:", err);
      setErrorBanner(`Terjadi kendala dalam pembuatan dokumen: ${err.message}`);
    }
  }

  // Copy to clipboard utility
  const handleCopyToClipboard = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    showToast("Salinan berhasil disimpan ke papan klip!");
  };

  // Download raw file text
  const handleDownloadFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Dokumen "${filename}.md" berhasil diunduh.`);
  };

  // Push generated content straight into the active chat session (for iteration!)
  async function sendProductToActiveChat() {
    if (!previewOutput) return;
    
    // Switch to chat
    setActiveTab("chat");
    
    // Seed chat format with a reference statement
    const textToSend = `Berikut adalah draft **${activePreset.title}** yang telah saya buat:\n\n---\n\n${previewOutput}\n\n---\nBagaimana kita mengevaluasi draf sains ini? Silakan berikan revisinya.`;
    
    const userMsgId = `usr_push_${Date.now()}`;
    const modelMsgId = `model_push_${Date.now()}`;

    // Inject automatically
    if (user) {
      try {
        await setDoc(doc(db, "sessions", activeSessionId, "messages", userMsgId), {
          role: "user",
          text: `Gunakan draft generator "${activePreset.title}" sebagai basis perbaikan berikutnya.`,
          timestamp: new Date().toISOString(),
          userId: user.uid
        });
        await setDoc(doc(db, "sessions", activeSessionId, "messages", modelMsgId), {
          role: "model",
          text: textToSend,
          timestamp: new Date().toISOString(),
          userId: user.uid
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `sessions/${activeSessionId}/messages`);
      }
    } else {
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [
              ...s.messages,
              {
                id: userMsgId,
                role: "user",
                text: `Gunakan draft generator "${activePreset.title}" sebagai basis perbaikan berikutnya.`,
                timestamp: new Date().toISOString()
              },
              {
                id: modelMsgId,
                role: "model",
                text: textToSend,
                timestamp: new Date().toISOString()
              }
            ]
          };
        }
        return s;
      }));
    }
    
    showToast("Salinan draf berhasil ditransfer ke jendela obrolan aktif!");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="ahim-root-container">
      
      {/* --- TOP BRAND BAR --- */}
      <header className="border-b border-slate-200 bg-white shadow-sm px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shrink-0" id="ahim-top-header">
        <div className="flex items-center gap-3" id="brand-logo-container">
          <CyberLogo />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-semibold tracking-wide text-slate-900 uppercase" id="brand-name">AHIM AI</h1>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-100/60 font-semibold uppercase tracking-wider">BERKECEPATAN TINGGI</span>
            </div>
            <p className="text-xs text-slate-500 font-sans" id="brand-tagline">Solusi Penulisan, Administrasi Guru & KTI Berakurasi Maksimal</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono" id="header-status-panel">
          {/* Firebase Authentication Status & Action Trigger */}
          {user ? (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/60 px-3 py-1.5 rounded-xl text-slate-700" id="user-profile-badge">
              <img src={user.photoURL || "https://lh3.googleusercontent.com/a/default-user=s96-c"} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full border border-indigo-200" alt="Avatar User" />
              <div className="hidden lg:block text-left text-[10.5px] font-sans">
                <p className="font-semibold text-slate-900 leading-tight">{user.displayName || "Pengguna Cloud"}</p>
                <p className="text-[9.5px] text-slate-500 lowercase leading-none">{user.email}</p>
              </div>
              <button 
                type="button" 
                onClick={handleSignOut} 
                className="ml-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 font-sans transition-all cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-lg border border-slate-200"
                id="btn-logout"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isAuthLoading}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-sans px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer shadow-indigo-600/15"
              id="btn-login-google"
            >
              <Share2 className="w-3.5 h-3.5" />
              Sync Cloud (Google)
            </button>
          )}

          {/* Health indicator bar */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></span>
            <span className="text-slate-600 font-medium">SERVER: AKTIF</span>
            <span className="text-slate-300">|</span>
            <span className="text-indigo-600 font-bold uppercase">{provider === "gemini" ? geminiModel.replace("-", " ") : `GROQ: ${groqModel.split("-")[0]}`}</span>
          </div>

          <div className="text-right">
            <p className="text-slate-400 text-[10px]" id="local-time-label">WAKTU AKTIF (UTC)</p>
            <p className="text-slate-700 font-medium">2026-05-25 07:29</p>
          </div>
        </div>
      </header>

      {/* --- NOTIFICATION TOASTS --- */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-slate-100 px-5 py-3 rounded-xl shadow-[0_4px_25px_rgba(0,0,0,0.18)] flex items-center gap-2.5 z-50 text-sm font-medium"
            id="success-toast"
          >
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ERROR BANNER COUPLER --- */}
      {errorBanner && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-6 py-3 flex items-start gap-3 text-xs sm:text-sm" id="error-alert-banner">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="grow">
            <p className="font-semibold text-rose-300">Pemberitahuan Konfigurasi:</p>
            <p className="mt-0.5 text-slate-300">{errorBanner}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setErrorBanner(null)}
            className="text-slate-400 hover:text-white shrink-0"
            id="error-banner-close-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- MAIN DASHBOARD CONTENT GRID --- */}
      <div className="flex flex-1 overflow-hidden" id="dashboard-main-grid">
        
        {/* ===================== SIDEBAR ===================== */}
        <aside className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 hidden md:flex text-slate-300" id="dashboard-sidebar">
          
          {/* Main workspace navigation tabs */}
          <div className="p-4 border-b border-slate-900 flex gap-2 shrink-0 bg-slate-950" id="sidebar-tab-selectors">
            <button
              id="tab-btn-chat"
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "chat" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                  : "bg-slate-900 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Obrolan AI
            </button>
            <button
              id="tab-btn-generator"
              type="button"
              onClick={() => setActiveTab("generator")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "generator" 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                  : "bg-slate-900 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Studio Alat (Preset)
            </button>
          </div>

          {/* Scrolling sidebar body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6" id="sidebar-scrollable-body">

            {/* Streamlit-style Control Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-4" id="streamlit-control-panel">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900/40 uppercase tracking-widest block w-max mb-1.5">
                  📁 CONTROL PANEL
                </span>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Streamlit Configurations</h4>
              </div>

              {/* Provider selector tab toggle */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400">PROVIDER</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setProvider("gemini")}
                    className={`py-1 text-center text-[10.5px] rounded-md font-semibold transition-all cursor-pointer ${provider === "gemini" ? "bg-indigo-600 text-white shadow-sm" : "bg-transparent text-slate-400 hover:text-white"}`}
                  >
                    Gemini AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider("groq")}
                    className={`py-1 text-center text-[10.5px] rounded-md font-semibold transition-all cursor-pointer ${provider === "groq" ? "bg-indigo-600 text-white shadow-sm" : "bg-transparent text-slate-400 hover:text-white"}`}
                  >
                    Groq AI
                  </button>
                </div>
              </div>

              {/* GROQ API Key Input, shown only when provider is groq */}
              {provider === "groq" && (
                <div className="space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-slate-400">GROQ API KEY</label>
                    <span className="text-[8.5px] text-emerald-400 font-mono">SECURE TRANSIT</span>
                  </div>
                  <input
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder="Masukkan gsk_..."
                    className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-800 focus:border-indigo-500/50 focus:outline-none transition-all font-mono"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Tersimpan secara lokal. Diteruskan aman melalui server proxy sehingga kunci tidak bocor.
                  </p>
                </div>
              )}

              {/* Model Choice Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400">MODEL INFERENCES</label>
                {provider === "gemini" ? (
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 text-xs px-2.5 py-2 rounded-lg border border-slate-800 outline-none font-sans cursor-pointer focus:border-indigo-500/50"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fast)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Analytical)</option>
                  </select>
                ) : (
                  <select
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 text-xs px-2.5 py-2 rounded-lg border border-slate-800 outline-none font-sans cursor-pointer focus:border-indigo-500/50"
                  >
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Versatile)</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Instant Speed)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B (Structured)</option>
                    <option value="gemma2-9b-it">Gemma 2 9B (Accurate)</option>
                  </select>
                )}
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-bold text-slate-400">TEMPERATURE</label>
                  <span className="text-[10px] text-indigo-400 font-bold font-mono bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900/30">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-indigo-200/40">
                  <span>Strict / Factual (0.0)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>

            </div>
            
            {/* Context Section: CHAT SESSIONS */}
            <div className="space-y-2" id="sidebar-sessions-widget">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 tracking-widest uppercase">KOTAK PERCAKAPAN</span>
                <button
                  id="action-btn-new-chat"
                  type="button"
                  onClick={() => createNewChatSession()}
                  className="p-1 px-2.5 rounded bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] text-indigo-400 font-medium flex items-center gap-1 transition-all"
                  title="Buat sesi obrolan baru"
                >
                  <Plus className="w-2.5 h-2.5" />
                  Baru
                </button>
              </div>

              {/* Cloud Synchronization Status Indicator */}
              <div className="px-1 pb-1">
                {user ? (
                  <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-1 rounded flex items-center gap-1.5 animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Tersinkronisasi di Google Cloud</span>
                  </div>
                ) : (
                  <div className="text-[9.5px] font-mono text-amber-500 bg-amber-950/30 border border-amber-900/20 px-2 py-1 rounded leading-tight flex items-start gap-1">
                    <span className="text-[11px] leading-none">💡</span>
                    <span>Sesi lokal di browser Anda. Masuk Google Cloud untuk sinkronisasi otomatis.</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1" id="chat-session-list">
                {sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div
                      id={`chat-item-${sess.id}`}
                      key={sess.id}
                      onClick={() => {
                        setActiveSessionId(sess.id);
                        setActiveTab("chat");
                      }}
                      className={`group w-full p-2.5 px-3 rounded-lg text-xs text-left cursor-pointer flex items-center justify-between gap-2 border transition-all ${
                        isActive && activeTab === "chat"
                          ? "bg-slate-900 border-indigo-500/20 text-white shadow-sm font-semibold"
                          : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-250"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive && activeTab === "chat" ? "text-indigo-400" : "text-slate-600"}`} />
                        <span className="truncate pr-1">{sess.title}</span>
                      </div>
                      <button
                        id={`delete-session-btn-${sess.id}`}
                        type="button"
                        onClick={(e) => deleteSession(sess.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:bg-rose-950/30 hover:text-rose-450 transition-all"
                        title="Hapus obrolan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Context Section: EDUCATION PRESETS */}
            <div className="space-y-2" id="sidebar-edu-presets">
              <span className="text-[11px] font-mono font-bold text-slate-500 tracking-widest uppercase block pb-1 border-b border-slate-900">
                1. BIDANG PENDIDIKAN (GURU & SISWA)
              </span>
              <div className="grid gap-1">
                {PRESET_CONFIGS.filter(p => p.category === "pendidikan").map((preset) => (
                  <button
                    id={`preset-btn-${preset.id}`}
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setActiveTab("generator");
                    }}
                    className={`w-full p-2.5 rounded-lg text-left text-xs border flex items-start gap-3 transition-all cursor-pointer ${
                      selectedPresetId === preset.id && activeTab === "generator"
                        ? "bg-slate-900 border-indigo-500/20 text-white font-semibold"
                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-250"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${
                      selectedPresetId === preset.id && activeTab === "generator"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-500"
                    }`}>
                      <PresetIcon name={preset.iconName} className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow truncate mt-0.5">
                      <p className="font-semibold block truncate text-[11.5px]">{preset.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{preset.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Context Section: GENERAL / TECH PRESETS */}
            <div className="space-y-2" id="sidebar-tech-presets">
              <span className="text-[11px] font-mono font-bold text-slate-500 tracking-widest uppercase block pb-1 border-b border-slate-900">
                2. UMUM & TEKNOLOGI
              </span>
              <div className="grid gap-1">
                {PRESET_CONFIGS.filter(p => p.category === "umum").map((preset) => (
                  <button
                    id={`preset-btn-${preset.id}`}
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setActiveTab("generator");
                    }}
                    className={`w-full p-2.5 rounded-lg text-left text-xs border flex items-start gap-3 transition-all cursor-pointer ${
                      selectedPresetId === preset.id && activeTab === "generator"
                        ? "bg-slate-900 border-indigo-500/20 text-white font-semibold"
                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-250"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md shrink-0 ${
                      selectedPresetId === preset.id && activeTab === "generator"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-500"
                    }`}>
                      <PresetIcon name={preset.iconName} className="w-3.5 h-3.5" />
                    </div>
                    <div className="grow truncate mt-0.5">
                      <p className="font-semibold block truncate text-[11.5px]">{preset.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{preset.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Developer / User block footer */}
          <div className="p-4 border-t border-slate-900 bg-slate-950 flex items-center gap-3 shrink-0" id="sidebar-footer-author">
            <div className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs ring-1 ring-indigo-900/40">
              ME
            </div>
            <div className="grow text-[11px] truncate">
              <p className="text-slate-200 font-medium truncate">s41331994@gmail.com</p>
              <p className="text-slate-500 font-mono text-[9px]">GUEST USER • PREVIEW MODE</p>
            </div>
          </div>
        </aside>

        {/* ===================== WORKSPACE AREA ===================== */}
        <main className="flex-1 bg-slate-50 flex flex-col overflow-hidden relative" id="main-workspace-section">
          
          {/* Mobile Quick Tab Navigation Header (Strict Switch) */}
          <div className="flex md:hidden p-2.5 bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0 select-none gap-2 shadow-sm" id="mobile-tab-navigation">
            <button
              id="mobile-tab-chat"
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "chat" 
                  ? "bg-indigo-600 text-white shadow-sm font-medium" 
                  : "bg-slate-100 text-slate-650 hover:text-slate-800 border border-transparent"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Obrolan
            </button>
            <button
              id="mobile-tab-templates"
              type="button"
              onClick={() => setActiveTab("generator")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "generator" 
                  ? "bg-indigo-600 text-white shadow-sm font-medium" 
                  : "bg-slate-100 text-slate-650 hover:text-slate-800 border border-transparent"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Studio Alat ({activePreset.title.split(' ')[0]})
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col relative">

            {/* LAYER ANIMATION - CHAT MODE ACTIVE */}
            {activeTab === "chat" && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative" id="chat-mode-frame" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                
                {/* Drag-and-Drop Dropzone overlay */}
                <AnimatePresence>
                  {isDragging && (
                    <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="absolute inset-0 bg-slate-900/90 border-4 border-dashed border-indigo-500/80 rounded-lg flex flex-col items-center justify-center z-50 p-6"
                       id="file-dropzone-overlay"
                    >
                      <div className="w-16 h-16 bg-slate-800 rounded-full border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400 animate-bounce shadow">
                        <Paperclip className="w-8 h-8" />
                      </div>
                      <p className="text-lg font-display font-bold text-white mb-1">Lepaskan berkas rujukan untuk AHIM AI</p>
                      <p className="text-xs text-slate-350 max-w-sm text-center">Seret dokumen tulisan, daftar materi (.txt, .md, .js, .json) untuk dijadikan landasan/rujukan pembelajaran otomatis.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Frame Header displaying current active session */}
                <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10" id="chat-header-widget">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 text-indigo-600 font-bold shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-800 tracking-wide" id="chat-title-display">
                        {activeSession ? activeSession.title : "Obrolan Cepat"}
                      </h2>
                      <p className="text-[10px] text-slate-400 font-mono" id="model-latency-label">RESPONSIVE LATENCY • ~0.2S TO 0.4S MAXIMUM ACCURACY</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="copy-chat-btn"
                      type="button"
                      onClick={() => {
                        if (!activeSession) return;
                        const text = activeSession.messages.map(m => `[${m.role === 'user' ? 'GURU/USER' : 'AHIM AI'}] - ${m.text}`).join("\n\n");
                        handleCopyToClipboard(text);
                      }}
                      className="p-1.5 px-3 bg-white hover:bg-slate-50 text-xs rounded-lg border border-slate-200 text-slate-600 hover:text-slate-850 transition-all flex items-center gap-1.5 shadow-sm font-medium"
                      title="Salin seluruh draf obrolan"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Salin Riwayat</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable messages history */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6" id="chat-messages-scroll-well">
                  {activeSession && activeSession.messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    return (
                      <div 
                        key={msg.id} 
                        id={`chat-message-row-${msg.id}`}
                        className={`flex gap-4 max-w-4xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 font-display ${
                          isUser 
                            ? "bg-slate-100 border-slate-200 text-slate-600" 
                            : "bg-indigo-600 border-indigo-550 text-white font-bold shadow-sm"
                        }`}>
                          {isUser ? <FileCheck2 className="w-4.5 h-4.5" /> : <Sparkles className="w-4.5 h-4.5" />}
                        </div>

                        {/* Text bubble block */}
                        <div className="space-y-1 max-w-[85%] md:max-w-[75%]">
                          <div className={`rounded-xl p-4.5 border text-sm leading-relaxed prose overflow-hidden ${
                            isUser 
                              ? "bg-indigo-50/70 border-indigo-150/80 text-slate-800 shadow-sm" 
                              : "bg-white border-slate-200 text-slate-800 shadow-sm"
                          }`} id={`bubble-text-${msg.id}`}>
                            {/* Render Markdown securely with react-markdown */}
                            <div className="markdown-body">
                              <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                          </div>

                          <div className={`flex items-center gap-3 text-[10px] text-slate-450 font-mono px-1.5 ${isUser ? "justify-end" : "justify-start"}`}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <button
                              id={`msg-copy-btn-${msg.id}`}
                              type="button"
                              onClick={() => handleCopyToClipboard(msg.text)}
                              className="text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" /> Salin
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Sinking system/streaming indicator */}
                  {isGenerating && (
                    <div className="flex gap-4 max-w-2xl mr-auto" id="streaming-indicator">
                      <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Cpu className="w-4.5 h-4.5 animate-spin text-white" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 font-mono flex items-center gap-3 shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></div>
                          <span>AHIM AI: {statusMessage}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions panel if chat is clean */}
                {activeSession && activeSession.messages.length <= 1 && (
                  <div className="p-6 pt-0 max-w-3xl mx-auto w-full space-y-4" id="chat-suggestions-panel">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3 shadow-sm" id="suggestion-tip">
                      <Info className="w-5 h-5 text-indigo-650 shrink-0" />
                      <p className="text-xs text-slate-650 leading-relaxed">
                        <strong>Tips Kecepatan Ahim AI:</strong> Ketik langsung administrasi guru, minta draf soal instan, atau seret/unggah silabus akademis lama Anda untuk disesuaikan secara langsung.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="suggestion-cards-grid">
                      <button
                        id="sg-1"
                        type="button"
                        onClick={() => handleSendChatMessage("Buatkan administrasi modul ajar IPA organ peredaran darah Kelas 8 Fase D, Kurikulum Merdeka.")}
                        className="p-4 rounded-xl border border-slate-100 bg-white text-left hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                      >
                        <span className="text-xs text-indigo-600 font-mono font-bold uppercase block mb-1">📐 ADMINISTRASI GURU</span>
                        <p className="text-xs text-slate-500 line-clamp-2">Buatkan RPP / Modul Ajar IPA Peredaran Darah Kelas 8 Fase D lengkap.</p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 ml-auto mt-2 transition-all" />
                      </button>

                      <button
                        id="sg-2"
                        type="button"
                        onClick={() => handleSendChatMessage("Buatkan 5 Soal Pilihan Ganda HOTS tentang termodinamika kelas 11 SMA, lengkap dengan kunci jawaban dan analisis pembahasannya.")}
                        className="p-4 rounded-xl border border-slate-100 bg-white text-left hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                      >
                        <span className="text-xs text-indigo-600 font-mono font-bold uppercase block mb-1">✍️ GENERATOR SOAL</span>
                        <p className="text-xs text-slate-500 line-clamp-2">5 Soal Pilihan Ganda HOTS Termodinamika kelas 11 lengkap pembahasan.</p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 ml-auto mt-2 transition-all" />
                      </button>

                      <button
                        id="sg-3"
                        type="button"
                        onClick={() => handleSendChatMessage("Optimalkan kode JavaScript ini agar menghindari overhead memory: \n```\nfunction findDuplicates(arr) {\n  return arr.filter((item, index) => arr.indexOf(item) !== index);\n}\n```")}
                        className="p-4 rounded-xl border border-slate-100 bg-white text-left hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                      >
                        <span className="text-xs text-indigo-600 font-mono font-bold uppercase block mb-1">💻 CODING MASTER</span>
                        <p className="text-xs text-slate-500 line-clamp-2">Optimasi kode memori fungsi filter JavaScript.</p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 ml-auto mt-2 transition-all" />
                      </button>

                      <button
                        id="sg-4"
                        type="button"
                        onClick={() => handleSendChatMessage("Berikan feedback kritis untuk draf paragraf kesimpulan KTI saya ini: \"Penggunaan gadget terbukti memperparah fokus belajar murid secara signifikan tapi mereka juga memperoleh akses pengetahuan baru yang bernilai positif.\"")}
                        className="p-4 rounded-xl border border-slate-100 bg-white text-left hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer group"
                      >
                        <span className="text-xs text-indigo-600 font-mono font-bold uppercase block mb-1">🔬 ULASAN TUGAS / KTI</span>
                        <p className="text-xs text-slate-500 line-clamp-2">Ulasan kritis kesimpulan draf KTI tentang pengaruh gadget siswa.</p>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 ml-auto mt-2 transition-all" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat attachments status box */}
                {attachedFile && (
                  <div className="px-6 py-2.5 shrink-0 bg-slate-50 border-t border-slate-100 flex items-center gap-3 text-xs shadow-inner" id="chat-attachment-bar">
                    <span className="font-mono text-indigo-600 font-bold uppercase">LAMPIRAN AKTIF:</span>
                    <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-2 text-slate-650 shadow-sm">
                      <span>📄 {attachedFile.name} ({attachedFile.size})</span>
                      <button 
                        type="button" 
                        onClick={() => setAttachedFile(null)}
                        className="text-slate-450 hover:text-slate-650"
                        id="remove-attachment-btn"
                        title="Hapus berkas rujukan"
                      >
                        <X className="w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Chat send keyboard inputs (Manual upload / click action included) */}
                <div className="p-6 border-t border-slate-200 bg-white shrink-0 shadow-[0_-2px_15px_rgba(0,0,0,0.02)]" id="chat-input-bar-container">
                  <div className="max-w-4xl mx-auto flex items-end gap-3" id="input-form-structure">
                    
                    {/* File Attachment invisible selector */}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileInputChange}
                      className="hidden" 
                      accept=".txt,.md,.json,.js,.py,.c,.java"
                      id="hidden-file-input"
                    />

                    {/* Left Icon: Manual File Upload button */}
                    <button
                      id="btn-trigger-upload"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 hover:text-slate-800 border border-slate-200 text-slate-500 transition-all shrink-0 cursor-pointer shadow-sm"
                      title="Unggah berkas rujukan (Drag-and-Drop juga aktif)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    {/* Deep Chat Area */}
                    <div className="grow relative bg-slate-100 rounded-xl border border-slate-200 focus-within:border-indigo-500/50 transition-all px-4 py-2" id="chat-textarea-wrapper">
                      <textarea
                        id="chat-textarea-input"
                        placeholder="Tanya AHIM AI atau olah berkas draf tulisan di sini..."
                        rows={1}
                        value={chatPrompt}
                        onChange={(e) => setChatPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        style={{ resize: 'none' }}
                        className="w-full bg-transparent text-slate-800 text-sm focus:outline-none placeholder-slate-450 max-h-36 min-h-[24px] overflow-y-auto"
                      />
                    </div>

                    {/* Send button */}
                    <button
                      id="btn-send-message"
                      type="button"
                      onClick={() => handleSendChatMessage()}
                      disabled={isGenerating || (!chatPrompt.trim() && !attachedFile)}
                      className={`p-3 rounded-xl transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                        chatPrompt.trim() || attachedFile
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-transform"
                          : "bg-slate-100 text-slate-350 border border-slate-200 cursor-not-allowed"
                      }`}
                    >
                      <Send className="w-5 h-5" />
                    </button>

                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-2 hover:text-slate-500">Tekan Enter untuk mengirim obrolan secara instan.</p>
                </div>

              </div>
            )}

            {/* LAYER ANIMATION - DYNAMIC STRUCTURAL STUDIO GENERATOR ACTIVE */}
            {activeTab === "generator" && (
              <div className="flex-1 flex flex-col sm:flex-row overflow-hidden" id="generator-mode-frame">
                
                {/* 1. LEFT PANEL: CUSTOM DYNAMIC FIELD CONFIGURATIONS */}
                <div className="w-full sm:w-[420px] border-r border-slate-200 bg-white overflow-y-auto p-6 flex flex-col shrink-0 shadow-sm" id="generator-fields-sidebar">
                  
                  {/* Preset branding header */}
                  <div className="pb-5 border-b border-slate-100 mb-6" id="generator-preset-banner">
                    <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-widest block mb-1">
                      {activePreset.category === "pendidikan" ? "📚 PRESET PENDIDIKAN" : "🚀 PRESET UMUM & TEKNOLOGI"}
                    </span>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <PresetIcon name={activePreset.iconName} className="w-5 h-5 text-indigo-600 shrink-0" />
                      {activePreset.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{activePreset.description}</p>
                  </div>

                  {/* Form fields */}
                  <form 
                    id="preset-dynamic-form" 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGeneratePresetProduct();
                    }}
                    className="space-y-5 flex-1"
                  >
                    {activePreset.fields.map((f) => {
                      const valueKey = `${activePreset.id}_${f.id}`;
                      const currentValue = presetValues[valueKey] || "";

                      return (
                        <div key={f.id} className="space-y-2 text-xs" id={`form-group-${f.id}`}>
                          <label className="text-slate-700 font-semibold block" htmlFor={`preset-${f.id}`}>
                            {f.label} {f.required && <span className="text-indigo-600">*</span>}
                          </label>

                          {f.type === "text" && (
                            <input
                              id={`preset-${f.id}`}
                              type="text"
                              value={currentValue}
                              onChange={(e) => handlePresetInputChange(activePreset.id, f.id, e.target.value)}
                              placeholder={f.placeholder}
                              required={f.required}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-xs"
                            />
                          )}

                          {f.type === "number" && (
                            <input
                              id={`preset-${f.id}`}
                              type="number"
                              value={currentValue}
                              onChange={(e) => handlePresetInputChange(activePreset.id, f.id, e.target.value)}
                              placeholder={f.placeholder}
                              required={f.required}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-xs"
                            />
                          )}

                          {f.type === "textarea" && (
                            <textarea
                              id={`preset-${f.id}`}
                              rows={5}
                              value={currentValue}
                              onChange={(e) => handlePresetInputChange(activePreset.id, f.id, e.target.value)}
                              placeholder={f.placeholder}
                              required={f.required}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 rounded-lg p-3 text-slate-800 placeholder-slate-400 focus:outline-none transition-all leading-normal text-xs"
                            />
                          )}

                          {f.type === "select" && (
                            <select
                              id={`preset-${f.id}`}
                              value={currentValue}
                              onChange={(e) => handlePresetInputChange(activePreset.id, f.id, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/50 rounded-lg p-3 text-slate-800 focus:outline-none transition-all text-xs"
                            >
                              {f.options?.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-white text-slate-805">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}

                    {/* Submission / Generate button */}
                    <button
                      id="submit-preset-btn"
                      type="submit"
                      disabled={isGenerating}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.15)] focus:outline-none cursor-pointer transition-all shrink-0 uppercase tracking-wider text-xs"
                    >
                      {isGenerating ? (
                        <>
                          <Cpu className="w-4 h-4 animate-spin" />
                          <span>{statusMessage}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Mulai Menyusun Draf</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* 2. RIGHT PANEL: GENERATOR LIVE OUTPUT PREVIEW */}
                <div className="flex-grow bg-slate-100/40 p-6 flex flex-col overflow-hidden" id="generator-output-viewer">
                  
                  {/* Toolbar actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 shrink-0" id="viewer-toolbar">
                    <div>
                      <h3 className="text-sm font-bold tracking-wide text-indigo-600 uppercase font-mono">HASIL UTAMA STUDIO</h3>
                      <p className="text-[10px] text-slate-400 font-mono" id="latency-indicator">DRAFTING WITH ADVANCED STRUCTURE AND CLEAN LEXICON</p>
                    </div>

                    {previewOutput && (
                      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto justify-end" id="toolbar-actions-bar">
                        <button
                          id="btn-copy-preview"
                          type="button"
                          onClick={() => handleCopyToClipboard(previewOutput)}
                          className="p-1.5 px-3 bg-white hover:bg-slate-50 text-xs text-slate-650 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm font-medium"
                          title="Salin hasil penulisan"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Hasil</span>
                        </button>

                        <button
                          id="btn-download-preview"
                          type="button"
                          onClick={() => handleDownloadFile(activePreset.id, previewOutput)}
                          className="p-1.5 px-3 bg-white hover:bg-slate-50 text-xs text-slate-650 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all shadow-sm font-medium"
                          title="Unduh file format markdown"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Markdown</span>
                        </button>

                        <button
                          id="btn-pipe-chat"
                          type="button"
                          onClick={sendProductToActiveChat}
                          className="p-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-xs text-indigo-650 border border-indigo-100 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all font-medium"
                          title="Lanjutkan penulisan draf di Workspace Percakapan"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          <span>Lanjutkan Di Chat</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Document View Well */}
                  <div className="flex-1 overflow-y-auto mt-4" id="document-rendered-view">
                    {previewOutput ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative max-w-4xl mx-auto" id="rendered-output-card">
                        
                        {/* Custom visual decoration: Hex frame on top right */}
                        <div className="absolute top-4 right-4 text-indigo-600/10 pointer-events-none uppercase font-mono text-[9px]">
                          AHIM AI OFFICIAL CERTIFIED GENERATION
                        </div>

                        {/* Markdown Output */}
                        <article className="prose text-slate-800 text-sm leading-relaxed max-w-none">
                          <div className="markdown-body">
                            <ReactMarkdown>{previewOutput}</ReactMarkdown>
                          </div>
                        </article>

                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-4" id="empty-output-state">
                        <div className="w-14 h-14 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
                          <FileCheck2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-700">Draf Belum Dibuat</h4>
                        <p className="text-xs text-slate-455 mt-1 leading-normal">
                          Silakan isi data formulir di panel sebelah kiri lalu tekan tombol **"Mulai Menyusun Draf"** untuk memerintahkan AHIM AI menyusun dokumen administrasi atau teknis yang lengkap berakurasi tinggi.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>

        </main>

      </div>

    </div>
  );
}
