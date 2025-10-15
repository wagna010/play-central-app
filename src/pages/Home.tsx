import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
import { generateDeviceCode } from '@/utils/codeGenerator';

const Home = () => {
  const navigate = useNavigate();
  const [focusIndex, setFocusIndex] = useState(1);
  const [inTopBar, setInTopBar] = useState(false);
  const [playerExpDate, setPlayerExpDate] = useState('Player: --/--/---- --:--');
  const [iptvExpDate, setIptvExpDate] = useState('IPTV: --/--/---- --:--');
  const [userStatus, setUserStatus] = useState('Iniciando...');
  const { checkPlayerStatus, formatExpireDate } = useDeviceStatus();

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

  const initializePlayer = async () => {
    let playerUuid = localStorage.getItem('player_uuid');
    let deviceCode = localStorage.getItem('device_code');
    
    // Gerar UUID se não existir
    if (!playerUuid) {
      playerUuid = crypto.randomUUID();
      localStorage.setItem('player_uuid', playerUuid);
      localStorage.setItem('player_first_access', new Date().toISOString());
    }
    
    // Gerar código se não existir
    if (!deviceCode) {
      deviceCode = generateDeviceCode();
    }
    
    localStorage.setItem('player_last_access', new Date().toISOString());

    // Registrar dispositivo com código gerado localmente
    try {
      const deviceModel = navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown';
      const deviceOs = navigator.platform || 'Unknown';
      
      const { data, error } = await supabase.rpc('register_or_update_device', {
        p_code: deviceCode,
        p_device_uuid: playerUuid,
        p_device_model: deviceModel,
        p_device_os: deviceOs,
        p_user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Erro ao registrar dispositivo:', error);
        setUserStatus('Erro no registro');
        return;
      }

      if (data && data.length > 0) {
        const deviceData = data[0];
        
        // Salvar código confirmado pelo servidor
        localStorage.setItem('device_code', deviceData.device_code);
        
        // Verificar se player está bloqueado ou vencido
        const playerExpired = new Date(deviceData.player_expire_at) < new Date();
        
        if (deviceData.is_blocked || playerExpired) {
          navigate('/conta');
          return;
        }
        
        // Salvar vencimentos
        localStorage.setItem('player_expire_at', deviceData.player_expire_at);
        localStorage.setItem('iptv_expire_at', deviceData.iptv_expire_at);
        
        // Atualizar UI com vencimentos
        const playerExp = new Date(deviceData.player_expire_at);
        const iptvExp = new Date(deviceData.iptv_expire_at);
        setPlayerExpDate(`Player: ${formatExpireDate(playerExp)}`);
        setIptvExpDate(`IPTV: ${formatExpireDate(iptvExp)}`);
        
        // Parse iptv_url que agora tem formato "url:port"
        const [iptvHost, iptvPort] = deviceData.iptv_url.split(':');
        const iptvConfig = {
          url: iptvHost,
          port: iptvPort || '8880',
          username: deviceData.iptv_username,
          password: deviceData.iptv_password
        };
        localStorage.setItem('iptv_config', JSON.stringify(iptvConfig));
        
        // Mostrar mensagem
        if (deviceData.is_new_account) {
          setUserStatus(`✨ Nova conta: ${deviceData.device_code}`);
        } else {
          const playerStatus = checkPlayerStatus();
          if (playerStatus.daysLeft <= 3 && playerStatus.daysLeft > 0) {
            setUserStatus(`⚠️ Player expira em ${playerStatus.daysLeft} dias`);
          } else {
            setUserStatus(`Código: ${deviceData.device_code}`);
          }
        }
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
      setUserStatus('Modo Offline');
    }
  };

  const loadIPTVCredentials = () => {
    const savedConfig = localStorage.getItem('iptv_config');
    
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
    return null;
  };

  const atualizarDadosConta = async () => {
    try {
      const config = loadIPTVCredentials();
      
      if (!config) {
        console.warn('Sem configuração IPTV');
        return;
      }
      
      const apiUrl = `http://${config.url}:${config.port}/player_api.php?username=${config.username}&password=${config.password}`;
      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data?.user_info?.auth == 1) {
        localStorage.setItem('user_info', JSON.stringify(data.user_info));
        localStorage.setItem('server_info', JSON.stringify({
          url: config.url,
          port: config.port
        }));
        
        const exp = new Date(parseInt(data.user_info.exp_date) * 1000);
        localStorage.setItem('iptv_expire_at', exp.toISOString());
        setIptvExpDate(`IPTV: ${formatExpireDate(exp)}`);
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
    
    const config = loadIPTVCredentials();
    if (!config) return;
    
    const base = `http://${config.url}:${config.port}/player_api.php?username=${config.username}&password=${config.password}`;
    
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
    
    const config = loadIPTVCredentials();
    if (!config) return;
    
    const base = `http://${config.url}:${config.port}/player_api.php?username=${config.username}&password=${config.password}`;
    
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
    } else if (type === 'conta') {
      navigate('/conta');
    }
  };

  const handleUpdateClick = () => {
    localStorage.removeItem('tv_last_update');
    localStorage.removeItem('vod_last_update');
    localStorage.removeItem('series_last_update');
    alert('Listas liberadas para nova atualização!');
  };

  useEffect(() => {
    initializePlayer();
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
      <div className="absolute left-0 right-0 bottom-8 flex justify-between items-center px-12 text-xl tracking-wide z-[2] pointer-events-none">
        <div className="flex flex-col gap-1">
          <div>{playerExpDate}</div>
          <div>{iptvExpDate}</div>
        </div>
        <div>{userStatus}</div>
      </div>
    </div>
  );
};

export default Home;
