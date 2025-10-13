import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";

interface Category {
  category_id: string;
  category_name: string;
}

interface Channel {
  stream_id: number;
  name: string;
  category_id: string;
}

interface EPGItem {
  start: string;
  end: string;
  title: string;
  description?: string;
}

const TV = () => {
  const navigate = useNavigate();
  
  const user_info = JSON.parse(localStorage.getItem('user_info') || '{}');
  const server_info = JSON.parse(localStorage.getItem('server_info') || '{}');
  const username = user_info.username || '';
  const password = user_info.password || '';
  const baseURL = `${server_info.server_protocol || 'http'}://${server_info.url}:${server_info.port}`;

  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [epgData, setEpgData] = useState<EPGItem[]>([]);
  
  const [focusPanel, setFocusPanel] = useState<'categories' | 'channels'>('categories');
  const [focusIndex, setFocusIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [longPressChannel, setLongPressChannel] = useState<Channel | null>(null);
  
  const [pinOverlayVisible, setPinOverlayVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!username || !server_info.url) {
      alert('Erro: dados do login não encontrados.');
      navigate('/');
      return;
    }

    const cats = localStorage.getItem('tv_categories');
    const chans = localStorage.getItem('tv_streams');
    
    if (!cats || !chans) {
      alert('Listas de canais não encontradas. Atualize na Home.');
      navigate('/home');
      return;
    }

    const categoriesData: Category[] = JSON.parse(cats);
    const channelsData: Channel[] = JSON.parse(chans);

    // Adicionar categoria Favoritos se não existir
    if (categoriesData.length > 0 && !categoriesData.find(c => c.category_name === "Favoritos")) {
      categoriesData.splice(0, 0, { category_id: "favorites", category_name: "⭐ Favoritos" });
    }

    setCategories(categoriesData);
    setChannels(channelsData);
    setFilteredChannels(channelsData);
  }, [navigate, username, server_info.url]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const decodeBase64 = (str: string) => {
    try {
      return decodeURIComponent(escape(atob(str)));
    } catch {
      return str;
    }
  };

  const loadEPG = async (stream_id: number) => {
    try {
      const url = `${baseURL}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}&limit=6`;
      const resp = await fetch(url);
      const data = await resp.json();
      setEpgData(data.epg_listings || []);
    } catch {
      setEpgData([]);
    }
  };

  const playChannel = (channel: Channel) => {
    const url = `${baseURL}/live/${username}/${password}/${channel.stream_id}.m3u8`;
    setLoading(true);

    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }

    if ((window as any).Hls && (window as any).Hls.isSupported()) {
      const hls = new (window as any).Hls();
      hls.loadSource(url);
      hls.attachMedia(videoRef.current!);
      hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().then(() => {
            setLoading(false);
            setTimeout(() => {
              if (videoRef.current) videoRef.current.muted = false;
            }, 800);
          }).catch(() => {
            videoRef.current?.play();
            setLoading(false);
          });
        }
      });
      hlsRef.current = hls;
    } else if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.play();
      setLoading(false);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.muted = false;
      }, 800);
    }
  };

  const selectCategory = (cat: Category | null) => {
    setCurrentCategory(cat);
    
    const favIds = JSON.parse(localStorage.getItem('fav_channels') || '[]');
    
    if (cat?.category_id === 'favorites') {
      const filtered = channels.filter(c => favIds.includes(c.stream_id));
      setFilteredChannels(filtered);
    } else if (cat) {
      const filtered = channels.filter(c => c.category_id === cat.category_id);
      setFilteredChannels(filtered);
    } else {
      setFilteredChannels(channels);
    }
    
    setFocusPanel('channels');
    setFocusIndex(0);
  };

  const trySelectCategory = (cat: Category) => {
    const name = cat.category_name.toLowerCase();
    if (name.includes('adult')) {
      setPendingCategory(cat);
      setPinOverlayVisible(true);
      setPinInput('');
      setTimeout(() => pinInputRef.current?.focus(), 100);
    } else {
      selectCategory(cat);
    }
  };

  const handlePinInput = (value: string) => {
    setPinInput(value);
    if (value.length === 4) {
      const correctPin = localStorage.getItem('pin_code') || '0000';
      setPinOverlayVisible(false);
      if (value === correctPin && pendingCategory) {
        selectCategory(pendingCategory);
      }
      setPinInput('');
      setPendingCategory(null);
    }
  };

  const selectChannel = (ch: Channel, isLongPress = false) => {
    if (isLongPress) {
      toggleFavorite(ch);
      return;
    }
    
    if (!currentChannel || currentChannel.stream_id !== ch.stream_id) {
      setCurrentChannel(ch);
      playChannel(ch);
      loadEPG(ch.stream_id);
    } else {
      toggleFullscreen();
    }
  };

  const toggleFavorite = (channel: Channel) => {
    let favs = JSON.parse(localStorage.getItem('fav_channels') || '[]');
    const idx = favs.indexOf(channel.stream_id);
    
    if (idx >= 0) {
      favs.splice(idx, 1);
      toast({
        title: "Removido dos favoritos",
        description: channel.name,
      });
    } else {
      favs.push(channel.stream_id);
      toast({
        title: "⭐ Adicionado aos favoritos",
        description: channel.name,
      });
    }
    
    localStorage.setItem('fav_channels', JSON.stringify(favs));
    
    // Se estiver na categoria favoritos, recarrega
    if (currentCategory?.category_id === 'favorites') {
      const filtered = channels.filter(c => favs.includes(c.stream_id));
      setFilteredChannels(filtered);
    }
  };

  const toggleFullscreen = () => {
    setMenuVisible(!menuVisible);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Back button
      if (e.keyCode === 10009) {
        if (!menuVisible) {
          toggleFullscreen();
        } else {
          navigate('/home');
        }
        return;
      }

      // Enter to toggle menu when hidden
      if (!menuVisible && e.key === 'Enter') {
        toggleFullscreen();
        return;
      }

      if (!menuVisible) return;

      // Tecla 0 ou F2 para favoritar
      if ((e.key === '0' || e.key === 'F2') && focusPanel === 'channels') {
        const channel = filteredChannels[focusIndex];
        if (channel) toggleFavorite(channel);
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          moveFocus(-1);
          break;
        case 'ArrowDown':
          moveFocus(1);
          break;
        case 'ArrowLeft':
          moveFocusSide('left');
          break;
        case 'ArrowRight':
          moveFocusSide('right');
          break;
        case 'Enter':
          enterFocus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusPanel, focusIndex, menuVisible, filteredChannels, currentCategory, navigate]);

  const moveFocus = (delta: number) => {
    const list = getList();
    if (!list.length) return;
    setFocusIndex(Math.max(0, Math.min(list.length - 1, focusIndex + delta)));
  };

  const moveFocusSide = (dir: 'left' | 'right') => {
    const panels: ('categories' | 'channels')[] = ['categories', 'channels'];
    let idx = panels.indexOf(focusPanel);
    idx = dir === 'right' ? Math.min(panels.length - 1, idx + 1) : Math.max(0, idx - 1);
    setFocusPanel(panels[idx]);

    if (panels[idx] === 'categories' && currentCategory) {
      const catIndex = categories.findIndex(c => c.category_id === currentCategory.category_id);
      setFocusIndex(Math.max(0, catIndex + 1));
    } else {
      setFocusIndex(0);
    }
  };

  const getList = () => {
    if (focusPanel === 'categories') return ['all', ...categories];
    if (focusPanel === 'channels') return filteredChannels;
    return [];
  };

  const enterFocus = () => {
    if (focusPanel === 'categories') {
      if (focusIndex === 0) {
        selectCategory(null);
      } else {
        trySelectCategory(categories[focusIndex - 1]);
      }
    } else if (focusPanel === 'channels') {
      const channel = filteredChannels[focusIndex];
      if (channel) selectChannel(channel);
    }
  };

  const renderEPG = () => {
    if (!epgData.length) {
      return <div className="p-4 text-white/70">Sem programação disponível</div>;
    }

    const now = new Date();
    return epgData.slice(0, 5).map((p, i) => {
      const start = new Date(p.start);
      const end = new Date(p.end);
      const total = end.getTime() - start.getTime();
      const elapsed = Math.max(0, Math.min(total, now.getTime() - start.getTime()));
      const progress = total > 0 ? (elapsed / total) * 100 : 0;
      const isNow = now >= start && now < end;
      const title = decodeBase64(p.title);
      const desc = decodeBase64(p.description || '');

      return (
        <div
          key={i}
          className={`bg-white/[0.08] rounded-lg p-3 px-4 mb-2 ${
            isNow ? 'border-4 border-[#6F61EF] bg-[rgba(111,97,239,0.25)]' : 'border-4 border-transparent'
          }`}
        >
          <div className="font-bold text-white">{title}</div>
          {desc && <div className="mt-1 text-sm text-[#ccc] leading-snug">{desc}</div>}
          <div className="w-full h-[6px] bg-white/10 rounded-[3px] mt-[6px] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6F61EF] to-[#8F81FF] transition-all duration-[400ms] linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-white mt-1">
            {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -{' '}
            {end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Video Player */}
      <video
        ref={videoRef}
        className="fixed top-0 left-0 w-full h-full object-cover z-0 bg-black"
        onClick={() => !menuVisible && setMenuVisible(true)}
      />

      {/* Menu Container */}
      <div
        className={`fixed top-0 left-0 w-full h-full flex gap-6 p-6 backdrop-blur-[16px] bg-black/35 z-10 transition-opacity duration-300 ${
          menuVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Categories Panel */}
        <div 
          className="flex-1 flex flex-col overflow-hidden"
          style={{ pointerEvents: focusPanel === 'categories' ? 'auto' : 'none' }}
        >
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            <div
              onClick={() => selectCategory(null)}
              className={`bg-white/5 mb-2 rounded-lg p-3 px-4 cursor-pointer transition-all
                ${currentCategory === null ? 'bg-[rgba(111,97,239,0.4)] text-white border-l-4 border-l-[#6F61EF] scale-[1.02]' : 'text-white border-l-4 border-l-transparent'}
                ${focusPanel === 'categories' && focusIndex === 0 ? 'border-4 border-[#6F61EF]' : 'border-4 border-transparent'}`}
            >
              Todos os Canais
            </div>
            {categories.map((cat, index) => {
              const isFocused = focusPanel === 'categories' && focusIndex === index + 1;
              const isActive = currentCategory?.category_id === cat.category_id;
              return (
                <div
                  key={cat.category_id}
                  onClick={() => trySelectCategory(cat)}
                  className={`bg-white/5 mb-2 rounded-lg p-3 px-4 cursor-pointer transition-all
                    ${isActive ? 'bg-[rgba(111,97,239,0.4)] text-white border-l-4 border-l-[#6F61EF] scale-[1.02]' : 'text-white border-l-4 border-l-transparent'}
                    ${isFocused ? 'border-4 border-[#6F61EF]' : 'border-4 border-transparent'}`}
                >
                  {cat.category_name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Channels Panel */}
        <div 
          className="flex-1 flex flex-col overflow-hidden"
          style={{ pointerEvents: focusPanel === 'channels' ? 'auto' : 'none' }}
        >
          <div className="bg-white/10 p-2 mb-2 rounded text-xs text-white/70 text-center">
            Mantenha pressionado o canal para adicionar aos favoritos | Tecla 0
          </div>
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {filteredChannels.map((ch, index) => {
              const isFocused = focusPanel === 'channels' && focusIndex === index;
              const isFavorite = JSON.parse(localStorage.getItem('fav_channels') || '[]').includes(ch.stream_id);
              return (
                <div
                  key={ch.stream_id}
                  onClick={() => selectChannel(ch)}
                  onMouseDown={() => {
                    const timer = setTimeout(() => {
                      selectChannel(ch, true);
                    }, 800);
                    setLongPressTimer(timer);
                    setLongPressChannel(ch);
                  }}
                  onMouseUp={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                      setLongPressTimer(null);
                    }
                  }}
                  onMouseLeave={() => {
                    if (longPressTimer) {
                      clearTimeout(longPressTimer);
                      setLongPressTimer(null);
                    }
                  }}
                  className={`bg-white/5 mb-2 rounded-lg p-3 px-4 cursor-pointer text-white transition-all relative
                    ${isFocused ? 'border-4 border-[#6F61EF]' : 'border-4 border-transparent'}`}
                >
                  {isFavorite && (
                    <span className="absolute top-2 right-2 text-yellow-400">⭐</span>
                  )}
                  {ch.name}
                </div>
              );
            })}
          </div>
        </div>

        {/* EPG Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-[3px]">
            {currentChannel ? renderEPG() : <div className="p-4 text-white/70">Selecione um canal...</div>}
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="border-[5px] border-white/15 border-t-[#6F61EF] rounded-full w-[60px] h-[60px] animate-spin" />
        </div>
      )}

      {/* PIN Overlay */}
      {pinOverlayVisible && (
        <div
          className={`fixed inset-0 bg-black/65 backdrop-blur-[12px] flex items-center justify-center z-[100] transition-opacity duration-300 ${
            pinOverlayVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="bg-[rgba(30,30,40,0.6)] border-2 border-[rgba(111,97,239,0.7)] rounded-[20px] p-10 px-[60px] text-center shadow-[0_0_25px_rgba(111,97,239,0.3)] animate-in fade-in zoom-in duration-300">
            <div className="text-xl font-medium text-[#EDEAFF] mb-[18px]">🔒 Categoria Bloqueada</div>
            <input
              ref={pinInputRef}
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => handlePinInput(e.target.value)}
              className="text-2xl text-center p-2 border-b-[3px] border-[#6F61EF] bg-transparent text-white w-[160px] outline-none focus:border-[#8F81FF] tracking-[12px]"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TV;
