import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Movie {
  stream_id: number;
  name: string;
  stream_icon?: string;
  rating?: string;
  vote_average?: string;
  category_id?: string;
}

interface Category {
  category_id: string;
  category_name: string;
}

const Filmes = () => {
  const navigate = useNavigate();
  const TMDB_KEY = "695e9abb631cdcd111ab8cb93c52a08f";
  const PLACEHOLDER_ACTOR = "https://www.themoviedb.org/assets/2/v4/glyphicons/basic/glyphicons-basic-4-user-grey-d8fe957375e70239d6abdd549fd7568c89281b2179b5f4470e2e12895792dfa5.svg";

  const user_info = JSON.parse(localStorage.getItem('user_info') || '{}');
  const server_info = JSON.parse(localStorage.getItem('server_info') || '{}');
  const username = user_info.username || '';
  const password = user_info.password || '';
  const baseURL = `${server_info.server_protocol || 'http'}://${server_info.url || 'qetu.cc'}:${server_info.port || '8880'}`;

  const [categories, setCategories] = useState<Category[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [focusSection, setFocusSection] = useState<'search' | 'categories' | 'movies'>('categories');
  const [focusIndex, setFocusIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingMode, setTypingMode] = useState(false);

  // Overlay states
  const [overlayActive, setOverlayActive] = useState(false);
  const [movieBasic, setMovieBasic] = useState<any>(null);
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [overlayFocus, setOverlayFocus] = useState<'back' | 'watch' | 'fav'>('back');
  const [cast, setCast] = useState<any[]>([]);

  // Player states
  const [playerActive, setPlayerActive] = useState(false);
  const [pauseMenuVisible, setPauseMenuVisible] = useState(false);
  const [pauseFocus, setPauseFocus] = useState<'continue' | 'close'>('continue');

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const searchBoxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cats = JSON.parse(localStorage.getItem('vod_categories') || '[]');
    let movs = JSON.parse(localStorage.getItem('vod_streams') || '[]');

    if (cats.length > 0 && !cats.find((c: Category) => c.category_name === "Todos os Filmes")) {
      cats.unshift({ category_id: "all", category_name: "Todos os Filmes" });
    }
    if (cats.length > 1 && !cats.find((c: Category) => c.category_name === "Favoritos")) {
      cats.splice(1, 0, { category_id: "favorites", category_name: "Favoritos" });
    }

    movs.sort((a: Movie, b: Movie) => (b.stream_id || 0) - (a.stream_id || 0));

    setCategories(cats);
    setMovies(movs);

    if (cats.length > 0) {
      const favIds = JSON.parse(localStorage.getItem('fav_movies') || '[]');
      const hasFavs = movs.some((m: Movie) => favIds.includes(m.stream_id));
      let startIndex = hasFavs ? 1 : (cats.length > 2 ? 2 : 0);
      selectCategory(startIndex);
    }
  }, []);

  const formatRating = (value: any) => {
    const num = parseFloat(value);
    return isNaN(num) ? 'N/A' : num.toFixed(1);
  };

  const selectCategory = (index: number) => {
    const cat = categories[index];
    setCurrentCategory(cat);
    loadMovies(cat.category_id);
    setFocusSection('movies');
    setFocusIndex(0);
  };

  const loadMovies = (categoryId: string) => {
    const favIds = JSON.parse(localStorage.getItem('fav_movies') || '[]');
    
    let filtered: Movie[];
    if (categoryId === 'favorites') {
      filtered = movies.filter(m => favIds.includes(m.stream_id));
    } else if (categoryId && categoryId !== 'all') {
      filtered = movies.filter(m => m.category_id === categoryId);
    } else {
      filtered = movies;
    }

    setFilteredMovies(filtered);
  };

  const applySearch = () => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = movies.filter(m => (m.name || '').toLowerCase().includes(term));
    setFilteredMovies(filtered);
    setFocusSection('movies');
    setFocusIndex(0);
  };

  useEffect(() => {
    if (searchTerm) {
      applySearch();
    } else if (currentCategory) {
      loadMovies(currentCategory.category_id);
    }
  }, [searchTerm]);

  const openMoviePopup = async (movie: Movie) => {
    setMovieBasic(movie);
    setOverlayActive(true);
    setOverlayFocus('back');

    try {
      const url = `${baseURL}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_info&vod_id=${movie.stream_id}`;
      const res = await fetch(url);
      const data = await res.json();
      setMovieInfo(data || {});

      const tmdbId = data?.info?.tmdb_id;
      if (tmdbId) {
        await loadCast(tmdbId);
      }
    } catch (err) {
      console.error('Erro ao carregar info do filme:', err);
    }
  };

  const loadCast = async (tmdbId: string) => {
    try {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_KEY}&language=pt-BR`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.cast) {
        setCast(data.cast.slice(0, 10));
      }
    } catch (e) {
      console.error('Erro ao carregar elenco:', e);
    }
  };

  const closeInfoOverlay = () => {
    if (playerActive) closePlayer();
    setOverlayActive(false);
    setCast([]);
    setFocusSection('movies');
  };

  const getVodUrl = () => {
    const streamId = movieBasic?.stream_id || movieInfo?.movie_data?.stream_id;
    let ext = (movieInfo?.info?.container_extension || movieInfo?.movie_data?.container_extension || 'mp4').replace('.', '');
    return `${baseURL}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${ext}`;
  };

  const openPlayer = () => {
    const src = getVodUrl();
    setPlayerActive(true);
    setPauseMenuVisible(false);

    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }

    const isHLS = src.endsWith('.m3u8');
    if (isHLS && (window as any).Hls && (window as any).Hls.isSupported()) {
      const hls = new (window as any).Hls({ lowLatencyMode: true, enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(videoRef.current!);
      hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => videoRef.current?.play().catch(() => {}));
      hlsRef.current = hls;
    } else if (videoRef.current) {
      videoRef.current.src = src;
      videoRef.current.play().catch(() => {});
    }
  };

  const closePlayer = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    setPauseMenuVisible(false);
    setPlayerActive(false);
    setOverlayFocus('back');
  };

  const toggleFavorite = () => {
    let favs = JSON.parse(localStorage.getItem('fav_movies') || '[]');
    const idx = favs.indexOf(movieBasic.stream_id);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(movieBasic.stream_id);
    }
    localStorage.setItem('fav_movies', JSON.stringify(favs));

    if (currentCategory?.category_id === 'favorites') {
      loadMovies('favorites');
    }
  };

  const isFavorite = () => {
    const favs = JSON.parse(localStorage.getItem('fav_movies') || '[]');
    return favs.includes(movieBasic?.stream_id);
  };

  useEffect(() => {
    if (overlayActive || playerActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (focusSection === 'search') {
        if (e.key === 'ArrowDown') {
          setFocusSection('categories');
          setFocusIndex(0);
          setTypingMode(false);
          searchBoxRef.current?.blur();
        } else if (e.key === 'Enter' || e.key === 'OK') {
          if (!typingMode) {
            setTypingMode(true);
            searchBoxRef.current?.focus();
          } else {
            setTypingMode(false);
            searchBoxRef.current?.blur();
            setFocusSection('movies');
            setFocusIndex(0);
          }
        } else if (e.key === 'ArrowRight') {
          setFocusSection('movies');
          setFocusIndex(0);
          setTypingMode(false);
          searchBoxRef.current?.blur();
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          setTypingMode(false);
          searchBoxRef.current?.blur();
          setSearchTerm('');
          setFocusSection('categories');
          const idx = categories.findIndex(c => c === currentCategory);
          setFocusIndex(idx >= 0 ? idx : 0);
        }
      } else if (focusSection === 'categories') {
        if (e.key === 'ArrowDown') {
          setFocusIndex((focusIndex + 1) % categories.length);
        } else if (e.key === 'ArrowUp' && focusIndex === 0) {
          setFocusSection('search');
          setFocusIndex(0);
        } else if (e.key === 'ArrowUp') {
          setFocusIndex(Math.max(0, focusIndex - 1));
        } else if (e.key === 'Enter' || e.key === 'OK') {
          selectCategory(focusIndex);
        } else if (e.key === 'ArrowRight' && currentCategory) {
          setFocusSection('movies');
          setFocusIndex(0);
        }
      } else if (focusSection === 'movies') {
        const totalCols = 4;
        if (e.key === 'ArrowRight') {
          setFocusIndex(Math.min(focusIndex + 1, filteredMovies.length - 1));
        } else if (e.key === 'ArrowLeft' && focusIndex % totalCols === 0) {
          setFocusSection('categories');
          const idx = categories.findIndex(c => c === currentCategory);
          setFocusIndex(idx >= 0 ? idx : 0);
        } else if (e.key === 'ArrowLeft') {
          setFocusIndex(Math.max(0, focusIndex - 1));
        } else if (e.key === 'ArrowDown') {
          setFocusIndex(Math.min(focusIndex + totalCols, filteredMovies.length - 1));
        } else if (e.key === 'ArrowUp') {
          if (focusIndex < totalCols) {
            setFocusSection('categories');
            const idx = categories.findIndex(c => c === currentCategory);
            setFocusIndex(idx >= 0 ? idx : 0);
          } else {
            setFocusIndex(Math.max(0, focusIndex - totalCols));
          }
        } else if (e.key === 'Enter' || e.key === 'OK') {
          const movie = filteredMovies[focusIndex];
          if (movie) openMoviePopup(movie);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusSection, focusIndex, categories, filteredMovies, currentCategory, typingMode, overlayActive, playerActive]);

  useEffect(() => {
    if (!overlayActive) return;

    const handleOverlayKeys = (e: KeyboardEvent) => {
      if (playerActive) {
        if (pauseMenuVisible) {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            setPauseFocus(pauseFocus === 'continue' ? 'close' : 'continue');
          } else if (e.key === 'Enter' || e.key === 'OK') {
            if (pauseFocus === 'continue') {
              setPauseMenuVisible(false);
              videoRef.current?.play().catch(() => {});
            } else {
              closePlayer();
            }
          } else if (e.key === 'Escape' || e.key === 'Backspace') {
            closePlayer();
          }
        } else {
          if (e.key === 'Enter' || e.key === 'OK') {
            e.preventDefault();
            videoRef.current?.pause();
            setPauseMenuVisible(true);
            setPauseFocus('continue');
          } else if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault();
            closePlayer();
          }
        }
      } else {
        if (e.key === 'ArrowRight') {
          if (overlayFocus === 'back') setOverlayFocus('watch');
          else if (overlayFocus === 'watch') setOverlayFocus('fav');
          else if (overlayFocus === 'fav') setOverlayFocus('back');
        } else if (e.key === 'ArrowLeft') {
          if (overlayFocus === 'fav') setOverlayFocus('watch');
          else if (overlayFocus === 'watch') setOverlayFocus('back');
          else if (overlayFocus === 'back') setOverlayFocus('fav');
        } else if (e.key === 'Enter' || e.key === 'OK') {
          if (overlayFocus === 'watch') openPlayer();
          else if (overlayFocus === 'back') closeInfoOverlay();
          else if (overlayFocus === 'fav') toggleFavorite();
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          closeInfoOverlay();
        }
      }
    };

    document.addEventListener('keydown', handleOverlayKeys);
    return () => document.removeEventListener('keydown', handleOverlayKeys);
  }, [overlayActive, playerActive, pauseMenuVisible, overlayFocus, pauseFocus]);

  // Load HLS.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const info = movieInfo?.info || {};
  const name = info.name || movieBasic?.name || 'Filme';
  const poster = info.cover_big || info.movie_image || movieBasic?.stream_icon;
  const bg = (info.backdrop_path && info.backdrop_path[0]) || poster;
  const year = info.releasedate?.slice(0, 4) || '';
  const genre = info.genre || '';
  const duration = info.duration || '';
  const rating = info.rating || movieBasic?.rating || '';
  const director = info.director || '';
  const desc = info.description || info.plot || '—';

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-[460px] bg-black/75 border-r-2 border-white/10 p-5 overflow-y-auto flex flex-col scroll-smooth
                      [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-[3px]">
        <input
          ref={searchBoxRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Buscar filmes..."
          className={`w-full p-4 mb-[18px] text-[22px] rounded-lg bg-white/10 text-white transition-all
                     ${focusSection === 'search' ? 'border-[6px] border-[#6F61EF]' : 'border-[6px] border-transparent'}`}
        />
        
        <div>
          {categories.map((cat, index) => {
            const favIds = JSON.parse(localStorage.getItem('fav_movies') || '[]');
            const count = cat.category_id === 'all' ? movies.length :
                         cat.category_id === 'favorites' ? movies.filter(m => favIds.includes(m.stream_id)).length :
                         movies.filter(m => m.category_id === cat.category_id).length;

            const isActive = cat === currentCategory;
            const isFocused = focusSection === 'categories' && focusIndex === index;

            return (
              <div
                key={cat.category_id}
                onClick={() => selectCategory(index)}
                className={`p-4 px-5 rounded-lg mb-3 cursor-pointer text-2xl flex justify-between items-center transition-all
                           ${isActive && isFocused ? 'border-[6px] border-[#6F61EF] bg-[rgba(112,99,235,0.35)] text-white font-bold' :
                             isActive ? 'border-[6px] border-transparent bg-[rgba(112,99,235,0.15)] text-white font-bold' :
                             isFocused ? 'border-[6px] border-[#6F61EF] bg-white/5 text-white font-bold' :
                             'border-[6px] border-transparent bg-white/5 text-[#ccc]'}`}
              >
                <span>{cat.category_name}</span>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-none grid grid-cols-4 gap-[10px] content-start justify-items-center">
        {filteredMovies.length === 0 ? (
          <p className="col-span-4 text-center text-[22px] text-white/70">Nenhum filme encontrado.</p>
        ) : (
          filteredMovies.map((movie, i) => {
            const isFocused = focusSection === 'movies' && focusIndex === i;
            return (
              <div
                key={movie.stream_id}
                onClick={() => openMoviePopup(movie)}
                className={`relative bg-black/65 rounded-[10px] overflow-hidden cursor-pointer w-[350px] h-[485px] transition-all
                           ${isFocused ? 'border-[6px] border-[#6F61EF]' : 'border-[6px] border-transparent'}`}
              >
                <div className="absolute top-2 right-2 bg-black/70 text-[#FFD700] font-bold text-xl px-3 py-[6px] rounded-lg z-[2] pointer-events-none">
                  ⭐ {formatRating(movie.rating || movie.vote_average)}
                </div>
                <img
                  src={movie.stream_icon || 'https://via.placeholder.com/350x485?text=Filme'}
                  alt={movie.name}
                  className="w-full h-full object-cover rounded-[6px] bg-[#222]"
                />
              </div>
            );
          })
        )}
      </div>

      {/* Info Overlay */}
      {overlayActive && (
        <div className="fixed inset-0 bg-black z-[100] overflow-hidden">
          <div className="relative w-full min-h-screen flex flex-col items-start justify-start overflow-hidden">
            {/* Hero Background */}
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${bg || poster || ''}')` }} />
            <div className="absolute inset-0 bg-black/65" />

            {/* Hero Content */}
            <div className="relative z-[2] flex gap-10 items-start justify-start w-full p-10 pt-10">
              <img
                src={poster || 'https://via.placeholder.com/600x900?text=Poster'}
                alt="Poster do filme"
                className="w-[380px] h-auto rounded-[14px] border-4 border-white/[0.08] shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
              />
              <div className="max-w-[800px] flex flex-col gap-[14px]">
                <h1 className="text-[40px] leading-[1.15] m-0">{name}</h1>
                
                <div className="flex flex-wrap gap-[10px]">
                  {year && <div className="text-base px-3 py-2 rounded-full border border-white/[0.18] bg-white/[0.06] text-white">{year}</div>}
                  {duration && <div className="text-base px-3 py-2 rounded-full border border-white/[0.18] bg-white/[0.06] text-white">{duration}</div>}
                  {genre && <div className="text-base px-3 py-2 rounded-full border border-white/[0.18] bg-white/[0.06] text-white">{genre}</div>}
                  {rating && <div className="text-base px-3 py-2 rounded-full border border-[rgba(255,215,0,0.45)] bg-[rgba(255,215,0,0.1)] text-[#FFD700]">⭐ {formatRating(rating)}</div>}
                </div>

                {director && <div className="flex gap-[14px] flex-wrap text-[#bbb] text-base"><strong>Direção:</strong> {director}</div>}
                
                <div className="text-lg leading-[1.6] text-[#ddd] whitespace-pre-wrap mt-2">{desc}</div>

                <div className="flex gap-5 mt-5 justify-start">
                  <button
                    onClick={closeInfoOverlay}
                    className={`flex-[0_0_200px] text-center bg-white/[0.08] rounded-[14px] text-white px-[26px] py-[14px] text-xl cursor-pointer transition-all
                               ${overlayFocus === 'back' ? 'border-[6px] border-[#6F61EF]' : 'border-[6px] border-transparent'}`}
                  >
                    ⟵ Voltar
                  </button>
                  <button
                    onClick={openPlayer}
                    className={`flex-[0_0_200px] text-center bg-white/[0.08] rounded-[14px] text-white px-[26px] py-[14px] text-xl cursor-pointer transition-all
                               ${overlayFocus === 'watch' ? 'border-[6px] border-[#6F61EF]' : 'border-[6px] border-transparent'}`}
                  >
                    ▶ Assistir
                  </button>
                  <button
                    onClick={toggleFavorite}
                    className={`flex-[0_0_200px] text-center bg-white/[0.08] rounded-[14px] text-white px-[26px] py-[14px] text-xl cursor-pointer transition-all
                               ${overlayFocus === 'fav' ? 'border-[6px] border-[#6F61EF]' : 'border-[6px] border-transparent'}`}
                  >
                    {isFavorite() ? '💔 Remover' : '⭐ Favoritar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Cast Section */}
            {cast.length > 0 && (
              <div className="relative z-[3] w-full p-[60px] pt-[100px]">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[18px]">
                  {cast.map((actor: any) => (
                    <div key={actor.id} className="text-center text-white text-sm bg-black/55 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.6)]">
                      <img
                        src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : PLACEHOLDER_ACTOR}
                        alt={actor.name}
                        className="w-full rounded-lg object-cover h-[220px] bg-[#222]"
                      />
                      <div className="mt-[6px] font-bold text-[13px]">{actor.name}</div>
                      <div className="text-[#ccc] text-xs">{actor.character || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Player Overlay */}
          {playerActive && (
            <div className="fixed inset-0 bg-black/[0.96] flex items-center justify-center z-[150]">
              <div className="relative w-screen h-screen bg-black overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-contain bg-black" playsInline />
                
                {/* Pause Menu */}
                {pauseMenuVisible && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
                    <div className="flex gap-6 p-6 bg-[rgba(30,30,40,0.75)] border-2 border-[rgba(111,97,239,0.7)] rounded-[18px] shadow-[0_0_25px_rgba(111,97,239,0.25)]">
                      <button
                        onClick={() => {
                          setPauseMenuVisible(false);
                          videoRef.current?.play().catch(() => {});
                        }}
                        className={`min-w-[260px] text-center bg-white/[0.08] rounded-[14px] text-white px-[26px] py-4 text-[26px] cursor-pointer transition-all
                                   ${pauseFocus === 'continue' ? 'border-[6px] border-[#6F61EF] scale-[1.02]' : 'border-[6px] border-transparent'}`}
                      >
                        ▶ Continuar
                      </button>
                      <button
                        onClick={closePlayer}
                        className={`min-w-[260px] text-center bg-white/[0.08] rounded-[14px] text-white px-[26px] py-4 text-[26px] cursor-pointer transition-all
                                   ${pauseFocus === 'close' ? 'border-[6px] border-[#6F61EF] scale-[1.02]' : 'border-[6px] border-transparent'}`}
                      >
                        ✕ Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Filmes;
