import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);

  const urlRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const inputs = [urlRef, usernameRef, passwordRef, buttonRef];

  useEffect(() => {
    // Login automático se user_info já estiver salvo
    try {
      const savedInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      if (savedInfo && savedInfo.auth == 1) {
        navigate('/home');
      } else {
        inputs[0].current?.focus();
      }
    } catch {
      inputs[0].current?.focus();
    }
  }, []);

  useEffect(() => {
    inputs[focusIndex].current?.focus();
  }, [focusIndex]);

  const handleConnect = async () => {
    if (!url || !username || !password) {
      setMessage('Preencha todos os campos');
      return;
    }

    setMessage('Conectando...');

    try {
      const apiUrl = `http://${url}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data && data.user_info && data.user_info.auth == 1) {
        // Salvar apenas user_info - usar iptv_config como fonte única
        localStorage.setItem('user_info', JSON.stringify(data.user_info));
        // server_info removido - usar iptv_config
        navigate('/home');
      } else {
        setMessage('Usuário ou senha inválidos.');
      }
    } catch (err) {
      setMessage('Erro ao conectar ao servidor.');
      console.error(err);
    }
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
      if (focusIndex === 3) {
        handleConnect();
      }
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-start"
         style={{ backgroundImage: 'url(https://storage.googleapis.com/flutterflow-io-6f20.appspot.com/projects/smart-play-v4-j4pg65/assets/irov4jo6yrx9/background.jpg)' }}
         onKeyDown={handleKeyDown}>
      <div className="bg-black/65 p-10 rounded-[20px] w-[400px] mt-[100px] flex flex-col items-center">
        <h1 className="mb-8 text-[28px] text-center text-white">Smart Play</h1>
        
        <input
          ref={urlRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL do Servidor (ex: exemplo.com:8880)"
          className="w-full p-3 mb-5 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2"
        />
        
        <input
          ref={usernameRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário"
          className="w-full p-3 mb-5 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2"
        />
        
        <input
          ref={passwordRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          className="w-full p-3 mb-5 border-0 rounded-lg text-base outline-none focus:outline-[#00adee] focus:outline-2"
        />
        
        <button
          ref={buttonRef}
          onClick={handleConnect}
          className="w-full py-[14px] text-lg border-0 rounded-lg bg-[#00adee] text-white cursor-pointer transition-all hover:bg-[#0095cc] focus:outline-white focus:outline-[3px]"
        >
          Conectar
        </button>
        
        {message && (
          <div className="mt-4 text-[#ff8080] text-sm">
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
