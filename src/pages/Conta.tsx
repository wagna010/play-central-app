import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
const Conta = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [url, setUrl] = useState('');
  const [port, setPort] = useState('8880');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const portRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const inputs = [codeRef, searchButtonRef, urlRef, portRef, usernameRef, passwordRef, saveButtonRef, clearButtonRef, backButtonRef];
  useEffect(() => {
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
    if (!validateCode(code)) {
      setMessage('❌ Código inválido. Use formato: AB12345678');
      return;
    }
    setIsSearching(true);
    setMessage('🔍 Buscando configuração...');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMessage('❌ API Xano ainda não configurada. Use configuração manual.');
    } catch (error) {
      setMessage('❌ Código não encontrado. Configure manualmente abaixo.');
      console.error(error);
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
    setMessage('✅ Configuração salva! Redirecionando...');
    setTimeout(() => navigate('/home'), 1500);
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
    setCode('');
    setMessage('🔄 Configuração removida. Voltando ao Demo...');
    setTimeout(() => navigate('/home'), 1500);
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
      if (focusIndex === 1) handleCodeSearch();else if (focusIndex === 6) handleSaveManual();else if (focusIndex === 7) handleClearConfig();else if (focusIndex === 8) navigate('/home');
    } else if (e.key === 'Escape') {
      navigate('/home');
    }
  };
  return <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-start" style={{
    backgroundImage: 'url(https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/irov4jo6yrx9/background.jpg)'
  }} onKeyDown={handleKeyDown}>
      
      

      <div className="bg-black/65 p-10 rounded-[20px] w-[550px] mt-[80px] flex flex-col items-center">
        <h1 className="mb-8 text-[28px] text-center text-white">⚙️ Configuração</h1>
        
        <div className="w-full mb-6 pb-6 border-b border-white/20">
          <label className="block text-white mb-2 text-sm font-semibold">🔑 Código de Configuração Remota</label>
          <input ref={codeRef} type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="AB12345678" maxLength={10} className="w-full p-3 mb-3 border-0 rounded-lg text-base outline-none focus:outline-[#6F61EF] focus:outline-2 uppercase font-mono tracking-wider" />
          <button ref={searchButtonRef} onClick={handleCodeSearch} disabled={isSearching} className="w-full py-[14px] text-lg border-0 rounded-lg bg-[#6F61EF] text-white cursor-pointer transition-all hover:bg-[#5848d9] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-white focus:outline-[3px]">
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

        <button ref={clearButtonRef} onClick={handleClearConfig} className="w-full py-[14px] text-lg border-0 rounded-lg bg-red-600 text-white cursor-pointer transition-all hover:bg-red-700 focus:outline-white focus:outline-[3px]">
          🔄 Voltar ao Modo Demo
        </button>
        
        {message && <div className="mt-4 text-center text-sm bg-white/10 px-4 py-2 rounded-lg">
            <span className={message.includes('❌') ? 'text-red-400' : message.includes('✅') ? 'text-green-400' : 'text-white'}>
              {message}
            </span>
          </div>}
      </div>

      <div className="mt-6 text-white/50 text-xs text-center max-w-[550px]">
        💡 Modo Demo ativo com credenciais padrão.<br />
        API Xano será integrada em breve para configuração remota.
      </div>
    </div>;
};
export default Conta;