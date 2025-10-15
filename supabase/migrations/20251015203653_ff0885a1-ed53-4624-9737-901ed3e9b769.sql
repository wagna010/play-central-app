-- 1. Remover funções antigas primeiro
DROP FUNCTION IF EXISTS public.generate_device_code();
DROP FUNCTION IF EXISTS public.register_or_update_device(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.get_device_by_code(text);

-- 2. Criar função register_or_update_device com nova assinatura
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_account_exists BOOLEAN;
  v_new_username TEXT;
  v_new_password TEXT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.devices WHERE code = UPPER(p_code)) INTO v_account_exists;
  
  IF v_account_exists THEN
    UPDATE public.devices 
    SET 
      device_uuid = p_device_uuid,
      device_model = COALESCE(p_device_model, device_model),
      device_os = COALESCE(p_device_os, device_os),
      user_agent = COALESCE(p_user_agent, user_agent),
      last_access_at = NOW()
    WHERE code = UPPER(p_code);
    
    RETURN QUERY
    SELECT d.code, d.player_expire_at, d.iptv_expire_at, d.is_blocked, 
           d.iptv_url, d.iptv_username, d.iptv_password, FALSE as is_new_account
    FROM public.devices d WHERE d.code = UPPER(p_code);
  ELSE
    v_new_username := LOWER(p_code);
    v_new_password := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
    
    INSERT INTO public.devices (
      code, device_uuid, device_model, device_os, user_agent, iptv_url,
      iptv_username, iptv_password, player_expire_at, iptv_expire_at,
      created_at, last_access_at, is_blocked
    ) VALUES (
      UPPER(p_code), p_device_uuid, p_device_model, p_device_os, p_user_agent,
      'qetu.cc:8880', v_new_username, v_new_password,
      NOW() + INTERVAL '7 days', NOW() + INTERVAL '30 days',
      NOW(), NOW(), FALSE
    );
    
    RETURN QUERY
    SELECT UPPER(p_code), (NOW() + INTERVAL '7 days')::timestamptz, 
           (NOW() + INTERVAL '30 days')::timestamptz, FALSE,
           'qetu.cc:8880'::text, v_new_username, v_new_password, TRUE;
  END IF;
END;
$$;

-- 3. Criar nova função get_device_by_code
CREATE OR REPLACE FUNCTION public.get_device_by_code(p_code TEXT)
RETURNS TABLE (
  device_uuid TEXT,
  iptv_url TEXT,
  iptv_username TEXT,
  iptv_password TEXT,
  player_expire_at TIMESTAMP WITH TIME ZONE,
  iptv_expire_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT d.device_uuid, d.iptv_url, d.iptv_username, d.iptv_password,
         d.player_expire_at, d.iptv_expire_at, d.is_blocked
  FROM public.devices d WHERE d.code = UPPER(p_code);
END;
$$;