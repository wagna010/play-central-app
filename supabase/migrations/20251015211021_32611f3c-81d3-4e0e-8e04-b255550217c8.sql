-- Remove campos desnecessários da tabela devices
ALTER TABLE public.devices 
DROP COLUMN IF EXISTS device_os,
DROP COLUMN IF EXISTS device_uuid;

-- Atualiza a função register_or_update_device para não gerar credenciais automaticamente
DROP FUNCTION IF EXISTS public.register_or_update_device(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.register_or_update_device(
  p_code text,
  p_device_model text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE(
  device_code text,
  player_expire_at timestamp with time zone,
  iptv_expire_at timestamp with time zone,
  is_blocked boolean,
  iptv_url text,
  iptv_username text,
  iptv_password text,
  is_new_account boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.devices WHERE code = UPPER(p_code)) INTO v_account_exists;
  
  IF v_account_exists THEN
    -- Apenas atualiza informações do dispositivo
    UPDATE public.devices 
    SET 
      device_model = COALESCE(p_device_model, device_model),
      user_agent = COALESCE(p_user_agent, user_agent),
      last_access_at = NOW()
    WHERE code = UPPER(p_code);
    
    RETURN QUERY
    SELECT d.code, d.player_expire_at, d.iptv_expire_at, d.is_blocked, 
           d.iptv_url, d.iptv_username, d.iptv_password, FALSE as is_new_account
    FROM public.devices d WHERE d.code = UPPER(p_code);
  ELSE
    -- Cria nova conta sem credenciais (serão alimentadas manualmente no banco)
    INSERT INTO public.devices (
      code, device_model, user_agent, player_expire_at, iptv_expire_at,
      created_at, last_access_at, is_blocked
    ) VALUES (
      UPPER(p_code), p_device_model, p_user_agent,
      NOW() + INTERVAL '7 days', NOW() + INTERVAL '30 days',
      NOW(), NOW(), FALSE
    );
    
    RETURN QUERY
    SELECT UPPER(p_code), (NOW() + INTERVAL '7 days')::timestamptz, 
           (NOW() + INTERVAL '30 days')::timestamptz, FALSE,
           NULL::text, NULL::text, NULL::text, TRUE;
  END IF;
END;
$$;

-- Atualiza a função get_device_by_code
DROP FUNCTION IF EXISTS public.get_device_by_code(text);

CREATE OR REPLACE FUNCTION public.get_device_by_code(p_code text)
RETURNS TABLE(
  iptv_url text,
  iptv_username text,
  iptv_password text,
  player_expire_at timestamp with time zone,
  iptv_expire_at timestamp with time zone,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT d.iptv_url, d.iptv_username, d.iptv_password,
         d.player_expire_at, d.iptv_expire_at, d.is_blocked
  FROM public.devices d WHERE d.code = UPPER(p_code);
END;
$$;