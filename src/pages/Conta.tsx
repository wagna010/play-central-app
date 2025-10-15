import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceStatus } from '@/hooks/useDeviceStatus';
import { toast } from 'sonner';
const Conta = () => {
  const navigate = useNavigate();
  const [deviceCode, setDeviceCode] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [url, setUrl] = useState('');
  const [port, setPort] = useState('8880');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const { checkPlayerStatus, checkIptvStatus, formatExpireDate } = useDeviceStatus();
  const searchCodeRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const portRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const renewButtonRef = useRef<HTMLButtonElement>(null);
  const inputs = [searchCodeRef, searchButtonRef, urlRef, portRef, usernameRef, passwordRef, saveButtonRef, clearButtonRef, renewButtonRef];
  useEffect(() => {
    // Carregar código do dispositivo
    const savedDeviceCode = localStorage.getItem('device_code');
    if (savedDeviceCode) {
      setDeviceCode(savedDeviceCode);
    }

    // Carregar configuração IPTV
    const savedConfig = localStorage.getItem('iptv_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      setUrl(config.url || '');
      setPort(config.port || '8880');
      setUsername(config.username || '');
      setPassword(config.password || '');
    }
    inputs[0].current?.focus();
  }, []);
  useEffect(() => {
    inputs[focusIndex].current?.focus();
  }, [focusIndex]);
  const validateCode = (code: string): boolean => {
    const regex = /^[A-Za-z]{2}\d{8}$/;
    return regex.test(code);
  };
  const handleCodeSearch = async () => {
    if (!validateCode(searchCode)) {
      toast.error('Código inválido. Use formato: AB12345678');
      return;
    }
    
    setIsSearching(true);
    setMessage('🔍 Buscando configuração...');
    
    try {
      const { data, error } = await supabase.rpc('get_device_by_code', {
        p_code: searchCode
      });

      if (error) {
        console.error('Erro ao buscar:', error);
        toast.error('Erro ao buscar configuração');
        setMessage('❌ Erro ao buscar configuração');
        return;
      }

      if (!data || data.length === 0) {
        toast.error('Código não encontrado');
        setMessage('❌ Código não encontrado. Verifique e tente novamente.');
        return;
      }

      const deviceData = data[0];

      // Aplicar configuração encontrada
      const config = {
        url: deviceData.iptv_url,
        port: deviceData.iptv_port,
        username: deviceData.iptv_username,
        password: deviceData.iptv_password
      };

      localStorage.setItem('iptv_config', JSON.stringify(config));
      localStorage.setItem('player_expire_at', deviceData.player_expire_at);
      localStorage.setItem('iptv_expire_at', deviceData.iptv_expire_at);

      setUrl(deviceData.iptv_url);
      setPort(deviceData.iptv_port);
      setUsername(deviceData.iptv_username);
      setPassword(deviceData.iptv_password);

      toast.success('Configuração aplicada com sucesso!');
      setMessage('✅ Configuração aplicada! Redirecionando...');
      
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao buscar configuração');
      setMessage('❌ Erro inesperado. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };
  const handleSaveManual = async () => {
    if (!url || !username || !password) {
      setMessage('❌ Preencha URL, Usuário e Senha');
      return;
    }
    const config = {
      url,
      port,
      username,
      password
    };
    localStorage.setItem('iptv_config', JSON.stringify(config));
    localStorage.removeItem('user_info');
    localStorage.removeItem('server_info');
    localStorage.removeItem('tv_categories');
    localStorage.removeItem('tv_streams');
    localStorage.removeItem('vod_categories');
    localStorage.removeItem('vod_streams');
    toast.success('Configuração salva com sucesso!');
    setMessage('✅ Configuração salva! Redirecionando...');
    setTimeout(() => navigate('/'), 1500);
  };
  const handleClearConfig = () => {
    localStorage.removeItem('iptv_config');
    localStorage.removeItem('user_info');
    localStorage.removeItem('server_info');
    localStorage.removeItem('tv_categories');
    localStorage.removeItem('tv_streams');
    localStorage.removeItem('vod_categories');
    localStorage.removeItem('vod_streams');
    setUrl('');
    setPort('8880');
    setUsername('');
    setPassword('');
    setSearchCode('');
    toast.info('Configuração removida');
    setMessage('🔄 Configuração removida. Voltando...');
    setTimeout(() => navigate('/'), 1500);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((focusIndex + 1) % inputs.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((focusIndex - 1 + inputs.length) % inputs.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIndex === 1) handleCodeSearch();
      else if (focusIndex === 6) handleSaveManual();
      else if (focusIndex === 7) handleClearConfig();
      else if (focusIndex === 8) navigate('/');
    } else if (e.key === 'Escape') {
      navigate('/');
    }
  };
  const playerStatus = checkPlayerStatus();
  const iptvStatus = checkIptvStatus();

  return <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-start" style={{
    backgroundImage: 'url(https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/irov4jo6yrx9/background.jpg)'
  }} onKeyDown={handleKeyDown}>
      
      <div className="bg-black/65 p-10 rounded-[20px] w-[600px] mt-[60px] flex flex-col items-center">
        <h1 className="mb-6 text-[28px] text-center text-white">⚙️ Gerenciamento de Dispositivo</h1>
        
        {/* Código do Dispositivo */}
        {deviceCode && (
          <div className="w-full mb-6 pb-6 border-b border-white/20">
            <label className="block text-white mb-2 text-sm font-semibold">📱 Código do Dispositivo</label>
            <div className="w-full p-4 bg-white/10 rounded-lg text-center">
              <span className="text-2xl font-mono tracking-widest text-white">{deviceCode}</span>
            </div>
          </div>
        )}

        {/* Status do Player e IPTV */}
        <div className="w-full mb-6 pb-6 border-b border-white/20">
          <div className="mb-4">
            <label className="block text-white mb-2 text-sm font-semibold">🎮 Status do Player</label>
            <div className={`p-3 rounded-lg ${playerStatus.isExpired ? 'bg-red-500/20 border border-red-500' : 'bg-green-500/20 border border-green-500'}`}>
              <span className={playerStatus.isExpired ? 'text-red-300' : 'text-green-300'}>
                {playerStatus.isExpired 
                  ? `❌ Player Vencido desde ${formatExpireDate(playerStatus.expireAt)}`
                  : `✅ Ativo até ${formatExpireDate(playerStatus.expireAt)} (${playerStatus.daysLeft} dias)`
                }
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-white mb-2 text-sm font-semibold">📺 Vencimento IPTV</label>
            <div className={`p-3 rounded-lg ${iptvStatus.isExpired ? 'bg-red-500/20 border border-red-500' : 'bg-blue-500/20 border border-blue-500'}`}>
              <span className={iptvStatus.isExpired ? 'text-red-300' : 'text-blue-300'}>
                {iptvStatus.isExpired 
                  ? `❌ IPTV Vencido desde ${formatExpireDate(iptvStatus.expireAt)}`
                  : `⏰ ${formatExpireDate(iptvStatus.expireAt)}`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Renovar Player */}
        <div className="w-full mb-6 pb-6 border-b border-white/20">
          <label className="block text-white mb-2 text-sm font-semibold">💳 Renovar Player</label>
          <button 
            ref={renewButtonRef}
            className="w-full py-[14px] text-lg border-0 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white cursor-not-allowed opacity-50 focus:outline-white focus:outline-[3px]"
            disabled
          >
            💰 Renovar com PIX - Em Breve
          </button>
        </div>

        {/* Buscar Configuração Remota */}
        <div className="w-full mb-6 pb-6 border-b border-white/20">
          <label className="block text-white mb-2 text-sm font-semibold">🔑 Buscar Configuração Remota</label>
          <input 
            ref={searchCodeRef} 
            type="text" 
            value={searchCode} 
            onChange={e => setSearchCode(e.target.value.toUpperCase())} 
            placeholder="AB12345678" 
            maxLength={10} 
            className="w-full p-3 mb-3 border-0 rounded-lg text-base outline-none focus:outline-[#6F61EF] focus:outline-2 uppercase font-mono tracking-wider" 
          />
          <button 
            ref={searchButtonRef} 
            onClick={handleCodeSearch} 
            disabled={isSearching} 
            className="w-full py-[14px] text-lg border-0 rounded-lg bg-[#6F61EF] text-white cursor-pointer transition-all hover:bg-[#5848d9] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-white focus:outline-[3px]"
          >
            {isSearching ? '🔍 Buscando...' : '🔍 Buscar Configuração'}
          </button>
        </div>

        <div className="w-full text-center text-white/50 mb-6 text-sm">
          ─── ou configure manualmente ───
        </div>

        <div className="w-full flex gap-3 mb-4">
          <input ref={urlRef} type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (ex: qetu.cc)" className="flex-1 p-3 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2" />
          <input ref={portRef} type="text" value={port} onChange={e => setPort(e.target.value)} placeholder="Porta" className="w-[100px] p-3 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2" />
        </div>
        
        <input ref={usernameRef} type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Usuário" className="w-full p-3 mb-4 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2" />
        
        <input ref={passwordRef} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" className="w-full p-3 mb-4 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2" />
        
        <button ref={saveButtonRef} onClick={handleSaveManual} className="w-full py-[14px] text-lg border-0 rounded-lg bg-[#00adee] text-white cursor-pointer transition-all hover:bg-[#0095cc] mb-3 focus:outline-white focus:outline-[3px]">
          💾 Salvar Configuração
        </button>

        <button ref={clearButtonRef} onClick={handleClearConfig} className="w-full py-[14px] text-lg border-0 rounded-lg bg-red-600 text-white cursor-pointer transition-all hover:bg-red-700 mb-3 focus:outline-white focus:outline-[3px]">
          🔄 Limpar Configuração
        </button>

        <button onClick={() => navigate('/')} className="w-full py-[14px] text-lg border-0 rounded-lg bg-gray-600 text-white cursor-pointer transition-all hover:bg-gray-700 focus:outline-white focus:outline-[3px]">
          ← Voltar ao Menu
        </button>
        
        {message && <div className="mt-4 text-center text-sm bg-white/10 px-4 py-2 rounded-lg">
            <span className={message.includes('❌') ? 'text-red-400' : message.includes('✅') ? 'text-green-400' : 'text-white'}>
              {message}
            </span>
          </div>}
      </div>

      <div className="mt-6 text-white/50 text-xs text-center max-w-[600px]">
        💡 Use o código do dispositivo no painel administrativo para gerenciar remotamente.<br />
        Renovação via PIX será disponibilizada em breve.
      </div>
    </div>;
};
export default Conta;