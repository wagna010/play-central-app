import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [focusIndex, setFocusIndex] = useState(1);
  const [inTopBar, setInTopBar] = useState(false);
  const [expDate, setExpDate] = useState('Vencimento: --/--/---- --:--');
  const [userStatus, setUserStatus] = useState('Conectado: --');

  const icons = {
    tv: {
      on: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/efwu90pb8yb7/tvon.png',
      off: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/ug1yvwr34xif/tvoff.png'
    },
    filmes: {
      on: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/j7nqtl0jtjsr/filmeson.png',
      off: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/sm2otdp54spe/filmesoff.png'
    },
    series: {
      on: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/204a37pnben5/serieson.png',
      off: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/0u4nq13o9jz9/seriesoff.png'
    },
    conta: {
      on: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/wocttqlz9nvt/contaon.png',
      off: 'https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/s7ybeprc6emy/contaoff.png'
    }
  };

  const validarLogin = () => {
    const user_info = JSON.parse(localStorage.getItem('user_info') || '{}');
    const server_info = JSON.parse(localStorage.getItem('server_info') || '{}');
    if (!user_info.username || !user_info.password || !server_info.url) {
      navigate('/');
    }
  };

  const atualizarDadosConta = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user_info') || '{}');
      const server = JSON.parse(localStorage.getItem('server_info') || '{}');
      if (!user.username || !server.url) return;
      
      const apiUrl = `http://${server.url}:${server.port}/player_api.php?username=${user.username}&password=${user.password}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data?.user_info?.auth == 1) {
        localStorage.setItem('user_info', JSON.stringify(data.user_info));
        localStorage.setItem('server_info', JSON.stringify(data.server_info));
        
        const exp = new Date(parseInt(data.user_info.exp_date) * 1000);
        const dia = exp.getDate().toString().padStart(2, '0');
        const mes = (exp.getMonth() + 1).toString().padStart(2, '0');
        const ano = exp.getFullYear();
        const hora = exp.getHours().toString().padStart(2, '0');
        const min = exp.getMinutes().toString().padStart(2, '0');
        
        setExpDate(`Vencimento: ${dia}/${mes}/${ano} ${hora}:${min}`);
        setUserStatus(`Conectado: ${data.user_info.username}`);
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
    }
  };

  const atualizarListasFilmes = async (force = false) => {
    const agora = Date.now();
    const ultimo = parseInt(localStorage.getItem('vod_last_update') || '0');
    const umDia = 86400000;
    
    if (!force && agora - ultimo < umDia && localStorage.getItem('vod_categories')) return;
    
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const server = JSON.parse(localStorage.getItem('server_info') || '{}');
    const base = `http://${server.url}:${server.port}/player_api.php?username=${user.username}&password=${user.password}`;
    
    const [cat, str] = await Promise.all([
      fetch(`${base}&action=get_vod_categories`),
      fetch(`${base}&action=get_vod_streams`)
    ]);
    
    localStorage.setItem('vod_categories', JSON.stringify(await cat.json()));
    localStorage.setItem('vod_streams', JSON.stringify(await str.json()));
    localStorage.setItem('vod_last_update', agora.toString());
  };

  const atualizarListasTV = async (force = false) => {
    const agora = Date.now();
    const ultimo = parseInt(localStorage.getItem('tv_last_update') || '0');
    const umDia = 86400000;
    
    if (!force && agora - ultimo < umDia && localStorage.getItem('tv_categories')) return;
    
    const user = JSON.parse(localStorage.getItem('user_info') || '{}');
    const server = JSON.parse(localStorage.getItem('server_info') || '{}');
    const base = `http://${server.url}:${server.port}/player_api.php?username=${user.username}&password=${user.password}`;
    
    const [cat, str] = await Promise.all([
      fetch(`${base}&action=get_live_categories`),
      fetch(`${base}&action=get_live_streams`)
    ]);
    
    localStorage.setItem('tv_categories', JSON.stringify(await cat.json()));
    localStorage.setItem('tv_streams', JSON.stringify(await str.json()));
    localStorage.setItem('tv_last_update', agora.toString());
  };

  const handleMenuClick = async (type: string) => {
    if (type === 'tv') {
      await atualizarListasTV();
      navigate('/tv');
    } else if (type === 'filmes') {
      await atualizarListasFilmes();
      navigate('/filmes');
    }
    // Outras navegações aqui (Séries, Conta)
  };

  const handleUpdateClick = () => {
    localStorage.removeItem('tv_last_update');
    localStorage.removeItem('vod_last_update');
    localStorage.removeItem('series_last_update');
    alert('Listas liberadas para nova atualização!');
  };

  useEffect(() => {
    validarLogin();
    atualizarDadosConta();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && !inTopBar) {
        setFocusIndex((focusIndex + 1) % 4);
      } else if (e.key === 'ArrowLeft' && !inTopBar) {
        setFocusIndex((focusIndex - 1 + 4) % 4);
      } else if (e.key === 'ArrowUp') {
        setInTopBar(true);
      } else if (e.key === 'ArrowDown') {
        setInTopBar(false);
      } else if (e.key === 'Enter') {
        if (inTopBar) {
          handleUpdateClick();
          return;
        }
        const types = ['tv', 'filmes', 'series', 'conta'];
        handleMenuClick(types[focusIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusIndex, inTopBar]);

  const getIcon = (type: string, index: number) => {
    return focusIndex === index && !inTopBar ? icons[type as keyof typeof icons].on : icons[type as keyof typeof icons].off;
  };

  return (
    <div className="relative h-screen bg-black bg-cover bg-center bg-no-repeat overflow-hidden text-white"
         style={{ backgroundImage: 'url(https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/irov4jo6yrx9/background.jpg)' }}>
      
      {/* Ícone de atualizar */}
      <div className="absolute top-4 right-12 flex justify-end items-center z-[3]">
        <button
          onClick={handleUpdateClick}
          className={`bg-black/50 rounded-full w-[60px] h-[60px] flex items-center justify-center cursor-pointer transition-all ${
            inTopBar ? 'border-4 border-[#6F61EF]' : 'border-4 border-transparent'
          }`}
          title="Liberar atualização"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`w-9 h-9 fill-white transition-transform ${inTopBar ? 'rotate-90' : ''}`}>
            <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 .34-.03.67-.08 1h2.02c.04-.33.06-.66.06-1 0-3.87-3.13-7-7-7zm-5 5c0-.34.03-.67.08-1H5.06c-.04.33-.06.66-.06 1 0 3.87 3.13 7 7 7v3l4-4-4-4v3c-2.76 0-5-2.24-5-5z"/>
          </svg>
        </button>
      </div>

      {/* Menu principal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center gap-4 p-8 w-[calc(100%-64px)]">
        {['tv', 'filmes', 'series', 'conta'].map((type, index) => (
          <div
            key={type}
            onClick={() => handleMenuClick(type)}
            className="flex flex-col items-center cursor-pointer transition-all"
          >
            <img
              src={getIcon(type, index)}
              alt={type}
              className={`h-[70vh] w-auto transition-all ${
                focusIndex === index && !inTopBar ? 'scale-[1.12] brightness-[1.2]' : ''
              } hover:brightness-[1.15]`}
            />
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div className="absolute left-0 right-0 bottom-8 flex justify-between items-center px-12 text-2xl tracking-wide z-[2] pointer-events-none">
        <div>{expDate}</div>
        <div>{userStatus}</div>
      </div>
    </div>
  );
};

export default Home;
