-- 1. Combinar iptv_url e iptv_port em um único campo
-- Atualizar registros existentes primeiro antes de remover coluna
UPDATE public.devices 
SET iptv_url = CASE 
  WHEN iptv_url IS NOT NULL AND iptv_port IS NOT NULL 
  THEN iptv_url || ':' || iptv_port
  WHEN iptv_url IS NOT NULL 
  THEN iptv_url || ':8880'
  ELSE 'qetu.cc:8880'
END;

-- 2. Remover campo iptv_port
ALTER TABLE public.devices 
DROP COLUMN IF EXISTS iptv_port;

-- 3. Remover valores default de credenciais (cada código terá credenciais únicas)
ALTER TABLE public.devices 
  ALTER COLUMN iptv_url DROP DEFAULT,
  ALTER COLUMN iptv_username DROP DEFAULT,
  ALTER COLUMN iptv_password DROP DEFAULT;

-- 4. Remover funções antigas antes de recriar
DROP FUNCTION IF EXISTS public.generate_device_code();
DROP FUNCTION IF EXISTS public.get_device_by_code(text);
DROP FUNCTION IF EXISTS public.register_or_update_device(text, text, text, text);

-- 5. Reescrever função register_or_update_device
CREATE OR REPLACE FUNCTION public.register_or_update_device(
  p_code TEXT,
  p_device_uuid TEXT,
  p_device_model TEXT DEFAULT NULL,
  p_device_os TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  device_code TEXT,
  player_expire_at TIMESTAMP WITH TIME ZONE,
  iptv_expire_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN,
  iptv_url TEXT,
  iptv_username TEXT,
  iptv_password TEXT,
  is_new_account BOOLEAN
) AS $$
DECLARE
  v_account_exists BOOLEAN;
  v_old_device_uuid TEXT;
  v_new_username TEXT;
  v_new_password TEXT;
BEGIN
  -- Verificar se código já existe
  SELECT EXISTS(
    SELECT 1 FROM public.devices WHERE code = UPPER(p_code)
  ) INTO v_account_exists;
  
  IF v_account_exists THEN
    -- CONTA EXISTE - Recuperação de conta
    SELECT device_uuid INTO v_old_device_uuid
    FROM public.devices 
    WHERE code = UPPER(p_code);
    
    -- Atualizar device_uuid para o novo dispositivo (bloqueia o anterior automaticamente)
    UPDATE public.devices 
    SET 
      device_uuid = p_device_uuid,
      device_model = COALESCE(p_device_model, device_model),
      device_os = COALESCE(p_device_os, device_os),
      user_agent = COALESCE(p_user_agent, user_agent),
      last_access_at = NOW()
    WHERE code = UPPER(p_code);
    
    -- Retornar dados da conta existente
    RETURN QUERY
    SELECT 
      d.code,
      d.player_expire_at,
      d.iptv_expire_at,
      d.is_blocked,
      d.iptv_url,
      d.iptv_username,
      d.iptv_password,
      FALSE as is_new_account
    FROM public.devices d
    WHERE d.code = UPPER(p_code);
    
  ELSE
    -- CONTA NÃO EXISTE - Criar nova conta
    
    -- Gerar credenciais IPTV únicas
    v_new_username := LOWER(p_code);
    v_new_password := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
    
    -- Inserir nova conta
    INSERT INTO public.devices (
      code,
      device_uuid,
      device_model,
      device_os,
      user_agent,
      iptv_url,
      iptv_username,
      iptv_password,
      player_expire_at,
      iptv_expire_at,
      created_at,
      last_access_at,
      is_blocked
    ) VALUES (
      UPPER(p_code),
      p_device_uuid,
      p_device_model,
      p_device_os,
      p_user_agent,
      'qetu.cc:8880',
      v_new_username,
      v_new_password,
      NOW() + INTERVAL '7 days',
      NOW() + INTERVAL '30 days',
      NOW(),
      NOW(),
      FALSE
    );
    
    -- Retornar dados da nova conta
    RETURN QUERY
    SELECT 
      UPPER(p_code) as device_code,
      NOW() + INTERVAL '7 days' as player_expire_at,
      NOW() + INTERVAL '30 days' as iptv_expire_at,
      FALSE as is_blocked,
      'qetu.cc:8880' as iptv_url,
      v_new_username,
      v_new_password,
      TRUE as is_new_account
    ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Criar nova função get_device_by_code
CREATE OR REPLACE FUNCTION public.get_device_by_code(p_code TEXT)
RETURNS TABLE (
  device_uuid TEXT,
  iptv_url TEXT,
  iptv_username TEXT,
  iptv_password TEXT,
  player_expire_at TIMESTAMP WITH TIME ZONE,
  iptv_expire_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.device_uuid,
    d.iptv_url,
    d.iptv_username,
    d.iptv_password,
    d.player_expire_at,
    d.iptv_expire_at,
    d.is_blocked
  FROM public.devices d
  WHERE d.code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;